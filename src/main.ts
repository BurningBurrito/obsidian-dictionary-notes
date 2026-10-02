import { Menu, Notice, Plugin } from 'obsidian';
import { createDictionaryNote } from './core/flow';
import { AnyLookupType, LOOKUP_TYPES } from './lookups';
import {
	DictionaryNotesSettings,
	DictionaryNotesSettingTab,
	sanitizeSettings,
} from './settings';

export default class DictionaryNotesPlugin extends Plugin {
	settings!: DictionaryNotesSettings;

	async onload() {
		await this.loadSettings();

		for (const type of LOOKUP_TYPES) {
			this.addCommand({
				id: type.commandId,
				name: type.commandName,
				callback: () => this.createNote(type),
			});
		}

		// One icon opens a menu with every type. Users can hide it by right-clicking the ribbon.
		this.addRibbonIcon('book-open', 'Create dictionary note', (evt) => this.showRibbonMenu(evt));

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

	private showRibbonMenu(evt: MouseEvent) {
		const menu = new Menu();
		for (const type of LOOKUP_TYPES) {
			menu.addItem((item) =>
				item
					.setTitle(type.menuTitle)
					.setIcon(type.icon)
					.onClick(() => this.createNote(type)),
			);
		}
		menu.showAtMouseEvent(evt);
	}

	private createNote(type: AnyLookupType) {
		createDictionaryNote(this, type).catch((err: unknown) => {
			console.error('Dictionary Notes: unexpected error', err);
			new Notice('Something went wrong while creating the note. See the developer console for details.');
		});
	}
}
