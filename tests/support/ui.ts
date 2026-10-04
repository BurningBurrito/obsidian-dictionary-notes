// Stand-in for the search window and the picker (src/ui/search-modal.ts and
// src/ui/pick-modal.ts). Tests script what the user "types" and "chooses".
import type { PickOptions } from '../../src/ui/pick-modal';
import type { SearchOptions, SearchReview } from '../../src/ui/search-modal';

export const script = {
	/** What the user types in the search window. */
	query: '',
	/** The search mode the user chooses, if any. */
	mode: undefined as string | undefined,
	/** Which item the user picks from a list; null cancels. */
	pick: (items: unknown[]): unknown => items[0] ?? null,
	/** The answer to a review question ("corrí" is a form of "correr"): keep, or search the first alternative. */
	review: 'keep' as 'keep' | 'alternative',
};

export const ui = {
	searches: [] as SearchOptions<unknown>[],
	reviews: [] as SearchReview[],
	/** Errors the search window would show. The real window stays open; here it's then cancelled. */
	searchErrors: [] as Error[],
	picks: [] as PickOptions<unknown>[],
};

export function resetUi() {
	script.query = '';
	script.mode = undefined;
	script.pick = (items) => items[0] ?? null;
	script.review = 'keep';
	ui.searches.length = 0;
	ui.reviews.length = 0;
	ui.searchErrors.length = 0;
	ui.picks.length = 0;
}

export async function openSearchModal<T>(
	_app: unknown,
	options: SearchOptions<T>,
	lookup: (query: string, mode: string | undefined) => Promise<T>,
): Promise<T | null> {
	ui.searches.push(options as SearchOptions<unknown>);
	// Like the real window: the remembered mode if it's offered, else the first one.
	const modes = options.modes ?? [];
	const mode = script.mode ?? (modes.find((m) => m.id === options.initialMode) ?? modes[0])?.id;
	try {
		const result = await lookup(script.query, mode);
		const review = options.review?.(result);
		if (!review) return result;
		ui.reviews.push(review);
		const alternative = review.alternatives[0];
		return script.review === 'alternative' && alternative ? await lookup(alternative, mode) : result;
	} catch (err) {
		ui.searchErrors.push(err as Error);
		return null;
	}
}

export function pickItem<T>(_app: unknown, options: PickOptions<T>): Promise<T | null> {
	ui.picks.push(options as PickOptions<unknown>);
	return Promise.resolve(script.pick(options.items) as T | null);
}
