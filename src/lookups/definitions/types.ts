import { Sense } from '../senses';

/** Sources the user can choose as the main dictionary in settings. */
export type MainSourceId = 'free-dictionary' | 'wiktionary' | 'merriam-webster';
/** Every source; Wikcionario is used only for definitions written in Spanish. */
export type SourceId = MainSourceId | 'wikcionario';

/** Everything one dictionary source returned for a word. */
export interface WordEntry {
	word: string;
	/** Language code of the word, such as "en" or "es". */
	language: string;
	/** Language code the definitions are written in ("en", or "es" for Wikcionario). */
	explainedIn: string;
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
