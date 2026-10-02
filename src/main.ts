import { Notice, Plugin } from 'obsidian';
import { createWordNote } from './commands/create-word-note';
import {
	DictionaryNotesSettings,
	DictionaryNotesSettingTab,
	sanitizeSettings,
} from './settings';

export default class DictionaryNotesPlugin extends Plugin {
	settings!: DictionaryNotesSettings;

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: 'create-word-note',
			name: 'Create new word note',
			callback: () => this.runCreateWordNote(),
		});

		// Users can hide this icon by right-clicking the ribbon.
		this.addRibbonIcon('book-open', 'Create new word note', () => this.runCreateWordNote());

		this.addSettingTab(new DictionaryNotesSettingTab(this.app, this));
	}

	/** The Merriam-Webster key from Obsidian's keychain, or "" if none is set. */
	getApiKey(): string {
		const secretName = this.settings.mwKeySecret;
		return secretName ? (this.app.secretStorage.getSecret(secretName) ?? '') : '';
	}

	async loadSettings() {
		this.settings = sanitizeSettings(
			(await this.loadData()) as Partial<DictionaryNotesSettings> | null,
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	private runCreateWordNote() {
		createWordNote(this).catch((err: unknown) => {
			console.error('Dictionary Notes: unexpected error', err);
			new Notice('Something went wrong while creating the word note. See the developer console for details.');
		});
	}
}
