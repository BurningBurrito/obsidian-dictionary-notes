import { Notice, Plugin } from 'obsidian';
import {
	DEFAULT_SETTINGS,
	DictionaryNotesSettings,
	DictionaryNotesSettingTab,
} from './settings';

export default class DictionaryNotesPlugin extends Plugin {
	settings!: DictionaryNotesSettings;

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: 'create-word-note',
			name: 'Create new word note',
			callback: () => this.createWordNote(),
		});

		this.addRibbonIcon('book-open', 'Create new word note', () =>
			this.createWordNote(),
		);

		this.addSettingTab(new DictionaryNotesSettingTab(this.app, this));
	}

	createWordNote() {
		// Placeholder until the search modal exists; proves the build and
		// test-vault pipeline work end to end.
		new Notice(
			`Dictionary Notes is loaded. Notes will go in "${this.settings.folder}".`,
		);
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<DictionaryNotesSettings>,
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
