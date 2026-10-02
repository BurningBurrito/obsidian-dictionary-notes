export type SourceId = 'free-dictionary' | 'wiktionary' | 'merriam-webster';

/** One meaning of a word, e.g. "run" as a verb meaning "to move swiftly". */
export interface Sense {
	partOfSpeech: string;
	definition: string;
	examples: string[];
	synonyms: string[];
	antonyms: string[];
	/** 0 for a main sense, 1 for a sub-sense of the main sense before it. */
	depth: 0 | 1;
}

/** Everything one dictionary source returned for a word. */
export interface WordEntry {
	word: string;
	phonetic: string;
	audioUrl: string;
	etymology: string;
	senses: Sense[];
	/** Word-level synonyms and antonyms, merged from all senses. */
	synonyms: string[];
	antonyms: string[];
	source: SourceInfo;
}

/** Where an entry came from, for attribution in the note. */
export interface SourceInfo {
	id: SourceId;
	name: string;
	/** Page for this word on the source's website. */
	url: string;
	license: string;
	licenseUrl: string;
}

export interface LookupOptions {
	/** Wiktionary language code such as "en"; ignored by Merriam-Webster. */
	language: string;
	apiKey: string;
}

export interface DictionarySource {
	id: SourceId;
	name: string;
	/** Resolves with an entry that has at least one sense, or rejects with a LookupError. */
	lookup(word: string, options: LookupOptions): Promise<WordEntry>;
}
