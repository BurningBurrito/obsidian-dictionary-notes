import { badResponse } from '../../core/http';
import { actionApi, apiErrorCode } from '../../core/wikimedia';

// English only for now. Other languages have their own wikis, such as es.wikiquote.org.
export const WIKIQUOTE_HOST = 'en.wikiquote.org';
const NAME = 'Wikiquote';

export interface WikiquotePage {
	/** The page's title after following redirects. */
	title: string;
	html: string;
	/** The page's Wikidata item, such as "Q937", or "". */
	wikidataId: string;
}

export interface PageMatch {
	title: string;
	wikidataId: string;
}

interface ParseResponse {
	parse?: { title?: string; text?: string; properties?: Record<string, string> };
}

/** A page's HTML and Wikidata item, following redirects. Null if there's no such page. */
export async function fetchPage(title: string): Promise<WikiquotePage | null> {
	const data = await actionApi(
		WIKIQUOTE_HOST,
		{
			action: 'parse',
			page: title,
			prop: 'text|properties',
			redirects: '1',
			disableeditsection: '1',
			disablelimitreport: '1',
			disabletoc: '1',
		},
		NAME,
	);
	const code = apiErrorCode(data);
	if (code === 'missingtitle' || code === 'invalidtitle') return null;
	if (code) throw badResponse(NAME);
	const parse = (data as ParseResponse).parse;
	if (!parse?.text) throw badResponse(NAME);
	return {
		title: parse.title ?? title,
		html: parse.text,
		wikidataId: parse.properties?.wikibase_item ?? '',
	};
}

interface PagesResponse {
	query?: {
		pages?: {
			title?: string;
			index?: number;
			pageprops?: { disambiguation?: string; wikibase_item?: string };
		}[];
	};
}

/**
 * Pages for a name or topic, best match first. Titles starting with the query
 * come first ("einstein" finds Albert Einstein through its redirect); if there
 * are none, a full-text search ("twain" finds Mark Twain).
 */
export async function findPages(query: string): Promise<PageMatch[]> {
	const byPrefix = await pageQuery({ generator: 'prefixsearch', gpssearch: query, gpslimit: '8' });
	if (byPrefix.length) return byPrefix;
	return pageQuery({ generator: 'search', gsrsearch: query, gsrlimit: '8', gsrnamespace: '0' });
}

async function pageQuery(generator: Record<string, string>): Promise<PageMatch[]> {
	const data = await actionApi(
		WIKIQUOTE_HOST,
		{
			action: 'query',
			...generator,
			redirects: '1',
			prop: 'pageprops',
			ppprop: 'disambiguation|wikibase_item',
		},
		NAME,
	);
	if (apiErrorCode(data)) throw badResponse(NAME);
	return ((data as PagesResponse).query?.pages ?? [])
		.filter((page) => page.title && page.pageprops?.disambiguation === undefined)
		.sort((a, b) => (a.index ?? Infinity) - (b.index ?? Infinity))
		.map((page) => ({ title: page.title ?? '', wikidataId: page.pageprops?.wikibase_item ?? '' }));
}

interface SearchResponse {
	query?: { search?: { title?: string }[] };
}

/** Pages containing the words, best match first. Tries the exact phrase first. */
export async function searchPages(query: string): Promise<string[]> {
	if (query.includes(' ')) {
		const exact = await fullTextSearch(`"${query.replace(/"/g, '')}"`);
		if (exact.length) return exact;
	}
	return fullTextSearch(query);
}

async function fullTextSearch(srsearch: string): Promise<string[]> {
	const data = await actionApi(
		WIKIQUOTE_HOST,
		{ action: 'query', list: 'search', srsearch, srlimit: '10', srprop: '' },
		NAME,
	);
	if (apiErrorCode(data)) throw badResponse(NAME);
	return ((data as SearchResponse).query?.search ?? [])
		.map((result) => result.title ?? '')
		.filter(Boolean);
}
