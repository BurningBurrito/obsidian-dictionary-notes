import { badResponse, httpGet, parseJson } from '../../core/http';
import { collapseWhitespace, uniqueStrings } from '../../core/utils';
import { wikiPageUrl } from '../../core/wikimedia';
import type { Sense } from '../senses';
import { IdiomEntry } from './types';
import { idiomNotFound } from './wiktionary-idioms';

const NAME = 'Free Dictionary API';

// Shape of https://freedictionaryapi.com/api/v1/entries/en/{phrase}. Senses carry
// tags such as "idiomatic", which is how idiom meanings are told apart from
// literal ones. Every field is optional because we don't control the API.
interface FdSense {
	definition?: string;
	tags?: string[];
	examples?: string[];
	quotes?: { text?: string }[];
	subsenses?: FdSense[];
}
interface FdResponse {
	word?: string;
	entries?: { partOfSpeech?: string; senses?: FdSense[] }[];
	source?: { url?: string; license?: { name?: string; url?: string } };
}

/**
 * Backup source: look up the exact phrase and keep only its idiomatic meanings.
 * There's no search, so this only finds an idiom typed in full.
 */
export async function lookupIdiomFreeDictionary(phrase: string): Promise<IdiomEntry> {
	const url = `https://freedictionaryapi.com/api/v1/entries/en/${encodeURIComponent(phrase)}`;
	const response = await httpGet(url, NAME);
	if (response.status === 404) throw idiomNotFound(phrase);
	if (response.status !== 200) throw badResponse(NAME);
	const data = parseJson(response, NAME) as FdResponse;

	const senses: Sense[] = [];
	for (const entry of data.entries ?? []) {
		for (const sense of entry.senses ?? []) {
			const parent = pushIdiomatic(senses, sense, entry.partOfSpeech ?? '', 0);
			for (const sub of sense.subsenses ?? []) {
				pushIdiomatic(senses, sub, entry.partOfSpeech ?? '', parent ? 1 : 0);
			}
		}
	}
	if (senses.length === 0) throw idiomNotFound(phrase);

	const idiom = data.word ?? phrase;
	return {
		idiom,
		senses,
		origin: '',
		source: {
			name: `${NAME} (Wiktionary)`,
			// Built here because the API's URL isn't encoded (raw spaces would break a Markdown link).
			url: wikiPageUrl('en.wiktionary.org', idiom),
			license: data.source?.license?.name ?? 'CC BY-SA 4.0',
			licenseUrl: data.source?.license?.url ?? 'https://creativecommons.org/licenses/by-sa/4.0/',
		},
	};
}

/** Add a sense if it's tagged idiomatic. Returns whether it was added. */
function pushIdiomatic(senses: Sense[], raw: FdSense, partOfSpeech: string, depth: 0 | 1): boolean {
	const definition = withoutIdiomaticLabel(collapseWhitespace(raw.definition ?? ''));
	if (!definition || !raw.tags?.includes('idiomatic')) return false;
	const examples = raw.examples?.length ? raw.examples : (raw.quotes ?? []).map((q) => q.text ?? '');
	senses.push({
		partOfSpeech,
		definition,
		examples: uniqueStrings(examples.map(collapseWhitespace)),
		synonyms: [],
		antonyms: [],
		depth,
	});
	return true;
}

/**
 * Every meaning of an idiom is idiomatic, so drop that label:
 * "(idiomatic, colloquial) To die." -> "(colloquial) To die."
 */
export function withoutIdiomaticLabel(definition: string): string {
	return definition.replace(/^\(([^)]*)\)\s*/, (_match, labels: string) => {
		const rest = labels
			.split(',')
			.map((label) => label.trim())
			.filter((label) => label && label.toLowerCase() !== 'idiomatic');
		return rest.length ? `(${rest.join(', ')}) ` : '';
	});
}
