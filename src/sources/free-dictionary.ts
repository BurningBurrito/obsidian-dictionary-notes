import { notFoundError } from '../errors';
import { DictionarySource, Sense, WordEntry } from '../types';
import { collapseWhitespace, uniqueStrings } from '../utils';
import { badResponse, httpGet, parseJson } from './http';

const NAME = 'Free Dictionary API';

// Shape of https://freedictionaryapi.com/api/v1/entries/{language}/{word}
// Every field is optional here because we don't control the API.
interface FdSense {
	definition?: string;
	examples?: string[];
	quotes?: { text?: string }[];
	synonyms?: string[];
	antonyms?: string[];
	subsenses?: FdSense[];
}
interface FdEntry {
	partOfSpeech?: string;
	pronunciations?: { type?: string; text?: string }[];
	senses?: FdSense[];
	synonyms?: string[];
	antonyms?: string[];
}
export interface FdResponse {
	word?: string;
	entries?: FdEntry[];
	source?: { url?: string; license?: { name?: string; url?: string } };
}

export const freeDictionary: DictionarySource = {
	id: 'free-dictionary',
	name: NAME,
	async lookup(word, { language }) {
		const url = `https://freedictionaryapi.com/api/v1/entries/${encodeURIComponent(language)}/${encodeURIComponent(word)}`;
		const response = await httpGet(url, NAME);
		if (response.status !== 200) throw badResponse(NAME);
		const entry = parseFreeDictionary(parseJson(response, NAME) as FdResponse, word);
		if (!entry) throw notFoundError(word);
		return entry;
	},
};

/** Returns null when the response has no usable definitions. */
export function parseFreeDictionary(data: FdResponse, query: string): WordEntry | null {
	const word = data.word ?? query;
	const entries = Array.isArray(data.entries) ? data.entries : [];

	const senses: Sense[] = [];
	for (const entry of entries) {
		const partOfSpeech = entry.partOfSpeech ?? '';
		for (const sense of entry.senses ?? []) {
			pushSense(senses, sense, partOfSpeech, 0);
			for (const sub of sense.subsenses ?? []) {
				pushSense(senses, sub, partOfSpeech, 1);
			}
		}
	}
	if (senses.length === 0) return null;

	const phonetic =
		entries
			.flatMap((e) => e.pronunciations ?? [])
			.find((p) => p.type === 'ipa' && p.text)?.text ?? '';

	return {
		word,
		phonetic,
		audioUrl: '',
		etymology: '',
		senses,
		synonyms: uniqueStrings(
			[...entries.flatMap((e) => e.synonyms ?? []), ...senses.flatMap((s) => s.synonyms)],
			[word],
		),
		antonyms: uniqueStrings(
			[...entries.flatMap((e) => e.antonyms ?? []), ...senses.flatMap((s) => s.antonyms)],
			[word],
		),
		source: {
			id: 'free-dictionary',
			name: `${NAME} (Wiktionary)`,
			url:
				data.source?.url ??
				`https://en.wiktionary.org/wiki/${encodeURIComponent(word)}`,
			license: data.source?.license?.name ?? 'CC BY-SA 4.0',
			licenseUrl:
				data.source?.license?.url ?? 'https://creativecommons.org/licenses/by-sa/4.0/',
		},
	};
}

function pushSense(senses: Sense[], raw: FdSense, partOfSpeech: string, depth: 0 | 1) {
	const definition = collapseWhitespace(raw.definition ?? '');
	if (!definition) return;
	const examples = raw.examples?.length
		? raw.examples
		: (raw.quotes ?? []).map((q) => q.text ?? '');
	senses.push({
		partOfSpeech,
		definition,
		examples: uniqueStrings(examples.map(collapseWhitespace)),
		synonyms: uniqueStrings(raw.synonyms ?? []),
		antonyms: uniqueStrings(raw.antonyms ?? []),
		depth,
	});
}
