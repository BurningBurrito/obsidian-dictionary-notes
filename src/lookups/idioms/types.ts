import type { LookupError } from '../../core/errors';
import type { Sense } from '../senses';

/** An idiom with its meanings, ready for a note. */
export interface IdiomEntry {
	idiom: string;
	senses: Sense[];
	/** Etymology text, or "" if the source has none. */
	origin: string;
	source: { name: string; url: string; license: string; licenseUrl: string };
}

/** What the search window found. */
export interface IdiomFound {
	query: string;
	/** Matching idioms, best match first. */
	candidates: string[];
	/** Set when the search already looked the idiom up (an exact match, or the backup source). */
	entry?: IdiomEntry;
	/** Set when Wiktionary failed and the backup source answered instead. */
	fallback?: LookupError;
}
