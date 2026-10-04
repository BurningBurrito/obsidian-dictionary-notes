import { notFoundError } from '../../../core/errors';
import { badResponse } from '../../../core/http';
import { actionApi, apiErrorCode } from '../../../core/wikimedia';
import type { DictionarySource } from '../types';
import { parseWikcionario, WIKCIONARIO_HOST } from './wikcionario-parser';

const NAME = 'Wikcionario';

interface SectionsResponse {
	parse?: { title?: string; sections?: { index?: string; line?: string; level?: string }[] };
}
interface TextResponse {
	parse?: { text?: string };
}

/**
 * Wikcionario, the Spanish Wiktionary: definitions written in Spanish. It has
 * no definition API like English Wiktionary's, so this reads the page's
 * "Español" section (two small requests: find the section, then fetch it).
 */
export const wikcionario: DictionarySource = {
	id: 'wikcionario',
	name: NAME,
	async lookup(word) {
		const sections = await actionApi(
			WIKCIONARIO_HOST,
			{ action: 'parse', page: word, prop: 'sections', redirects: '1' },
			NAME,
		);
		const code = apiErrorCode(sections);
		if (code === 'missingtitle' || code === 'invalidtitle') throw notFoundError(word);
		if (code) throw badResponse(NAME);

		const parse = (sections as SectionsResponse).parse;
		const title = parse?.title ?? word;
		const spanish = parse?.sections?.find((s) => s.level === '2' && s.line === 'Español');
		if (!spanish?.index) throw notFoundError(word);

		const text = await actionApi(
			WIKCIONARIO_HOST,
			{
				action: 'parse',
				page: title,
				section: spanish.index,
				prop: 'text',
				disableeditsection: '1',
				disablelimitreport: '1',
				disabletoc: '1',
			},
			NAME,
		);
		if (apiErrorCode(text)) throw badResponse(NAME);
		const entry = parseWikcionario((text as TextResponse).parse?.text ?? '', title);
		if (!entry) throw notFoundError(word);
		return entry;
	},
};

interface SearchResponse {
	query?: { search?: { title?: string }[] };
}

/**
 * Spanish spelling suggestions for a word that wasn't found. Full-text search
 * forgives missing accents ("cancion" finds "canción"); words that differ only
 * by accents come first.
 */
export async function spanishSuggestions(word: string): Promise<string[]> {
	const data = await actionApi(
		WIKCIONARIO_HOST,
		{ action: 'query', list: 'search', srsearch: word, srlimit: '8', srnamespace: '0', srprop: '' },
		NAME,
	);
	if (apiErrorCode(data)) return [];
	const plain = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
	const query = plain(word);
	const titles = ((data as SearchResponse).query?.search ?? [])
		.map((r) => r.title ?? '')
		.filter((t) => t && t.toLowerCase() !== word.toLowerCase());
	// Search covers every language on Wikcionario, so keep only close spellings:
	// the same letters (accents aside), a longer form ("canciones"), or a typo away.
	const sameLetters = titles.filter((t) => plain(t) === query);
	const close = titles.filter((t) => {
		const p = plain(t);
		return p !== query && !t.includes(' ') && (p.startsWith(query) || editDistance(p, query) <= 2);
	});
	return [...sameLetters, ...close].slice(0, 4);
}

/** How many single-letter edits turn one word into the other (Levenshtein distance). */
function editDistance(a: string, b: string): number {
	let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
	for (let i = 1; i <= a.length; i++) {
		const current = [i];
		for (let j = 1; j <= b.length; j++) {
			const substitution = (previous[j - 1] ?? 0) + (a[i - 1] === b[j - 1] ? 0 : 1);
			current.push(Math.min((previous[j] ?? 0) + 1, (current[j - 1] ?? 0) + 1, substitution));
		}
		previous = current;
	}
	return previous[b.length] ?? 0;
}
