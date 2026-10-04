import {
	App,
	Notice,
	PluginSettingTab,
	SecretComponent,
	SettingDefinitionItem,
	SettingGroupItem,
} from 'obsidian';
import { ensureFolder } from './core/notes';
import { AnyLookupType, LOOKUP_TYPES } from './lookups';
import { isSourceId, SOURCE_OPTIONS } from './lookups/definitions/sources';
import { SPANISH_TEMPLATE } from './lookups/definitions/template';
import type { MainSourceId } from './lookups/definitions/types';
import type DictionaryNotesPlugin from './main';

export type ExistingNoteAction = 'open' | 'new';

export const QUOTE_SEARCH_MODES = ['keyword', 'author', 'topic'] as const;
/** main: the Language setting (as in 1.1); es: in Spanish; es-en: Spanish word, explained in English. */
export const DEFINITION_SEARCH_MODES = ['main', 'es', 'es-en'] as const;

export interface DictionaryNotesSettings {
	// Shared by all lookup types.
	ifNoteExists: ExistingNoteAction;
	openAfterCreate: boolean;

	// Definitions. These keep their 1.0 names so saved settings carry over unchanged.
	folder: string;
	templateFile: string;
	source: MainSourceId;
	language: string;
	useFallback: boolean;
	/** Name of the secret in Obsidian's keychain that holds the key (not the key itself). */
	mwKeySecret: string;
	/** The definitions search mode used last: one of DEFINITION_SEARCH_MODES. */
	definitionSearchMode: string;

	// Spanish definitions.
	/** Show the English / Español / Spanish → English buttons in the search window. */
	spanishEnabled: boolean;
	spanishFolder: string;
	/** Template for definitions written in Spanish. */
	spanishTemplateFile: string;

	// Idioms.
	idiomFolder: string;
	idiomTemplateFile: string;
	idiomUseFallback: boolean;

	// Quotes.
	quoteFolder: string;
	quoteTemplateFile: string;
	/** The search mode used last: one of QUOTE_SEARCH_MODES. */
	quoteSearchMode: string;
}

/** Settings that hold a lookup type's note folder or template file. */
export type NoteSettingKey =
	| 'folder'
	| 'templateFile'
	| 'spanishFolder'
	| 'spanishTemplateFile'
	| 'idiomFolder'
	| 'idiomTemplateFile'
	| 'quoteFolder'
	| 'quoteTemplateFile';

export const DEFAULT_SETTINGS: DictionaryNotesSettings = {
	ifNoteExists: 'open',
	openAfterCreate: true,

	folder: 'Definitions',
	templateFile: '',
	source: 'free-dictionary',
	language: 'en',
	useFallback: true,
	mwKeySecret: '',
	definitionSearchMode: 'main',

	spanishEnabled: true,
	spanishFolder: 'Definitions/Español',
	spanishTemplateFile: '',

	idiomFolder: 'Idioms',
	idiomTemplateFile: '',
	idiomUseFallback: true,

	quoteFolder: 'Quotes',
	quoteTemplateFile: '',
	quoteSearchMode: 'keyword',
};

const LANGUAGE_CODE = /^[a-z]{2,3}$/;

/**
 * Merge saved data with defaults and repair values a validator would reject.
 * Saved values always win, so settings from 1.0 (same key names) carry over;
 * keys added later start at their defaults.
 */
export function sanitizeSettings(saved: Partial<DictionaryNotesSettings> | null): DictionaryNotesSettings {
	const settings = Object.assign({}, DEFAULT_SETTINGS, saved);
	if (!isSourceId(settings.source)) settings.source = DEFAULT_SETTINGS.source;
	if (!LANGUAGE_CODE.test(settings.language)) settings.language = DEFAULT_SETTINGS.language;
	if (settings.ifNoteExists !== 'open' && settings.ifNoteExists !== 'new') {
		settings.ifNoteExists = DEFAULT_SETTINGS.ifNoteExists;
	}
	if (!(QUOTE_SEARCH_MODES as readonly string[]).includes(settings.quoteSearchMode)) {
		settings.quoteSearchMode = DEFAULT_SETTINGS.quoteSearchMode;
	}
	if (!(DEFINITION_SEARCH_MODES as readonly string[]).includes(settings.definitionSearchMode)) {
		settings.definitionSearchMode = DEFAULT_SETTINGS.definitionSearchMode;
	}
	return settings;
}

type SettingKey = keyof DictionaryNotesSettings;

// Declarative settings (Obsidian 1.13+): Obsidian renders these, saves changes
// to plugin.settings, and indexes them for the settings search.
export class DictionaryNotesSettingTab extends PluginSettingTab {
	plugin: DictionaryNotesPlugin;

	constructor(app: App, plugin: DictionaryNotesPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	getSettingDefinitions(): SettingDefinitionItem<SettingKey>[] {
		return [
			// Settings shared by every type come first, without a heading.
			{
				type: 'group',
				items: [
					{
						name: 'If the note already exists',
						control: {
							type: 'dropdown',
							key: 'ifNoteExists',
							options: {
								open: 'Open the existing note',
								new: 'Create a new note with a number',
							},
						},
					},
					{
						name: 'Open note after creating it',
						control: { type: 'toggle', key: 'openAfterCreate' },
					},
				],
			},
			...LOOKUP_TYPES.flatMap((type): SettingDefinitionItem<SettingKey>[] => [
				{
					type: 'group',
					heading: type.heading,
					items: [...this.typeItems(type), ...this.noteItems(type)],
				},
				...(type.id === 'definitions' ? [this.spanishGroup()] : []),
			]),
		];
	}

	private spanishGroup(): SettingDefinitionItem<SettingKey> {
		return {
			type: 'group',
			heading: 'Spanish definitions',
			items: [
				{
					name: 'Source',
					desc: 'Definitions written in Spanish come from Wikcionario (es.wiktionary.org). Spanish words explained in English come from Free Dictionary API and Wiktionary. No account needed. Each lookup sends the word to these services.',
				},
				{
					name: 'Spanish in the search window',
					desc: 'Show the English, Español, and Spanish → English buttons when looking up a word.',
					control: { type: 'toggle', key: 'spanishEnabled' },
				},
				...this.noteRows({
					folderKey: 'spanishFolder',
					folderDesc: "Notes for Spanish words are created in this folder. It's created if it doesn't exist.",
					templateKey: 'spanishTemplateFile',
					templateDesc:
						'For definitions written in Spanish. Leave empty to use the built-in Spanish template. Spanish words explained in English use the Definitions template.',
					copyPath: 'Templates/Spanish definition note.md',
					template: SPANISH_TEMPLATE,
					noun: 'Spanish definition',
				}),
			],
		};
	}

	async setControlValue(key: string, value: unknown): Promise<void> {
		await super.setControlValue(key, value);
		// Show or hide the API key row when the source changes.
		if (key === 'source') this.refreshDomState();
	}

	/** Folder, template, and template copy: the same three rows for every type. */
	private noteItems(type: AnyLookupType): SettingGroupItem<SettingKey>[] {
		return this.noteRows({
			folderKey: type.settingKeys.folder,
			folderDesc: `New ${type.noun} notes are created in this folder. It's created if it doesn't exist.`,
			templateKey: type.settingKeys.templateFile,
			templateDesc: 'Leave empty to use the built-in template. The README lists the available variables.',
			copyPath: type.templateCopyPath,
			template: type.defaultTemplate,
			noun: type.noun,
		});
	}

	private noteRows(rows: {
		folderKey: NoteSettingKey;
		folderDesc: string;
		templateKey: NoteSettingKey;
		templateDesc: string;
		copyPath: string;
		template: string;
		noun: string;
	}): SettingGroupItem<SettingKey>[] {
		return [
			{
				name: 'Note folder',
				desc: rows.folderDesc,
				aliases: [`${rows.noun} folder`],
				control: {
					type: 'folder',
					key: rows.folderKey,
					placeholder: DEFAULT_SETTINGS[rows.folderKey],
					defaultValue: DEFAULT_SETTINGS[rows.folderKey],
				},
			},
			{
				name: 'Template file',
				desc: rows.templateDesc,
				aliases: [`${rows.noun} template`],
				control: {
					type: 'file',
					key: rows.templateKey,
					placeholder: rows.copyPath,
					filter: (file) => file.extension === 'md',
				},
			},
			{
				name: 'Create an editable template',
				desc: `Save the built-in template to "${rows.copyPath}" and use it, so you can change it.`,
				action: () => void this.createTemplateCopy(rows.copyPath, rows.template, rows.templateKey, rows.noun),
			},
		];
	}

	/** Settings only one type has, such as where its data comes from. */
	private typeItems(type: AnyLookupType): SettingGroupItem<SettingKey>[] {
		switch (type.id) {
			case 'definitions':
				return this.definitionItems();
			case 'idioms':
				return this.idiomItems();
			case 'quotes':
				return this.quoteItems();
		}
	}

	private quoteItems(): SettingGroupItem<SettingKey>[] {
		return [
			{
				name: 'Source',
				desc: 'Quotes come from Wikiquote (English only, no account needed). Each search sends what you type to Wikiquote, and Wikidata is asked whether a page is about a person. Disputed and misattributed quotes are labeled.',
			},
		];
	}

	private idiomItems(): SettingGroupItem<SettingKey>[] {
		return [
			{
				name: 'Source',
				desc: 'Idioms come from Wiktionary (English only, no account needed). Each lookup sends what you type to Wiktionary.',
			},
			{
				name: 'Use a backup source',
				desc: 'If Wiktionary fails, look up the exact idiom in Free Dictionary API instead.',
				aliases: ['idiom backup source'],
				control: { type: 'toggle', key: 'idiomUseFallback' },
			},
		];
	}

	private definitionItems(): SettingGroupItem<SettingKey>[] {
		return [
			{
				name: 'Dictionary source',
				desc: 'Where definitions come from. Each lookup sends the word to this service.',
				control: { type: 'dropdown', key: 'source', options: SOURCE_OPTIONS },
			},
			{
				name: 'Merriam-Webster API key',
				desc: mwKeyDescription(),
				visible: () => this.plugin.settings.source === 'merriam-webster',
				render: (setting) => {
					setting.addComponent((el) =>
						new SecretComponent(this.app, el)
							.setValue(this.plugin.settings.mwKeySecret)
							.onChange(async (value) => {
								this.plugin.settings.mwKeySecret = value;
								await this.plugin.saveSettings();
							}),
					);
				},
			},
			{
				name: 'Language',
				desc: 'Language code for Free Dictionary API and Wiktionary, such as en, es, or fr. Merriam-Webster is English only.',
				control: {
					type: 'text',
					key: 'language',
					placeholder: DEFAULT_SETTINGS.language,
					validate: (value) =>
						LANGUAGE_CODE.test(value.trim())
							? undefined
							: 'Use a 2 or 3 letter lowercase language code, such as en.',
				},
			},
			{
				name: 'Use a backup source',
				desc: 'If the main source fails or has no entry, try Wiktionary instead (or Free Dictionary API when Wiktionary is the main source).',
				control: { type: 'toggle', key: 'useFallback' },
			},
		];
	}

	private async createTemplateCopy(path: string, template: string, key: NoteSettingKey, noun: string) {
		try {
			if (!this.app.vault.getFileByPath(path)) {
				await ensureFolder(this.app, path.slice(0, path.lastIndexOf('/')));
				await this.app.vault.create(path, template);
				new Notice(`Created "${path}". Edit it to change your ${noun} notes.`);
			} else {
				new Notice(`"${path}" already exists. It's now your template.`);
			}
			this.plugin.settings[key] = path;
			await this.plugin.saveSettings();
			this.update();
		} catch (err) {
			console.error('Dictionary Notes: could not create template', err);
			new Notice('Could not create the template file. See the developer console for details.');
		}
	}
}

function mwKeyDescription(): DocumentFragment {
	return createFragment((frag) => {
		frag.appendText('Get a free key for the Collegiate Dictionary at ');
		frag.createEl('a', {
			text: 'dictionaryapi.com',
			href: 'https://dictionaryapi.com/register/index',
		});
		frag.appendText(
			". Free keys are for non-commercial use. The key is kept in Obsidian's keychain, not in this plugin's settings file.",
		);
	});
}
