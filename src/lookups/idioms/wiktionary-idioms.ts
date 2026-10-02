import { LookupError } from '../../core/errors';
import { parseHtml } from '../../core/html';
import { badResponse } from '../../core/http';
import { collapseWhitespace } from '../../core/utils';
import { actionApi, apiErrorCode } from '../../core/wikimedia';
import { wiktionary } from '../definitions/sources/wiktionary';
import { IdiomEntry } from './types';

const HOST = 'en.wiktionary.org';
const NAME = 'Wiktionary';
// English only for now. Other languages have their own categories, such as Spanish_idioms.
const CATEGORY = 'English_idioms';

// A pointer to the literal words, not a meaning of the idiom, e.g. on "piece of cake":
// "Used other than figuratively or idiomatically: see piece, cake."
const LITERAL_POINTER = /^used other than figuratively or idiomatically/i;

export function idiomNotFound(query: string): LookupError {
	return new LookupError('not-found', `No idioms found for "${query}".`);
}

interface SearchResponse {
	query?: { search?: { title?: string }[] };
}

/** Idioms that match the query, best match first. "spill beans" finds "spill the beans". */
export async function searchIdioms(query: string): Promise<string[]> {
	const data = await actionApi(
		HOST,
		{
			action: 'query',
			list: 'search',
			srsearch: `${query} incategory:${CATEGORY}`,
			srlimit: '20',
			srprop: '',
		},
		NAME,
	);
	if (apiErrorCode(data)) throw badResponse(NAME);
	return ((data as SearchResponse).query?.search ?? [])
		.map((result) => result.title ?? '')
		.filter(Boolean);
}

/** Meanings and origin of one idiom, by its exact Wiktionary title. */
export async function fetchIdiom(title: string): Promise<IdiomEntry> {
	let senses;
	let source;
	try {
		const entry = await wiktionary.lookup(title, { language: 'en', apiKey: '' });
		senses = entry.senses.filter((s) => !LITERAL_POINTER.test(s.definition));
		source = entry.source;
	} catch (err) {
		if (err instanceof LookupError && err.kind === 'not-found') throw idiomNotFound(title);
		throw err;
	}
	if (senses.length === 0) throw idiomNotFound(title);

	// The origin is a bonus: if it can't be loaded, the note is still useful.
	const origin = await fetchOrigin(title).catch((err: unknown) => {
		console.warn(`Dictionary Notes: could not load the origin of "${title}"`, err);
		return '';
	});

	return {
		idiom: title,
		senses,
		origin,
		source: {
			name: source.name,
			url: source.url,
			license: source.license,
			licenseUrl: source.licenseUrl,
		},
	};
}

interface SectionsResponse {
	parse?: { sections?: Section[] };
}
interface Section {
	index?: string;
	line?: string;
	level?: string;
}
interface TextResponse {
	parse?: { text?: string };
}

async function fetchOrigin(title: string): Promise<string> {
	const sections = await actionApi(HOST, { action: 'parse', page: title, prop: 'sections' }, NAME);
	if (apiErrorCode(sections)) return '';
	const index = englishEtymologySection((sections as SectionsResponse).parse?.sections ?? []);
	if (!index) return '';

	const text = await actionApi(
		HOST,
		{
			action: 'parse',
			page: title,
			section: index,
			prop: 'text',
			disableeditsection: '1',
			disablelimitreport: '1',
			disabletoc: '1',
		},
		NAME,
	);
	if (apiErrorCode(text)) return '';
	return etymologyText((text as TextResponse).parse?.text ?? '');
}

/** Index of the first "Etymology" section under the "English" heading. */
export function englishEtymologySection(sections: Section[]): string | undefined {
	let inEnglish = false;
	for (const section of sections) {
		if (section.level === '2') {
			inEnglish = section.line === 'English';
		} else if (inEnglish && section.line?.startsWith('Etymology')) {
			return section.index;
		}
	}
	return undefined;
}

/** The etymology paragraphs as plain text, without footnote markers or the reference list. */
export function etymologyText(html: string): string {
	const root = parseHtml(html);
	root.querySelectorAll('sup.reference, style').forEach((n) => n.remove());
	return collapseWhitespace(
		Array.from(root.querySelectorAll('p'))
			.map((p) => p.textContent ?? '')
			.join(' '),
	);
}
