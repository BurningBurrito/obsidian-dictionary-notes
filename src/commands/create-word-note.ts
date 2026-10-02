import { Notice } from 'obsidian';
import type DictionaryNotesPlugin from '../main';
import {
	ensureFolder,
	loadTemplate,
	nextFreePath,
	normalizeFolder,
	noteBaseName,
	notePath,
	openNote,
} from '../notes/create-note';
import { buildVariables, renderTemplate } from '../notes/template';
import { lookupWord } from '../sources';
import { openSearchModal } from '../ui/search-modal';
import { chooseSense } from '../ui/sense-modal';

/** Search → pick a definition → create the note from the template. */
export async function createWordNote(plugin: DictionaryNotesPlugin): Promise<void> {
	const { app, settings } = plugin;

	const found = await openSearchModal(app, selectedWord(plugin), (word) =>
		lookupWord(
			word,
			settings.source,
			{ language: settings.language, apiKey: plugin.getApiKey() },
			settings.useFallback,
		),
	);
	if (!found) return;

	const { entry, fallback } = found;
	if (fallback) {
		new Notice(
			`${fallback.error.message}\nShowing results from ${entry.source.name} instead.`,
			8000,
		);
	}

	const folder = normalizeFolder(settings.folder);
	const baseName = noteBaseName(entry.word);
	const existing = app.vault.getFileByPath(notePath(folder, baseName));
	if (existing && settings.ifNoteExists === 'open') {
		new Notice(`A note for "${entry.word}" already exists. Opening it.`);
		await openNote(app, existing);
		return;
	}

	const sense = entry.senses.length > 1 ? await chooseSense(app, entry) : entry.senses[0];
	if (!sense) return;

	const { template, missing } = await loadTemplate(app, settings.templateFile);
	if (missing) {
		new Notice(
			`Template "${settings.templateFile}" was not found, so the built-in template was used.`,
		);
	}
	const content = renderTemplate(template, buildVariables(entry, sense));

	try {
		await ensureFolder(app, folder);
		const path = existing ? nextFreePath(app, folder, baseName) : notePath(folder, baseName);
		const file = await app.vault.create(path, content);
		if (settings.openAfterCreate) await openNote(app, file);
		else new Notice(`Created "${file.path}".`);
	} catch (err) {
		console.error('Dictionary Notes: could not create note', err);
		const reason = err instanceof Error ? err.message : String(err);
		new Notice(`Could not create the note for "${entry.word}": ${reason}`);
	}
}

/** The selected text in the active editor, if it looks like a single word or phrase. */
function selectedWord(plugin: DictionaryNotesPlugin): string {
	const selection = plugin.app.workspace.activeEditor?.editor?.getSelection().trim() ?? '';
	return selection.length <= 60 && !selection.includes('\n') ? selection : '';
}
