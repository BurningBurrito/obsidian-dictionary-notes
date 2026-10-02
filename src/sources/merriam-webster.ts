import { LookupError, notFoundError } from '../errors';
import { DictionarySource, Sense, WordEntry } from '../types';
import { collapseWhitespace, uniqueStrings } from '../utils';
import { badResponse, httpGet } from './http';

const NAME = 'Merriam-Webster';

// Shape of https://www.dictionaryapi.com/api/v3/references/collegiate/json/{word}?key=...
// Documented at https://dictionaryapi.com/products/json
type MwTuple = [string, unknown];
interface MwSense {
	sn?: string;
	dt?: MwTuple[];
}
interface MwEntry {
	meta?: { id?: string; stems?: string[] };
	hwi?: { hw?: string; prs?: { mw?: string; sound?: { audio?: string } }[] };
	fl?: string;
	def?: { sseq?: MwTuple[][] }[];
	et?: MwTuple[];
	shortdef?: string[];
}

export const merriamWebster: DictionarySource = {
	id: 'merriam-webster',
	name: NAME,
	async lookup(word, { apiKey }) {
		if (!apiKey) {
			throw new LookupError(
				'config',
				'Merriam-Webster needs an API key. Add one in the Dictionary Notes settings, or choose another dictionary source.',
			);
		}
		const url = `https://www.dictionaryapi.com/api/v3/references/collegiate/json/${encodeURIComponent(word)}?key=${encodeURIComponent(apiKey)}`;
		const response = await httpGet(url, NAME);

		// Key problems come back as plain text, sometimes with status 200.
		const body = response.text.trim();
		if (/key/i.test(body) && !body.startsWith('[')) {
			throw new LookupError(
				'config',
				'Merriam-Webster rejected the API key. Check the key in the Dictionary Notes settings.',
			);
		}
		if (response.status !== 200) throw badResponse(NAME);

		let data: unknown;
		try {
			data = JSON.parse(body);
		} catch {
			throw badResponse(NAME);
		}
		if (!Array.isArray(data)) throw badResponse(NAME);

		// Not found: MW returns spelling suggestions (an array of strings).
		if (data.every((item): item is string => typeof item === 'string')) {
			throw notFoundError(word, data.slice(0, 8));
		}
		const entry = parseMerriamWebster(data as MwEntry[], word);
		if (!entry) throw notFoundError(word);
		return entry;
	},
};

/** Returns null when there are no usable definitions. */
export function parseMerriamWebster(data: MwEntry[], query: string): WordEntry | null {
	const all = data.filter((e): e is MwEntry => typeof e === 'object' && e !== null);
	const q = query.toLowerCase();
	// MW also returns phrases ("run across", "run-in"); keep entries for this exact word,
	// falling back to entries that list it as an inflection ("ran" -> "run").
	let entries = all.filter((e) => headword(e).toLowerCase() === q);
	if (entries.length === 0) {
		entries = all.filter((e) => e.meta?.stems?.some((s) => s.toLowerCase() === q));
	}
	if (entries.length === 0) entries = all.slice(0, 1);

	const senses: Sense[] = [];
	for (const entry of entries) {
		const partOfSpeech = entry.fl ?? '';
		const before = senses.length;
		for (const block of entry.def ?? []) {
			for (const sequence of block.sseq ?? []) walkSequence(sequence, partOfSpeech, senses);
		}
		// Some entries have no detailed senses; fall back to the short definitions.
		if (senses.length === before) {
			for (const d of entry.shortdef ?? []) {
				const definition = cleanMarkup(d);
				if (definition) senses.push(makeSense(partOfSpeech, definition, [], 0));
			}
		}
	}
	if (senses.length === 0) return null;

	const first = entries[0];
	const word = (first && headword(first)) || query;
	const pronunciation = entries.flatMap((e) => e.hwi?.prs ?? []).find((p) => p.mw);
	const etymology = entries
		.flatMap((e) => e.et ?? [])
		.filter(([type]) => type === 'text')
		.map(([, text]) => cleanMarkup(String(text)))
		.find(Boolean);

	return {
		word,
		phonetic: pronunciation?.mw ? `\\${pronunciation.mw}\\` : '',
		audioUrl: audioUrl(pronunciation?.sound?.audio),
		etymology: etymology ?? '',
		senses,
		synonyms: [],
		antonyms: [],
		source: {
			id: 'merriam-webster',
			name: "Merriam-Webster's Collegiate Dictionary",
			url: `https://www.merriam-webster.com/dictionary/${encodeURIComponent(word)}`,
			license: '© Merriam-Webster, Inc.',
			licenseUrl: 'https://dictionaryapi.com/info/terms-of-service',
		},
	};
}

function headword(entry: MwEntry): string {
	return (entry.hwi?.hw ?? entry.meta?.id?.split(':')[0] ?? '').replace(/\*/g, '');
}

// A sense sequence holds "sense" items, plus "bs" (binding sense) and
// "pseq" (parenthesized sequence) wrappers that contain more senses.
function walkSequence(items: MwTuple[], partOfSpeech: string, out: Sense[]) {
	for (const [type, data] of items) {
		if (type === 'sense' || type === 'sen') {
			addSense(data as MwSense, partOfSpeech, out);
		} else if (type === 'bs') {
			addSense((data as { sense?: MwSense }).sense ?? {}, partOfSpeech, out);
		} else if (type === 'pseq' && Array.isArray(data)) {
			walkSequence(data as MwTuple[], partOfSpeech, out);
		}
	}
}

function addSense(sense: MwSense, partOfSpeech: string, out: Sense[]) {
	const texts: string[] = [];
	const examples: string[] = [];
	for (const [type, content] of sense.dt ?? []) {
		if (type === 'text') texts.push(cleanMarkup(String(content)));
		if (type === 'vis' && Array.isArray(content)) {
			for (const vis of content as { t?: string }[]) examples.push(cleanMarkup(vis.t ?? ''));
		}
	}
	const definition = collapseWhitespace(texts.join(' '));
	if (!definition) return;
	// Sense numbers look like "1", "1 a", or "b"; anything but a bare number is a sub-sense.
	const depth = !sense.sn || /^\d+$/.test(sense.sn.trim()) ? 0 : 1;
	out.push(makeSense(partOfSpeech, definition, uniqueStrings(examples), depth));
}

function makeSense(partOfSpeech: string, definition: string, examples: string[], depth: 0 | 1): Sense {
	return { partOfSpeech, definition, examples, synonyms: [], antonyms: [], depth };
}

/** Convert Merriam-Webster's {token} markup to plain text. */
export function cleanMarkup(text: string): string {
	return collapseWhitespace(
		text
			// Cross-reference sections ("see also ...") don't belong in a definition.
			.replace(/\{dx\}.*?\{\/dx\}/g, '')
			.replace(/\{ldquo\}/g, '“')
			.replace(/\{rdquo\}/g, '”')
			// Link tokens such as {sx|word||} or {a_link|word}: keep the visible word.
			.replace(/\{(?:a_link|d_link|i_link|et_link|mat|sx|dxt|ma)\|([^|}]*)[^}]*\}/g, '$1')
			// Any remaining formatting token ({bc}, {it}, {/it}, {wi}, ...).
			.replace(/\{[^}]*\}/g, ' '),
	)
		.replace(/^[:\s]+/, '')
		.replace(/\s+([,.;:])/g, '$1');
}

// https://dictionaryapi.com/products/json#sec-2.prs
function audioUrl(audio: string | undefined): string {
	if (!audio) return '';
	let subdir = audio[0] ?? '';
	if (audio.startsWith('bix')) subdir = 'bix';
	else if (audio.startsWith('gg')) subdir = 'gg';
	else if (!/^[a-z]/i.test(audio)) subdir = 'number';
	return `https://media.merriam-webster.com/audio/prons/en/us/mp3/${subdir}/${audio}.mp3`;
}
