// Stand-in for the search window and the picker (src/ui/search-modal.ts and
// src/ui/pick-modal.ts). Tests script what the user "types" and "chooses".
import type { PickOptions } from '../../src/ui/pick-modal';
import type { SearchOptions } from '../../src/ui/search-modal';

export const script = {
	/** What the user types in the search window. */
	query: '',
	/** The search mode the user chooses, if any. */
	mode: undefined as string | undefined,
	/** Which item the user picks from a list; null cancels. */
	pick: (items: unknown[]): unknown => items[0] ?? null,
};

export const ui = {
	searches: [] as SearchOptions[],
	/** Errors the search window would show. The real window stays open; here it's then cancelled. */
	searchErrors: [] as Error[],
	picks: [] as PickOptions<unknown>[],
};

export function resetUi() {
	script.query = '';
	script.mode = undefined;
	script.pick = (items) => items[0] ?? null;
	ui.searches.length = 0;
	ui.searchErrors.length = 0;
	ui.picks.length = 0;
}

export async function openSearchModal<T>(
	_app: unknown,
	options: SearchOptions,
	lookup: (query: string, mode: string | undefined) => Promise<T>,
): Promise<T | null> {
	ui.searches.push(options);
	try {
		return await lookup(script.query, script.mode ?? options.initialMode ?? options.modes?.[0]?.id);
	} catch (err) {
		ui.searchErrors.push(err as Error);
		return null;
	}
}

export function pickItem<T>(_app: unknown, options: PickOptions<T>): Promise<T | null> {
	ui.picks.push(options as PickOptions<unknown>);
	return Promise.resolve(script.pick(options.items) as T | null);
}
