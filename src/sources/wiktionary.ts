import { notFoundError } from '../errors';
import { DictionarySource, Sense, WordEntry } from '../types';
import { collapseWhitespace, uniqueStrings } from '../utils';
import { badResponse, httpGet, parseJson } from './http';

const NAME = 'Wiktionary';

// Wikimedia asks API clients to identify themselves.
// https://meta.wikimedia.org/wiki/User-Agent_policy
const API_USER_AGENT = 'DictionaryNotes (https://github.com/BurningBurrito/dictionary-notes)';

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
		const response = await httpGet(url, NAME, { 'Api-User-Agent': API_USER_AGENT });
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

// Wiktionary definitions sometimes nest sub-senses in an <ol>. DOMParser builds
// an inert document (no scripts run, no images load), so it's safe for reading text.
function parseDefinitionHtml(html: string): { text: string; subsenses: string[] } {
	const root = new DOMParser().parseFromString(html, 'text/html').body;
	const subsenses = Array.from(root.querySelectorAll(':scope > ol > li'))
		.map((li) => elementText(li))
		.filter(Boolean);
	return { text: elementText(root), subsenses };
}

function htmlToText(html: string): string {
	return elementText(new DOMParser().parseFromString(html, 'text/html').body);
}

/** Text of an element without its nested lists (sub-senses and quotations). */
function elementText(el: Element): string {
	const copy = el.cloneNode(true) as Element;
	copy.querySelectorAll('ol, ul, dl, style, sup.reference').forEach((n) => n.remove());
	return collapseWhitespace(copy.textContent ?? '');
}
