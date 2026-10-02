import { elementText, parseHtml } from '../../core/html';
import { collapseWhitespace, uniqueStrings } from '../../core/utils';
import { Quote, QuoteStatus } from './types';

// Reads quotes out of a Wikiquote page (the HTML from action=parse). Pages are
// written by hand, so this is best effort: anything it can't work out is left
// empty rather than guessed. The layout it relies on:
// - Quotes are top-level <ul> items. A nested item below a quote is its
//   citation (or, in Disputed and Misattributed sections, Wikiquote's note).
// - Section headings say how firm an attribution is: "Attributed", "Disputed",
//   "Misattributed". The last two usually sit inside a box with the class
//   "disputed-begin-frame" or "misattributed-begin-frame".
// - On a person's page the quotes are by that person, except in "Quotes about …".
//   On other pages (topics) the citation starts with a link to the author.

export interface ParseOptions {
	/** Title of the page being read. */
	page: string;
	/** Whether the page is about a person (then its quotes are by that person). */
	isPerson: boolean;
	/** Leave out "Quotes about …" sections (other people talking about the person). */
	skipAbout?: boolean;
}

type SectionKind = QuoteStatus | 'main' | 'about' | 'skip';

interface Heading {
	level: number;
	text: string;
	id: string;
}

// "Suggestions" holds editors' votes on date pages, not quotes.
const SKIPPED_SECTIONS = /^(see also|external links|references|notes|sources|bibliography|further reading|suggestions)\b/;
const ABOUT_SECTION = /^((quotes?|sayings?|comments?|statements?)\s+about|about)\s/;
const NOISE = /\b(noprint|navbox|toc|thumb|metadata|mw-references-wrap|reflist|hatnote|sisterproject|interproject)\b/;
const FRAME = /\b(misattributed|disputed|attributed|unsourced)-begin-frame\b/;
// Nested items that aren't a citation.
const NOT_A_CITATION = /^(variants?|also|alternat(e|ive)( version)?|translation|original|see also)\b/i;

export function parseQuotes(html: string, options: ParseOptions): Quote[] {
	const root = parseHtml(html);
	const quotes: Quote[] = [];
	walk(root.querySelector('.mw-parser-output') ?? root, [], undefined, options, quotes);
	return quotes;
}

function walk(
	container: Element,
	headings: Heading[],
	frame: QuoteStatus | undefined,
	options: ParseOptions,
	out: Quote[],
) {
	for (const el of Array.from(container.children)) {
		if (el.classList.contains('mw-heading') || /^H[2-6]$/.test(el.tagName)) {
			pushHeading(headings, el);
		} else if (el.tagName === 'UL') {
			for (const li of children(el, 'LI')) addQuote(li, headings, frame, options, out);
		} else if (el.tagName === 'DIV' && !NOISE.test(el.className)) {
			const box = FRAME.exec(el.className)?.[1] as QuoteStatus | undefined;
			// A box's heading ("Misattributed") only applies inside the box.
			walk(el, box ? [...headings] : headings, box ?? frame, options, out);
		}
	}
}

function pushHeading(headings: Heading[], el: Element) {
	const h = /^H[2-6]$/.test(el.tagName) ? el : el.querySelector('h2, h3, h4, h5, h6');
	if (!h) return;
	const level = Number(h.tagName[1]);
	while (headings.length && (headings[headings.length - 1]?.level ?? 0) >= level) headings.pop();
	headings.push({ level, text: collapseWhitespace(h.textContent ?? ''), id: h.id });
}

function sectionKind(headings: Heading[], frame: QuoteStatus | undefined): SectionKind {
	if (frame) return frame;
	let kind: SectionKind = 'main';
	// Deeper headings override: "Quotes" > "Attributed in posthumous publications".
	for (const { text } of headings) {
		const t = text.toLowerCase();
		if (SKIPPED_SECTIONS.test(t)) return 'skip';
		if (t.includes('misattributed')) kind = 'misattributed';
		else if (t.includes('disputed')) kind = 'disputed';
		else if (ABOUT_SECTION.test(t)) kind = 'about';
		else if (/\bunsourced\b/.test(t)) kind = 'unsourced';
		else if (/\battributed\b/.test(t)) kind = 'attributed';
	}
	return kind;
}

function addQuote(
	li: Element,
	headings: Heading[],
	frame: QuoteStatus | undefined,
	options: ParseOptions,
	out: Quote[],
) {
	const kind = sectionKind(headings, frame);
	if (kind === 'skip' || (kind === 'about' && options.skipAbout)) return;

	// A quote in another language is in italics, with the English translation
	// as the first nested item and the citation after it.
	const items = nestedItems(li);
	const translation = items[0] && isAllItalic(li) && isTranslation(items[0]) ? items[0] : undefined;
	const text = translation ? quoteText(translation) : quoteText(li);
	if (text.length < 3) return;

	const sub = items[translation ? 1 : 0];
	const subText = sub ? elementText(sub) : '';
	const onAuthorPage = options.isPerson && kind !== 'about';
	const { author, authorPage } = onAuthorPage
		? { author: personName(options.page), authorPage: options.page }
		: citedAuthor(sub);

	let status: QuoteStatus;
	if (kind === 'main' || kind === 'about') status = onAuthorPage || sub ? 'sourced' : 'unsourced';
	else status = kind;

	// In Disputed and Misattributed sections the nested item explains the
	// problem; it isn't a source for the quote.
	const doubtful = status === 'disputed' || status === 'misattributed';
	const fromHeading = onAuthorPage && !doubtful ? headingSource(headings) : { work: '', year: '' };

	out.push({
		text,
		original: translation ? quoteText(li) : '',
		author,
		authorPage,
		citation: doubtful ? '' : subText,
		work: (!doubtful && sub ? citedWork(sub) : '') || fromHeading.work,
		year: (!doubtful ? findYear(subText) : '') || fromHeading.year,
		status,
		note: doubtful ? subText : '',
		links: quoteLinks(li, authorPage),
		topics: [],
		page: options.page,
		anchor: headings[headings.length - 1]?.id ?? '',
		onAuthorPage,
	});
}

function children(el: Element, tag: string): Element[] {
	return Array.from(el.children).filter((child) => child.tagName === tag);
}

/** A copy of an element without its nested lists, footnote markers, and styles. */
function ownContent(el: Element): Element {
	const copy = el.cloneNode(true) as Element;
	copy.querySelectorAll('ul, ol, dl, sup.reference, style').forEach((n) => n.remove());
	return copy;
}

/** The quote itself, with lines of verse joined by " / ". */
function quoteText(li: Element): string {
	const copy = ownContent(li);
	copy.querySelectorAll('br').forEach((br) => br.replaceWith(br.ownerDocument.createTextNode('\n')));
	return (copy.textContent ?? '')
		.split('\n')
		.map(collapseWhitespace)
		.filter(Boolean)
		.join(' / ');
}

/** Nested items below a quote, without variants and labeled translations. */
function nestedItems(li: Element): Element[] {
	return children(li, 'UL')
		.flatMap((ul) => children(ul, 'LI'))
		.filter((sub) => {
			const text = elementText(sub);
			return text && !NOT_A_CITATION.test(text);
		});
}

/** Whether all of an item's own text is in italics (how quotes in other languages are shown). */
function isAllItalic(li: Element): boolean {
	const own = ownContent(li);
	const all = normalizeText(own.textContent ?? '');
	const italic = normalizeText(
		Array.from(own.querySelectorAll('i'))
			.map((i) => i.textContent ?? '')
			.join(' '),
	);
	return all.length > 0 && all === italic;
}

/** A translation reads like a sentence: it doesn't start with a link or contain a year like a citation. */
function isTranslation(sub: Element): boolean {
	return sub.firstElementChild?.tagName !== 'A' && !findYear(elementText(sub));
}

/** "John Smith (actor)" -> "John Smith" */
function personName(page: string): string {
	return page.replace(/\s*\([^)]*\)$/, '');
}

/**
 * On topic pages a citation starts with a link to the author's page:
 * "[[Joseph Addison]], Cato, A Tragedy (1713)". Without that link the author
 * is left unknown rather than guessed from the text. A link to a page that
 * doesn't exist yet (a "red link") still names the author, but there's no
 * page to check the attribution on.
 */
function citedAuthor(sub: Element | undefined): { author: string; authorPage: string } {
	const link = sub?.firstElementChild;
	if (!sub || link?.tagName !== 'A') return { author: '', authorPage: '' };
	const name = collapseWhitespace(link.textContent ?? '');
	if (!name || !elementText(sub).startsWith(name)) return { author: '', authorPage: '' };
	if (link.classList.contains('new')) return { author: name, authorPage: '' };
	const title = link.getAttribute('title') ?? '';
	const isWikiPage = (link.getAttribute('href') ?? '').startsWith('/wiki/') && !title.includes(':');
	return isWikiPage ? { author: name, authorPage: title } : { author: '', authorPage: '' };
}

/** The work in a citation: its italic title, or a title in quotation marks. */
function citedWork(sub: Element): string {
	const italic = collapseWhitespace(ownContent(sub).querySelector('i')?.textContent ?? '');
	if (italic) return italic.slice(0, 150);
	const quoted = /[“"]([^”"]{3,150})[”"]/.exec(elementText(sub));
	return quoted?.[1]?.trim() ?? '';
}

/** A year in a citation, preferring one in parentheses: "(4 December 1926)" -> "1926". */
export function findYear(text: string): string {
	const cleaned = text.replace(/ISBN[\s:]*[\dXx -]+/g, '');
	const inParens = /\([^()]*?\b(1\d{3}|20\d{2})\b[^()]*\)/.exec(cleaned);
	if (inParens?.[1]) return inParens[1];
	// Skip page and issue numbers such as "p. 1234" or "No. 1050".
	return /(?<!\b(?:p|pp|no|vol|nr)\.?\s?)\b(1\d{3}|20\d{2})\b/i.exec(cleaned)?.[1] ?? '';
}

/**
 * Person pages often group quotes under a heading for the work:
 * "Principles of Research (1918)" -> work and year. Decades ("1920s") and
 * headings like "Quotes" don't count.
 */
function headingSource(headings: Heading[]): { work: string; year: string } {
	for (let i = headings.length - 1; i >= 0; i--) {
		const heading = headings[i];
		if (!heading || heading.level < 3) break;
		const text = heading.text;
		if (/^\d{4}$/.test(text)) return { work: '', year: text };
		const titled = /^(.+?)\s*\((?:c\.\s*)?(\d{4})(?:\s*[–-]\s*\d{2,4})?\)$/.exec(text);
		if (titled?.[1] && titled[2]) return { work: titled[1], year: titled[2] };
	}
	return { work: '', year: '' };
}

/** Wikiquote pages linked inside the quote (subjects such as "Soul"), minus the author. */
function quoteLinks(li: Element, authorPage: string): string[] {
	const titles = Array.from(ownContent(li).querySelectorAll('a[href^="/wiki/"]'))
		.filter((a) => !a.classList.contains('new'))
		.map((a) => a.getAttribute('title') ?? '')
		.filter((title) => title && !title.includes(':') && title !== authorPage);
	return uniqueStrings(titles);
}

/** Lowercase words only, for comparing and searching quote text. */
export function normalizeText(text: string): string {
	return text
		.toLowerCase()
		.replace(/[‘’`]/g, "'")
		.replace(/[^\p{L}\p{N}']+/gu, ' ')
		.trim();
}

/** Whether a quote contains every word of the query (each as the start of a word). */
export function containsWords(quote: Quote, query: string): boolean {
	const text = ` ${normalizeText(quote.text)}`;
	return normalizeText(query)
		.split(' ')
		.filter(Boolean)
		.every((word) => text.includes(` ${word}`));
}

/** Whether two quote texts are the same quote, allowing for one being an excerpt of the other. */
export function sameQuote(a: string, b: string): boolean {
	const x = normalizeText(a).replace(/[\s']/g, '');
	const y = normalizeText(b).replace(/[\s']/g, '');
	if (x === y) return true;
	return Math.min(x.length, y.length) >= 20 && (x.includes(y) || y.includes(x));
}
