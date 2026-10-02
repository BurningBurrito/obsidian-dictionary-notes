import { noteBaseName } from '../../core/notes';
import type { LookupType } from '../lookup-type';
import { chooseSense, Sense } from '../senses';
import { lookupWord, LookupResult } from './sources';
import { buildVariables, DEFAULT_TEMPLATE } from './template';
import { WordEntry } from './types';

/** Definitions: look up a word, pick one of its definitions. */
export const definitions: LookupType<LookupResult, WordEntry, Sense> = {
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
	defaultTemplate: DEFAULT_TEMPLATE,
	templateCopyPath: 'Templates/Definition note.md',

	find(word, plugin) {
		const { settings } = plugin;
		return lookupWord(
			word,
			settings.source,
			{ language: settings.language, apiKey: plugin.getApiKey() },
			settings.useFallback,
		);
	},
	notice({ entry, fallback }) {
		return fallback
			? `${fallback.error.message}\nShowing results from ${entry.source.name} instead.`
			: undefined;
	},
	chooseItem: (_app, found) => Promise.resolve(found.entry),
	noteName: (entry) => noteBaseName(entry.word, 'Untitled word'),
	displayName: (entry) => entry.word,
	chooseDetail(app, entry) {
		if (entry.senses.length > 1) return chooseSense(app, entry.word, entry.senses, 'definition');
		return Promise.resolve(entry.senses[0] ?? null);
	},
	variables: buildVariables,
};
