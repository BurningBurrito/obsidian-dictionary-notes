// Stand-in for the "obsidian" module, which only exists inside the app. It
// provides just what the plugin's code uses outside of the UI.
import { DOMParser as LinkeDOMParser } from 'linkedom';
import { handleRequest } from './network';

// Browsers wrap an HTML fragment in <html><body>; linkedom doesn't, so do it
// here to parse API snippets the way Obsidian (Chromium) does.
class BrowserLikeDOMParser {
	parseFromString(html: string, type: string) {
		const full = /<html[\s>]/i.test(html) ? html : `<!doctype html><html><head></head><body>${html}</body></html>`;
		return new LinkeDOMParser().parseFromString(full, type as 'text/html');
	}
}
const g = globalThis as Record<string, unknown>;
g.DOMParser = BrowserLikeDOMParser;
g.window = globalThis;
Object.defineProperty(globalThis.navigator, 'onLine', { value: true, configurable: true });

export async function requestUrl(request: { url: string; headers?: Record<string, string> }) {
	return handleRequest(request.url, request.headers ?? {});
}

export const notices: string[] = [];
export class Notice {
	constructor(message: string) {
		notices.push(message);
	}
	hide() {}
}

export const moment = () => ({ format: (format: string) => `<${format}>` });

export function normalizePath(path: string): string {
	const cleaned = path.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/^\/|\/$/g, '');
	return cleaned === '' ? '/' : cleaned;
}

export class TAbstractFile {
	path = '';
}
export class TFile extends TAbstractFile {
	extension = 'md';
}
export class TFolder extends TAbstractFile {}

// UI classes are replaced by tests/support/ui.ts; these only satisfy imports.
export class Modal {}
export class SuggestModal {}
export class ButtonComponent {}
export class TextComponent {}
export class Plugin {}
export class PluginSettingTab {}
export class SecretComponent {}
export class Menu {}
