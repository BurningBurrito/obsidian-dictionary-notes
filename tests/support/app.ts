// An in-memory vault and workspace, enough for the note-creation flow.
import { TFile, TFolder } from 'obsidian';
import type DictionaryNotesPlugin from '../../src/main';
import { DictionaryNotesSettings, sanitizeSettings } from '../../src/settings';

export interface FakeVault {
	files: Map<string, string>;
	folders: Set<string>;
	opened: string[];
}

export function fakePlugin(
	saved: Partial<DictionaryNotesSettings> | null = null,
	files: Record<string, string> = {},
	folders: string[] = [],
): { plugin: DictionaryNotesPlugin; vault: FakeVault } {
	const vault: FakeVault = { files: new Map(Object.entries(files)), folders: new Set(folders), opened: [] };
	const fileAt = (path: string) => Object.assign(new TFile(), { path });

	const app = {
		vault: {
			getFileByPath: (path: string) => (vault.files.has(path) ? fileAt(path) : null),
			getAbstractFileByPath: (path: string) => {
				if (vault.files.has(path)) return fileAt(path);
				if (vault.folders.has(path)) return Object.assign(new TFolder(), { path });
				return null;
			},
			createFolder: async (path: string) => {
				if (vault.folders.has(path) || vault.files.has(path)) throw new Error('Folder already exists.');
				// Like Obsidian, create missing parent folders too.
				const parts = path.split('/');
				for (let i = 1; i <= parts.length; i++) vault.folders.add(parts.slice(0, i).join('/'));
			},
			create: async (path: string, content: string) => {
				if (vault.files.has(path)) throw new Error('File already exists.');
				const parent = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '';
				if (parent && !vault.folders.has(parent)) throw new Error(`Folder "${parent}" doesn't exist.`);
				vault.files.set(path, content);
				return fileAt(path);
			},
			cachedRead: async (file: { path: string }) => vault.files.get(file.path) ?? '',
		},
		workspace: {
			activeEditor: null,
			getLeaf: () => ({ openFile: async (file: { path: string }) => void vault.opened.push(file.path) }),
		},
		secretStorage: { getSecret: () => null },
	};

	const plugin = {
		app,
		settings: sanitizeSettings(saved),
		saveSettings: async () => undefined,
		getApiKey: () => '',
	} as unknown as DictionaryNotesPlugin;
	return { plugin, vault };
}
