import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { idioms } from '../src/lookups/idioms';
import { lookupIdiomFreeDictionary, withoutIdiomaticLabel } from '../src/lookups/idioms/free-dictionary-idioms';
import { fetchIdiom } from '../src/lookups/idioms/wiktionary-idioms';
import type DictionaryNotesPlugin from '../src/main';
import { sanitizeSettings } from '../src/settings';
import { fake, resetNetwork } from './support/network';

const plugin = (useFallback = true) =>
	({ settings: sanitizeSettings({ idiomUseFallback: useFallback }) }) as unknown as DictionaryNotesPlugin;

describe('idiom search', () => {
	beforeEach(resetNetwork);

	it('looks up an exact idiom straight away, with its origin', async () => {
		const found = await idioms.find('break the ice', plugin(), undefined);
		assert.equal(found.entry?.idiom, 'break the ice');
		assert.equal(found.entry?.source.name, 'Wiktionary');
		assert.equal(found.entry?.source.url, 'https://en.wiktionary.org/wiki/break_the_ice');
		assert.ok(found.entry && found.entry.senses.length >= 2);
		assert.match(found.entry?.origin ?? '', /metaphor/);
		assert.equal(found.fallback, undefined);
	});

	it('ignores capitals and a final period', async () => {
		const found = await idioms.find('Break The Ice.', plugin(), undefined);
		assert.equal(found.entry?.idiom, 'break the ice');
	});

	it('lists matching idioms for partial input, best match first', async () => {
		const spill = await idioms.find('spill beans', plugin(), undefined);
		assert.equal(spill.entry, undefined);
		assert.equal(spill.candidates[0], 'spill the beans');

		const kicked = await idioms.find('kicked the bucket', plugin(), undefined);
		assert.equal(kicked.candidates[0], 'kick the bucket');

		const ice = await idioms.find('ice', plugin(), undefined);
		assert.ok(ice.candidates.includes('on thin ice'));
		assert.ok(ice.candidates.length > 10);
	});

	it('leaves out pointers to the literal words', async () => {
		const found = await idioms.find('piece of cake', plugin(), undefined);
		assert.ok(found.entry);
		for (const sense of found.entry.senses) {
			assert.doesNotMatch(sense.definition, /used other than figuratively/i);
		}
	});

	it('removes footnotes from the origin', async () => {
		const entry = await fetchIdiom('spill the beans');
		assert.match(entry.origin, /Ancient Greek/);
		assert.doesNotMatch(entry.origin, /\[\d+\]|\^|Phrase Finder/);
	});

	it('reports when nothing is found', async () => {
		await assert.rejects(idioms.find('zzqxv flurble', plugin(), undefined), {
			kind: 'not-found',
			message: 'No idioms found for "zzqxv flurble".',
		});
	});

	it('uses Free Dictionary API when Wiktionary is down', async () => {
		fake('en.wiktionary.org', { status: 503, text: '', headers: {} });
		const found = await idioms.find('kick the bucket', plugin(), undefined);
		assert.equal(found.fallback?.kind, 'server');
		assert.equal(found.entry?.source.name, 'Free Dictionary API (Wiktionary)');
		assert.equal(found.entry?.source.url, 'https://en.wiktionary.org/wiki/kick_the_bucket');
		assert.match(idioms.notice?.(found) ?? '', /Showing results from Free Dictionary API instead/);
	});

	it("doesn't use the backup when it's turned off", async () => {
		fake('en.wiktionary.org', { status: 503, text: '', headers: {} });
		await assert.rejects(idioms.find('kick the bucket', plugin(false), undefined), { kind: 'server' });
	});
});

describe('idiom backup source', () => {
	beforeEach(resetNetwork);

	it('keeps only idiomatic meanings and drops the "idiomatic" label', async () => {
		const entry = await lookupIdiomFreeDictionary('kick the bucket');
		assert.match(entry.senses[0]?.definition ?? '', /^\(euphemistic, colloquial, humorous\) To die\./);
	});

	it('rejects a word that is not an idiom', async () => {
		await assert.rejects(lookupIdiomFreeDictionary('table'), { kind: 'not-found' });
	});

	it('removes only the idiomatic label', () => {
		assert.equal(withoutIdiomaticLabel('(idiomatic) To die.'), 'To die.');
		assert.equal(withoutIdiomaticLabel('(idiomatic, colloquial) To die.'), '(colloquial) To die.');
		assert.equal(withoutIdiomaticLabel('(colloquial) To die.'), '(colloquial) To die.');
		assert.equal(withoutIdiomaticLabel('To die (idiomatic).'), 'To die (idiomatic).');
	});
});
