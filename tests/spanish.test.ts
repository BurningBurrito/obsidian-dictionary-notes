// Spanish definitions: written in Spanish (Wikcionario) or explained in English.
import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { definitions, DefinitionItem, DefinitionsFound } from '../src/lookups/definitions';
import { parseFreeDictionary } from '../src/lookups/definitions/sources/free-dictionary';
import { spanishSuggestions, wikcionario } from '../src/lookups/definitions/sources/wikcionario';
import type DictionaryNotesPlugin from '../src/main';
import { DictionaryNotesSettings, sanitizeSettings } from '../src/settings';
import { fake, resetNetwork } from './support/network';

const plugin = (saved: Partial<DictionaryNotesSettings> = {}) =>
	({ settings: sanitizeSettings(saved), getApiKey: () => '' }) as unknown as DictionaryNotesPlugin;
const es = { language: 'es', apiKey: '' };
const item = (found: DefinitionsFound): DefinitionItem => ({ ...found.entry, mode: found.mode });

describe('Wikcionario (definitions written in Spanish)', () => {
	beforeEach(resetNetwork);

	it('reads definitions, label, pronunciation, origin, and examples', async () => {
		const entry = await wikcionario.lookup('canción', es);
		assert.equal(entry.word, 'canción');
		assert.equal(entry.language, 'es');
		assert.equal(entry.explainedIn, 'es');
		assert.equal(entry.phonetic, '[kãnˈsjõn]');
		assert.equal(entry.etymology, 'Semicultismo del latín cantiō.');
		assert.equal(entry.senses[0]?.partOfSpeech, 'sustantivo femenino');
		assert.equal(entry.senses[0]?.definition, '(Música) Composición musical que se canta.');
		assert.match(entry.senses[0]?.examples[0] ?? '', /^Adele ha sido oscarizada/);
		assert.equal(entry.source.name, 'Wikcionario');
		assert.equal(entry.source.url, 'https://es.wiktionary.org/wiki/canci%C3%B3n#Espa%C3%B1ol');
	});

	it('reads every definition with its synonyms and antonyms', async () => {
		const entry = await wikcionario.lookup('correr', es);
		assert.ok(entry.senses.length > 30);
		const busy = entry.senses.find((s) => s.definition.startsWith('Tener prisa'));
		assert.deepEqual(busy?.synonyms, ['ajetrearse', 'darse prisa']);
		assert.deepEqual(busy?.antonyms, ['relajarse']);
		assert.ok(entry.synonyms.includes('darse prisa'));
		assert.ok(entry.senses.every((s) => s.partOfSpeech && s.definition));
	});

	it('finds the base word of a form', async () => {
		assert.equal((await wikcionario.lookup('corrí', es)).senses[0]?.baseWord, 'correr');
		assert.equal((await wikcionario.lookup('canciones', es)).senses[0]?.baseWord, 'canción');
	});

	it('reports a word with no Spanish entry or no page', async () => {
		await assert.rejects(wikcionario.lookup('chanson', es), { kind: 'not-found' });
		await assert.rejects(wikcionario.lookup('zzqxvbn', es), { kind: 'not-found' });
	});

	it('suggests spellings with accents, not phrases or words from other languages', async () => {
		// Wikcionario's search also returns "canción de cuna", "nubbevisa" (Swedish), and "chanson" (French).
		assert.deepEqual(await spanishSuggestions('cancion'), ['canción', 'canciones']);
	});
});

describe('choosing per lookup', () => {
	beforeEach(resetNetwork);

	it('offers English, Español, and Spanish → English', () => {
		const labels = (s: Partial<DictionaryNotesSettings>) => definitions.searchModes?.(sanitizeSettings(s))?.map((m) => m.label);
		assert.deepEqual(labels({}), ['English', 'Español', 'Spanish → English']);
		assert.deepEqual(labels({ language: 'fr' }), ['French', 'Español', 'Spanish → English']);
		assert.deepEqual(labels({ language: 'es' }), ['Spanish → English', 'Español']);
		assert.equal(definitions.searchModes?.(sanitizeSettings({ spanishEnabled: false })), undefined);
	});

	it('Español: Wikcionario, Spanish folder, Spanish template', async () => {
		const found = await definitions.find('canción', plugin(), 'es');
		assert.equal(found.entry.source.name, 'Wikcionario');
		const target = definitions.target?.(item(found), sanitizeSettings(null));
		assert.equal(target?.folder, 'Definitions/Español');
		assert.match(target?.builtInTemplate ?? '', /## Todas las definiciones/);
	});

	it('Spanish → English: English explanations, Spanish folder, Definitions template', async () => {
		const found = await definitions.find('sin', plugin(), 'es-en');
		assert.equal(found.entry.senses[0]?.definition, 'without');
		assert.equal(found.entry.language, 'es');
		assert.equal(found.entry.source.url, 'https://en.wiktionary.org/wiki/sin#Spanish');
		const target = definitions.target?.(item(found), sanitizeSettings(null));
		assert.equal(target?.folder, 'Definitions/Español');
		assert.match(target?.builtInTemplate ?? '', /## All definitions/);
	});

	it('English is unchanged: the English word, the Definitions folder', async () => {
		const found = await definitions.find('sin', plugin(), 'main');
		assert.match(found.entry.senses[0]?.definition ?? '', /divine will/);
		assert.equal(found.entry.source.url, 'https://en.wiktionary.org/wiki/sin');
		assert.equal(definitions.target?.(item(found), sanitizeSettings(null)).folder, 'Definitions');
	});

	it('Español falls back to English explanations when Wikcionario is down', async () => {
		fake('es.wiktionary.org', { status: 503, text: '', headers: {} });
		const found = await definitions.find('canción', plugin(), 'es');
		assert.equal(found.entry.explainedIn, 'en');
		assert.equal(found.fallback?.sourceName, 'Wikcionario');
		assert.match(definitions.notice?.(found) ?? '', /Showing results from Free Dictionary API \(Wiktionary\) instead/);
		// Still a Spanish word, but explained in English: Spanish folder, Definitions template.
		const target = definitions.target?.(item(found), sanitizeSettings(null));
		assert.equal(target?.folder, 'Definitions/Español');
		assert.match(target?.builtInTemplate ?? '', /## All definitions/);
	});

	it('suggests accented spellings when a Spanish word is not found', async () => {
		await assert.rejects(definitions.find('cancion', plugin(), 'es'), (err: { kind: string; suggestions: string[] }) => {
			assert.equal(err.kind, 'not-found');
			assert.equal(err.suggestions[0], 'canción');
			return true;
		});
	});
});

describe('forms of other words', () => {
	beforeEach(resetNetwork);

	it('offers the base word of a Spanish form', async () => {
		const review = definitions.review?.(await definitions.find('corrí', plugin(), 'es'));
		assert.deepEqual(review, { message: '"corrí" is a form of "correr".', alternatives: ['correr'], keepLabel: 'Use "corrí"' });
	});

	it('offers the base word of an English form', async () => {
		const review = definitions.review?.(await definitions.find('ran', plugin(), 'main'));
		assert.deepEqual(review?.alternatives, ['run']);
	});

	it('asks nothing for a word that is not a form', async () => {
		assert.equal(definitions.review?.(await definitions.find('run', plugin(), 'main')), undefined);
	});
});

describe('source links', () => {
	const data = (word: string) => ({
		word,
		entries: [{ partOfSpeech: 'noun', senses: [{ definition: 'A frozen dessert.' }] }],
		source: { url: `https://en.wiktionary.org/wiki/${word}` },
	});

	it('encodes phrases so the Markdown link works', () => {
		assert.equal(parseFreeDictionary(data('ice cream'), 'ice cream')?.source.url, 'https://en.wiktionary.org/wiki/ice_cream');
	});

	it('points Spanish words to the Spanish section', () => {
		assert.equal(
			parseFreeDictionary(data('echar de menos'), 'echar de menos', 'es')?.source.url,
			'https://en.wiktionary.org/wiki/echar_de_menos#Spanish',
		);
	});
});
