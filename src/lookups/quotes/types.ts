/**
 * How firmly Wikiquote attributes a quote to its author:
 * - sourced: in the main quotes, or cited on a topic page
 * - attributed: in an "Attributed" section (no confirmed original source)
 * - disputed / misattributed: in those sections of the author's page
 * - unsourced: on a topic page with no citation
 */
export type QuoteStatus = 'sourced' | 'attributed' | 'disputed' | 'misattributed' | 'unsourced';

export type QuoteSearchMode = 'keyword' | 'author' | 'topic';

export interface Quote {
	/** The quote (in English). Lines of verse are joined with " / ". */
	text: string;
	/** The quote in its original language, when Wikiquote gives an English translation. */
	original: string;
	/** Who it's credited to, or "" if unknown. */
	author: string;
	/** Wikiquote page of the author, if known (for checking the attribution there). */
	authorPage: string;
	/** Wikiquote's citation line as text, e.g. "Letter to Max Born (4 December 1926)". */
	citation: string;
	work: string;
	year: string;
	status: QuoteStatus;
	/** Wikiquote's explanation for a disputed or misattributed quote. */
	note: string;
	/** Wikiquote pages linked inside the quote, such as "Soul" or "Duty". */
	links: string[];
	/** Topics to tag the note with, e.g. the topic that was searched. */
	topics: string[];
	/** Where the quote was found: page title and section anchor. */
	page: string;
	anchor: string;
	/** True when found on the author's own page (so the status is already known). */
	onAuthorPage: boolean;
}

/** What the search window found. */
export interface QuoteFound {
	/** Describes the results in the picker, e.g. 'Quotes by Mark Twain'. */
	heading: string;
	quotes: Quote[];
}
