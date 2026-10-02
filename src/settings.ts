import { PluginSettingTab, SettingDefinitionItem } from 'obsidian';

export interface DictionaryNotesSettings {
	folder: string;
}

export const DEFAULT_SETTINGS: DictionaryNotesSettings = {
	folder: 'Dictionary',
};

type SettingKey = keyof DictionaryNotesSettings;

// Declarative settings (Obsidian 1.13+): Obsidian renders these, saves changes
// to plugin.settings, and indexes them for the settings search.
export class DictionaryNotesSettingTab extends PluginSettingTab {
	getSettingDefinitions(): SettingDefinitionItem<SettingKey>[] {
		return [
			{
				name: 'Note folder',
				desc: 'New word notes are created in this folder.',
				control: {
					type: 'folder',
					key: 'folder',
					placeholder: DEFAULT_SETTINGS.folder,
					defaultValue: DEFAULT_SETTINGS.folder,
				},
			},
		];
	}
}
