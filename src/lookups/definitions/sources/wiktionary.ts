import { notFoundError } from '../../../core/errors';
import { elementText, htmlToText, parseHtml } from '../../../core/html';
import { badResponse, httpGet, parseJson } from '../../../core/http';
import { uniqueStrings } from '../../../core/utils';
import { WIKIMEDIA_HEADERS } from '../../../core/wikimedia';
import { Sense } from '../../senses';
import { DictionarySource, WordEntry } from '../types';

const NAME = 'Wiktionary';

// Shape of https://en.wiktionary.org/api/rest_v1/page/definition/{word}:
// an object keyed by language code; definitions are HTML snippets.
interface WkDefinition {
	definition?: string;
	examples?: string[];
}
interface WkUsage {
	partOfSpeech?: string;
	definitions?: WkDefinition[];
}
export type WkResponse = Record<string, WkUsage[] | undefined>;

export const wiktionary: DictionarySource = {
	id: 'wiktionary',
	name: NAME,
	async lookup(word, { language }) {
		const url = `https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(word)}`;
		const response = await httpGet(url, NAME, WIKIMEDIA_HEADERS);
		if (response.status === 404) throw notFoundError(word);
		if (response.status !== 200) throw badResponse(NAME);
		const entry = parseWiktionary(parseJson(response, NAME) as WkResponse, word, language);
		if (!entry) throw notFoundError(word);
		return entry;
	},
};

/** Returns null when there are no usable definitions in `language`. */
export function parseWiktionary(
	data: WkResponse,
	word: string,
	language: string,
): WordEntry | null {
	const senses: Sense[] = [];
	for (const usage of data[language] ?? []) {
		const partOfSpeech = (usage.partOfSpeech ?? '').toLowerCase();
		// The API lists every sub-sense twice: nested inside its parent's HTML and
		// again as its own definition. Use the nesting only to mark depth.
		let children = new Set<string>();
		for (const def of usage.definitions ?? []) {
			const { text, subsenses } = parseDefinitionHtml(def.definition ?? '');
			if (!text) continue;
			const depth = children.has(text) ? 1 : 0;
			if (depth === 0) children = new Set(subsenses);
			else subsenses.forEach((s) => children.add(s));
			const examples = uniqueStrings((def.examples ?? []).map(htmlToText));
			senses.push({ partOfSpeech, definition: text, examples, synonyms: [], antonyms: [], depth });
		}
	}
	if (senses.length === 0) return null;

	return {
		word,
		phonetic: '',
		audioUrl: '',
		etymology: '',
		senses,
		synonyms: [],
		antonyms: [],
		source: {
			id: 'wiktionary',
			name: NAME,
			url: `https://en.wiktionary.org/wiki/${encodeURIComponent(word.replace(/ /g, '_'))}`,
			license: 'CC BY-SA 4.0',
			licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
		},
	};
}

// Wiktionary definitions sometimes nest sub-senses in an <ol>.
function parseDefinitionHtml(html: string): { text: string; subsenses: string[] } {
	const root = parseHtml(html);
	const subsenses = Array.from(root.querySelectorAll(':scope > ol > li'))
		.map((li) => elementText(li))
		.filter(Boolean);
	return { text: elementText(root), subsenses };
}
