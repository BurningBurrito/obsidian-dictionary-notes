import { App, normalizePath, TFile, TFolder } from 'obsidian';

// Characters that aren't allowed in file names on some systems, or that break
// Obsidian links (# ^ [ ] |).
const ILLEGAL_FILENAME_CHARS = /[\\/:*?"<>|#^[\]]/g;

/** A safe note name, e.g. "AC/DC" -> "AC DC". */
export function noteBaseName(title: string, fallback = 'Untitled word'): string {
	const name = title
		.replace(ILLEGAL_FILENAME_CHARS, ' ')
		.replace(/\s+/g, ' ')
		.trim()
		.replace(/^\.+/, '');
	return name || fallback;
}

/** Normalized folder path; "" means the vault root. */
export function normalizeFolder(folder: string): string {
	const path = normalizePath(folder.trim());
	return path === '/' ? '' : path;
}

export function notePath(folder: string, baseName: string, copyNumber = 1): string {
	const fileName = copyNumber > 1 ? `${baseName} ${copyNumber}.md` : `${baseName}.md`;
	return normalizePath(folder ? `${folder}/${fileName}` : fileName);
}

/** First free path of the form "word 2.md", "word 3.md", ... */
export function nextFreePath(app: App, folder: string, baseName: string): string {
	let n = 2;
	while (app.vault.getAbstractFileByPath(notePath(folder, baseName, n))) n++;
	return notePath(folder, baseName, n);
}

export async function ensureFolder(app: App, folder: string): Promise<void> {
	if (!folder) return;
	const existing = app.vault.getAbstractFileByPath(folder);
	if (existing instanceof TFolder) return;
	if (existing) throw new Error(`"${folder}" is a file, not a folder.`);
	await app.vault.createFolder(folder);
}

/**
 * The user's template file, or the built-in template if none is set.
 * `missing` is true when a template file is set but can't be found.
 */
export async function loadTemplate(
	app: App,
	templatePath: string,
	builtInTemplate: string,
): Promise<{ template: string; missing: boolean }> {
	const path = templatePath.trim();
	if (!path) return { template: builtInTemplate, missing: false };
	const file =
		app.vault.getFileByPath(normalizePath(path)) ??
		app.vault.getFileByPath(normalizePath(`${path}.md`));
	if (!file) return { template: builtInTemplate, missing: true };
	return { template: await app.vault.cachedRead(file), missing: false };
}

export async function openNote(app: App, file: TFile): Promise<void> {
	await app.workspace.getLeaf(false).openFile(file);
}
