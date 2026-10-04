import { Notice } from 'obsidian';
import type { LookupType } from '../lookups/lookup-type';
import type DictionaryNotesPlugin from '../main';
import { openSearchModal } from '../ui/search-modal';
import { toLookupError } from './errors';
import {
	ensureFolder,
	loadTemplate,
	nextFreePath,
	normalizeFolder,
	notePath,
	openNote,
} from './notes';
import { renderTemplate } from './render';

/**
 * Search → pick → create the note from the template. The same steps for every
 * lookup type; see LookupType for what each type supplies.
 */
export async function createDictionaryNote<Found, Item, Detail>(
	plugin: DictionaryNotesPlugin,
	type: LookupType<Found, Item, Detail>,
): Promise<void> {
	const { app, settings } = plugin;
	const modeKey = type.searchModeKey;

	const found = await openSearchModal<Found>(
		app,
		{
			...type.search,
			modes: type.searchModes ? type.searchModes(settings) : type.search.modes,
			review: type.review ? (result) => type.review?.(result) : undefined,
			initialQuery: selectedText(plugin),
			initialMode: modeKey ? settings[modeKey] : undefined,
			onModeChange: modeKey
				? (mode) => {
						settings[modeKey] = mode;
						void plugin.saveSettings();
					}
				: undefined,
		},
		(query, mode) => type.find(query, plugin, mode),
	);
	if (found === null) return;

	const message = type.notice?.(found);
	if (message) new Notice(message, 8000);

	const item = await showFailure(() => type.chooseItem(app, found));
	if (item === null) return;

	const target = type.target?.(item, settings) ?? {
		folder: settings[type.settingKeys.folder],
		templateFile: settings[type.settingKeys.templateFile],
		builtInTemplate: type.defaultTemplate,
	};
	const folder = normalizeFolder(target.folder);
	const baseName = type.noteName(item);
	const existing = app.vault.getFileByPath(notePath(folder, baseName));
	if (existing && settings.ifNoteExists === 'open') {
		new Notice(`A note for "${type.displayName(item)}" already exists. Opening it.`);
		await openNote(app, existing);
		return;
	}

	const detail = await showFailure(() => type.chooseDetail(app, item));
	if (detail === null) return;

	const { template, missing } = await loadTemplate(app, target.templateFile, target.builtInTemplate);
	if (missing) {
		new Notice(`Template "${target.templateFile}" was not found, so the built-in template was used.`);
	}
	const content = renderTemplate(template, type.variables(item, detail));

	try {
		await ensureFolder(app, folder);
		const path = existing ? nextFreePath(app, folder, baseName) : notePath(folder, baseName);
		const file = await app.vault.create(path, content);
		if (settings.openAfterCreate) await openNote(app, file);
		else new Notice(`Created "${file.path}".`);
	} catch (err) {
		console.error('Dictionary Notes: could not create note', err);
		const reason = err instanceof Error ? err.message : String(err);
		new Notice(`Could not create the note for "${type.displayName(item)}": ${reason}`);
	}
}

/**
 * Run a step that may fetch more data after the search window has closed.
 * A failure is shown as a notice; returns null when cancelled or failed.
 */
async function showFailure<T>(step: () => Promise<T | null>): Promise<T | null> {
	try {
		return await step();
	} catch (err) {
		new Notice(toLookupError(err).message);
		return null;
	}
}

/** The selected text in the active editor, if it looks like a single word or phrase. */
function selectedText(plugin: DictionaryNotesPlugin): string {
	const selection = plugin.app.workspace.activeEditor?.editor?.getSelection().trim() ?? '';
	return selection.length <= 60 && !selection.includes('\n') ? selection : '';
}
