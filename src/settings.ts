import {
	App,
	Notice,
	PluginSettingTab,
	SecretComponent,
	SettingDefinitionItem,
} from 'obsidian';
import type DictionaryNotesPlugin from './main';
import { ensureFolder } from './notes/create-note';
import { DEFAULT_TEMPLATE } from './notes/template';
import { isSourceId, SOURCE_OPTIONS } from './sources';
import { SourceId } from './types';

export type ExistingNoteAction = 'open' | 'new';

export interface DictionaryNotesSettings {
	folder: string;
	templateFile: string;
	ifNoteExists: ExistingNoteAction;
	openAfterCreate: boolean;
	source: SourceId;
	language: string;
	useFallback: boolean;
	/** Name of the secret in Obsidian's keychain that holds the key (not the key itself). */
	mwKeySecret: string;
}

export const DEFAULT_SETTINGS: DictionaryNotesSettings = {
	folder: 'Dictionary',
	templateFile: '',
	ifNoteExists: 'open',
	openAfterCreate: true,
	source: 'free-dictionary',
	language: 'en',
	useFallback: true,
	mwKeySecret: '',
};

const LANGUAGE_CODE = /^[a-z]{2,3}$/;
const TEMPLATE_COPY_FOLDER = 'Templates';
const TEMPLATE_COPY_PATH = `${TEMPLATE_COPY_FOLDER}/Dictionary note.md`;

/** Merge saved data with defaults and repair values a validator would reject. */
export function sanitizeSettings(saved: Partial<DictionaryNotesSettings> | null): DictionaryNotesSettings {
	const settings = Object.assign({}, DEFAULT_SETTINGS, saved);
	if (!isSourceId(settings.source)) settings.source = DEFAULT_SETTINGS.source;
	if (!LANGUAGE_CODE.test(settings.language)) settings.language = DEFAULT_SETTINGS.language;
	if (settings.ifNoteExists !== 'open' && settings.ifNoteExists !== 'new') {
		settings.ifNoteExists = DEFAULT_SETTINGS.ifNoteExists;
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
			{
				type: 'group',
				heading: 'Notes',
				items: [
					{
						name: 'Note folder',
						desc: "New word notes are created in this folder. It's created if it doesn't exist.",
						control: {
							type: 'folder',
							key: 'folder',
							placeholder: DEFAULT_SETTINGS.folder,
							defaultValue: DEFAULT_SETTINGS.folder,
						},
					},
					{
						name: 'Template file',
						desc: 'Leave empty to use the built-in template. The README lists the available variables.',
						control: {
							type: 'file',
							key: 'templateFile',
							placeholder: TEMPLATE_COPY_PATH,
							filter: (file) => file.extension === 'md',
						},
					},
					{
						name: 'Create an editable template',
						desc: `Save the built-in template to "${TEMPLATE_COPY_PATH}" and use it, so you can change it.`,
						action: () => void this.createTemplateCopy(),
					},
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
			{
				type: 'group',
				heading: 'Dictionary',
				items: [
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
				],
			},
		];
	}

	async setControlValue(key: string, value: unknown): Promise<void> {
		await super.setControlValue(key, value);
		// Show or hide the API key row when the source changes.
		if (key === 'source') this.refreshDomState();
	}

	private async createTemplateCopy() {
		try {
			if (!this.app.vault.getFileByPath(TEMPLATE_COPY_PATH)) {
				await ensureFolder(this.app, TEMPLATE_COPY_FOLDER);
				await this.app.vault.create(TEMPLATE_COPY_PATH, DEFAULT_TEMPLATE);
				new Notice(`Created "${TEMPLATE_COPY_PATH}". Edit it to change your word notes.`);
			} else {
				new Notice(`"${TEMPLATE_COPY_PATH}" already exists. It's now your template.`);
			}
			this.plugin.settings.templateFile = TEMPLATE_COPY_PATH;
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
