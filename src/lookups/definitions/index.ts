import { LookupError, notFoundError } from '../../core/errors';
import { noteBaseName } from '../../core/notes';
import type { DictionaryNotesSettings } from '../../settings';
import type { SearchMode } from '../../ui/search-modal';
import type { LookupType } from '../lookup-type';
import { chooseSense, Sense } from '../senses';
import { languageName } from './languages';
import { lookupWithBackup, lookupWord, LookupResult } from './sources';
import { freeDictionary } from './sources/free-dictionary';
import { spanishSuggestions, wikcionario } from './sources/wikcionario';
import { wiktionary } from './sources/wiktionary';
import { buildVariables, DEFAULT_TEMPLATE, SPANISH_TEMPLATE } from './template';
import { DictionarySource, WordEntry } from './types';

/**
 * main: the Language setting with the chosen source, exactly as in 1.1.
 * es: a Spanish word, defined in Spanish (Wikcionario).
 * es-en: a Spanish word, explained in English (Free Dictionary API / Wiktionary).
 */
export type DefinitionMode = 'main' | 'es' | 'es-en';

export type DefinitionsFound = LookupResult & { mode: DefinitionMode };
export type DefinitionItem = WordEntry & { mode: DefinitionMode };

const SPANISH: SearchMode = { id: 'es', label: 'Español', placeholder: 'Escribe una palabra' };
const SPANISH_IN_ENGLISH: SearchMode = { id: 'es-en', label: 'Spanish → English', placeholder: 'Type a Spanish word' };

/** Definitions: look up a word, pick one of its definitions. */
export const definitions: LookupType<DefinitionsFound, DefinitionItem, Sense> = {
	id: 'definitions',
	// The original 1.0 command ID, kept so existing hotkeys keep working.
	commandId: 'create-word-note',
	commandName: 'Create new definition note',
	heading: 'Definitions',
	noun: 'definition',
	menuTitle: 'Definition',
	icon: 'book-open',
	search: {
		title: 'Look up a word',
		placeholder: 'Type a word',
		emptyMessage: 'Type a word to look up.',
	},
	settingKeys: { folder: 'folder', templateFile: 'templateFile' },
	searchModeKey: 'definitionSearchMode',
	defaultTemplate: DEFAULT_TEMPLATE,
	templateCopyPath: 'Templates/Definition note.md',

	searchModes(settings) {
		if (!settings.spanishEnabled) return undefined;
		// With Spanish as the main language, the main button already is "Spanish → English".
		if (settings.language === 'es') return [{ ...SPANISH_IN_ENGLISH, id: 'main' }, SPANISH];
		return [
			{ id: 'main', label: languageName(settings.language), placeholder: 'Type a word' },
			SPANISH,
			SPANISH_IN_ENGLISH,
		];
	},

	async find(word, plugin, mode) {
		if (mode === 'es') return { ...(await withSuggestions(word, lookupInSpanish(word, plugin.settings))), mode };
		if (mode === 'es-en') {
			return { ...(await withSuggestions(word, lookupSpanishInEnglish(word, plugin.settings))), mode };
		}
		const { settings } = plugin;
		const result = await lookupWord(
			word,
			settings.source,
			{ language: settings.language, apiKey: plugin.getApiKey() },
			settings.useFallback,
		);
		return { ...result, mode: 'main' };
	},
	// "corrí" is a form of "correr": offer the base word before creating a note.
	review({ entry }) {
		const base = entry.senses[0]?.baseWord;
		if (!base || base.toLowerCase() === entry.word.toLowerCase()) return undefined;
		return {
			message: `"${entry.word}" is a form of "${base}".`,
			alternatives: [base],
			keepLabel: `Use "${entry.word}"`,
		};
	},
	notice({ entry, fallback }) {
		return fallback
			? `${fallback.error.message}\nShowing results from ${entry.source.name} instead.`
			: undefined;
	},
	chooseItem: (_app, found) => Promise.resolve({ ...found.entry, mode: found.mode }),
	noteName: (entry) => noteBaseName(entry.word, 'Untitled word'),
	displayName: (entry) => entry.word,
	chooseDetail(app, entry) {
		if (entry.senses.length > 1) return chooseSense(app, entry.word, entry.senses, 'definition');
		return Promise.resolve(entry.senses[0] ?? null);
	},
	variables: buildVariables,

	// The folder follows the word's language; the template follows the language
	// the definitions are written in.
	target(entry, settings) {
		const inSpanish = entry.explainedIn === 'es';
		return {
			folder: entry.mode === 'main' ? settings.folder : settings.spanishFolder,
			templateFile: inSpanish ? settings.spanishTemplateFile : settings.templateFile,
			builtInTemplate: inSpanish ? SPANISH_TEMPLATE : DEFAULT_TEMPLATE,
		};
	},
};

/** The source for Spanish words explained in English: the main source if it can do that. */
function englishSources(settings: DictionaryNotesSettings): [DictionarySource, DictionarySource] {
	return settings.source === 'wiktionary' ? [wiktionary, freeDictionary] : [freeDictionary, wiktionary];
}

function lookupInSpanish(word: string, settings: DictionaryNotesSettings): Promise<LookupResult> {
	// If Wikcionario fails, the backup shows English explanations (with a notice saying so).
	const [backup] = englishSources(settings);
	return lookupWithBackup(
		word,
		{ source: wikcionario, options: { language: 'es', apiKey: '' } },
		settings.useFallback ? { source: backup, options: { language: 'es', apiKey: '' } } : undefined,
	);
}

function lookupSpanishInEnglish(word: string, settings: DictionaryNotesSettings): Promise<LookupResult> {
	const [primary, backup] = englishSources(settings);
	const options = { language: 'es', apiKey: '' };
	return lookupWithBackup(word, { source: primary, options }, settings.useFallback ? { source: backup, options } : undefined);
}

/** When a Spanish word isn't found, offer spellings from Wikcionario ("cancion" → "canción"). */
async function withSuggestions(word: string, lookup: Promise<LookupResult>): Promise<LookupResult> {
	try {
		return await lookup;
	} catch (err) {
		if (err instanceof LookupError && err.kind === 'not-found' && err.suggestions.length === 0) {
			const suggestions = await spanishSuggestions(word).catch(() => []);
			if (suggestions.length) throw notFoundError(word, suggestions);
		}
		throw err;
	}
}
