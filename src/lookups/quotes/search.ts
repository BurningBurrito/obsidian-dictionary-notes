import { LookupError } from '../../core/errors';
import { Quote, QuoteFound, QuoteStatus } from './types';
import { isHuman } from './wikidata';
import { fetchPage, findPages, PageMatch, searchPages } from './wikiquote';
import { containsWords, parseQuotes, sameQuote } from './wikiquote-parser';

// Keyword search reads this many result pages. Each costs two requests (the
// page and a person check), well within Wikimedia's limits.
const KEYWORD_PAGES = 4;

function noPage(query: string): LookupError {
	return new LookupError('not-found', `No Wikiquote page found for "${query}".`);
}

/** Every quote on a person's own page (their "Quotes about …" sections left out). */
export async function findByAuthor(query: string): Promise<QuoteFound> {
	const matches = exactFirst(await findPages(query), query).slice(0, 3);
	const first = matches[0];
	if (!first) throw noPage(query);

	let person: PageMatch | undefined;
	for (const match of matches) {
		if (await isHuman(match.wikidataId)) {
			person = match;
			break;
		}
	}
	// Only people: a topic page's quotes aren't by the topic.
	if (!person) {
		throw new LookupError(
			'not-found',
			`"${first.title}" isn't a person on Wikiquote. Try a keyword or topic search instead.`,
		);
	}

	const page = await fetchPage(person.title);
	if (!page) throw noPage(query);
	const quotes = parseQuotes(page.html, { page: page.title, isPerson: true, skipAbout: true });
	if (quotes.length === 0) {
		throw new LookupError('not-found', `No quotes found on the Wikiquote page for ${page.title}.`);
	}
	return { heading: `Quotes by ${page.title}`, quotes: byStatus(quotes) };
}

/** Every quote on a topic page, such as "Courage". */
export async function findByTopic(query: string): Promise<QuoteFound> {
	const match = exactFirst(await findPages(query), query)[0];
	if (!match) throw noPage(query);
	const page = await fetchPage(match.title);
	if (!page) throw noPage(query);
	// Someone may type a person's name here; their quotes are still by them.
	const person = await isHuman(page.wikidataId);
	const quotes = parseQuotes(page.html, { page: page.title, isPerson: person, skipAbout: person });
	if (quotes.length === 0) {
		throw new LookupError('not-found', `No quotes found on the Wikiquote page for ${page.title}.`);
	}
	if (!person) quotes.forEach((quote) => (quote.topics = [page.title]));
	return {
		heading: person ? `Quotes by ${page.title}` : `Quotes about ${page.title}`,
		quotes: byStatus(quotes),
	};
}

/**
 * Quotes containing all the words. Search ranks topic pages above people's
 * pages, so quotes are collected from several result pages. When the same quote
 * appears twice, the copy from the author's own page wins: it carries the status.
 */
export async function findByKeyword(query: string): Promise<QuoteFound> {
	const found: Quote[] = [];
	for (const title of (await searchPages(query)).slice(0, KEYWORD_PAGES)) {
		const page = await fetchPage(title);
		if (!page) continue;
		const person = await isHuman(page.wikidataId);
		for (const quote of parseQuotes(page.html, { page: page.title, isPerson: person })) {
			// A quote with neither an author nor a citation gives nothing to go on.
			if (!containsWords(quote, query) || (!quote.author && !quote.citation)) continue;
			const index = found.findIndex((other) => sameQuote(other.text, quote.text));
			if (index === -1) found.push(quote);
			else if (quote.onAuthorPage && !found[index]?.onAuthorPage) found[index] = quote;
		}
	}
	if (found.length === 0) throw new LookupError('not-found', `No quotes found for "${query}".`);
	return { heading: `Quotes with "${query}"`, quotes: byStatus(found) };
}

/**
 * A quote found on a topic page is checked on its author's own page, which says
 * whether it's sourced, attributed, disputed, or misattributed. Returns the
 * quote unchanged if the author's page doesn't have it.
 */
export async function checkOnAuthorPage(quote: Quote): Promise<Quote> {
	if (quote.onAuthorPage || !quote.authorPage) return quote;
	const page = await fetchPage(quote.authorPage);
	if (!page || !(await isHuman(page.wikidataId))) return quote;
	const match = parseQuotes(page.html, { page: page.title, isPerson: true, skipAbout: true }).find(
		(other) => sameQuote(other.text, quote.text),
	);
	if (!match) return quote;
	if (match.status === 'disputed' || match.status === 'misattributed') {
		// Point to the author's page, where the problem is explained.
		return { ...match, topics: quote.topics, links: quote.links.length ? quote.links : match.links };
	}
	return {
		...quote,
		status: match.status,
		work: quote.work || match.work,
		year: quote.year || match.year,
	};
}

const STATUS_ORDER: Record<QuoteStatus, number> = {
	sourced: 0,
	attributed: 1,
	disputed: 2,
	misattributed: 3,
	unsourced: 4,
};

/** Sourced quotes first, unsourced last; otherwise in page order (the sort is stable). */
function byStatus(quotes: Quote[]): Quote[] {
	return quotes.sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
}

function exactFirst(matches: PageMatch[], query: string): PageMatch[] {
	const q = query.trim().toLowerCase();
	return [
		...matches.filter((m) => m.title.toLowerCase() === q),
		...matches.filter((m) => m.title.toLowerCase() !== q),
	];
}
