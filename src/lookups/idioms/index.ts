import { Notice } from 'obsidian';
import { toLookupError } from '../../core/errors';
import { noteBaseName } from '../../core/notes';
import { collapseWhitespace } from '../../core/utils';
import { pickItem } from '../../ui/pick-modal';
import type { LookupType } from '../lookup-type';
import { chooseSense, Sense } from '../senses';
import { lookupIdiomFreeDictionary } from './free-dictionary-idioms';
import { DEFAULT_IDIOM_TEMPLATE, idiomVariables } from './template';
import { IdiomEntry, IdiomFound } from './types';
import { fetchIdiom, idiomNotFound, searchIdioms } from './wiktionary-idioms';

/** Idioms: search Wiktionary's English idioms, pick one, then pick a meaning. */
export const idioms: LookupType<IdiomFound, IdiomEntry, Sense> = {
	id: 'idioms',
	commandId: 'create-idiom-note',
	commandName: 'Create new idiom note',
	heading: 'Idioms',
	noun: 'idiom',
	menuTitle: 'Idiom',
	icon: 'message-square',
	search: {
		title: 'Look up an idiom',
		placeholder: 'Type an idiom, or a word in it',
		emptyMessage: 'Type an idiom to look up.',
	},
	settingKeys: { folder: 'idiomFolder', templateFile: 'idiomTemplateFile' },
	defaultTemplate: DEFAULT_IDIOM_TEMPLATE,
	templateCopyPath: 'Templates/Idiom note.md',

	async find(query, plugin) {
		try {
			const candidates = await searchIdioms(query);
			const exact = candidates.find((title) => sameIdiom(title, query));
			if (exact) return { query, candidates, entry: await fetchIdiom(exact) };
			if (candidates.length === 0) throw idiomNotFound(query);
			return { query, candidates };
		} catch (err) {
			const error = toLookupError(err);
			// Offline means the backup would fail the same way.
			if (!plugin.settings.idiomUseFallback || error.kind === 'offline') throw error;
			try {
				const entry = await lookupIdiomFreeDictionary(query);
				return { query, candidates: [], entry, fallback: error };
			} catch {
				// Wiktionary's error is the one the user can act on.
				throw error;
			}
		}
	},
	notice(found) {
		return found.fallback
			? `${found.fallback.message}\nShowing results from Free Dictionary API instead.`
			: undefined;
	},
	async chooseItem(app, found) {
		if (found.entry) return found.entry;
		const title =
			found.candidates.length === 1
				? found.candidates[0]
				: await pickItem(app, {
						items: found.candidates,
						placeholder: `Choose an idiom (${found.candidates.length} found for "${found.query}"). Type to filter.`,
						emptyText: 'No idioms match.',
						matches: (candidate, q) => candidate.toLowerCase().includes(q),
						render: (candidate, el) => {
							el.createDiv({ text: candidate });
						},
					});
		if (!title) return null;
		const notice = new Notice(`Looking up "${title}"…`, 0);
		try {
			return await fetchIdiom(title);
		} finally {
			notice.hide();
		}
	},
	noteName: (entry) => noteBaseName(entry.idiom, 'Untitled idiom'),
	displayName: (entry) => entry.idiom,
	chooseDetail(app, entry) {
		if (entry.senses.length > 1) return chooseSense(app, entry.idiom, entry.senses, 'meaning');
		return Promise.resolve(entry.senses[0] ?? null);
	},
	variables: idiomVariables,
};

/** "Spill the beans", "spill  the beans." and "spill the beans" are the same idiom. */
function sameIdiom(a: string, b: string): boolean {
	const normalize = (s: string) =>
		collapseWhitespace(s.replace(/[‘’]/g, "'"))
			.replace(/[.!?]+$/, '')
			.toLowerCase();
	return normalize(a) === normalize(b);
}
