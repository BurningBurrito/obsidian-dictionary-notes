import { LookupError, notFoundError, toLookupError } from '../../../core/errors';
import { DictionarySource, LookupOptions, MainSourceId, WordEntry } from '../types';
import { freeDictionary } from './free-dictionary';
import { merriamWebster } from './merriam-webster';
import { wiktionary } from './wiktionary';

const SOURCES: Record<MainSourceId, DictionarySource> = {
	'free-dictionary': freeDictionary,
	wiktionary: wiktionary,
	'merriam-webster': merriamWebster,
};

/** Labels for the source dropdown in settings. */
export const SOURCE_OPTIONS: Record<MainSourceId, string> = {
	'free-dictionary': 'Free Dictionary API (no key needed)',
	wiktionary: 'Wiktionary',
	'merriam-webster': 'Merriam-Webster (API key required)',
};

export function isSourceId(value: unknown): value is MainSourceId {
	return typeof value === 'string' && value in SOURCES;
}

export interface LookupResult {
	entry: WordEntry;
	/** Set when the main source failed and the backup source answered instead. */
	fallback?: { sourceName: string; error: LookupError };
}

export async function lookupWord(
	word: string,
	sourceId: MainSourceId,
	options: LookupOptions,
	useFallback: boolean,
): Promise<LookupResult> {
	const backup = SOURCES[sourceId === 'wiktionary' ? 'free-dictionary' : 'wiktionary'];
	return lookupWithBackup(
		word,
		{ source: SOURCES[sourceId], options },
		useFallback ? { source: backup, options } : undefined,
	);
}

export interface SourceCall {
	source: DictionarySource;
	options: LookupOptions;
}

/** Look a word up in one source, and in a backup source if that fails. */
export async function lookupWithBackup(
	word: string,
	primary: SourceCall,
	backup: SourceCall | undefined,
): Promise<LookupResult> {
	try {
		return { entry: await lookupAnyCase(primary.source, word, primary.options) };
	} catch (err) {
		const error = toLookupError(err);
		// Offline means the backup would fail the same way.
		if (!backup || error.kind === 'offline') throw error;
		try {
			const entry = await lookupAnyCase(backup.source, word, backup.options);
			return { entry, fallback: { sourceName: primary.source.name, error } };
		} catch {
			// The main source's error is the one the user can act on.
			throw error;
		}
	}
}

/**
 * Sources are case-sensitive ("Paris" vs "paris"), so try the word as typed,
 * then in lowercase if that finds nothing.
 */
async function lookupAnyCase(
	source: DictionarySource,
	word: string,
	options: LookupOptions,
): Promise<WordEntry> {
	try {
		return await source.lookup(word, options);
	} catch (err) {
		const lower = word.toLowerCase();
		if (!(err instanceof LookupError) || err.kind !== 'not-found' || lower === word) {
			throw err;
		}
		try {
			return await source.lookup(lower, options);
		} catch (retryErr) {
			if (retryErr instanceof LookupError && retryErr.kind === 'not-found') {
				throw notFoundError(word, err.suggestions.length ? err.suggestions : retryErr.suggestions);
			}
			throw retryErr;
		}
	}
}
