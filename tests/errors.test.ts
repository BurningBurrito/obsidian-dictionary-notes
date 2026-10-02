// Every failure gets a plain message the user can act on.
import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { httpGet, parseJson } from '../src/core/http';
import { idioms } from '../src/lookups/idioms';
import { findByKeyword } from '../src/lookups/quotes/search';
import type DictionaryNotesPlugin from '../src/main';
import { sanitizeSettings } from '../src/settings';
import { fake, resetNetwork, setOnline } from './support/network';

const URL = 'https://api.example.org/entry';
const status = (code: number, headers: Record<string, string> = {}) => ({ status: code, text: '', headers });

describe('network errors', () => {
	beforeEach(resetNetwork);

	it('offline', async () => {
		setOnline(false);
		await assert.rejects(httpGet(URL, 'Example'), {
			kind: 'offline',
			message: 'You appear to be offline. Check your internet connection and try again.',
		});
	});

	it('service unreachable', async (t) => {
		t.mock.method(console, 'error', () => undefined); // the plugin logs the details
		fake(URL, 'network-error');
		await assert.rejects(httpGet(URL, 'Example'), {
			kind: 'network',
			message: 'Could not reach Example. Check your internet connection and try again.',
		});
	});

	it('rate limited, with and without a wait time', async () => {
		fake(URL, status(429, { 'Retry-After': '120' }));
		await assert.rejects(httpGet(URL, 'Example'), {
			kind: 'rate-limited',
			message: 'Example has received too many requests. Try again in 2 minutes.',
		});
		fake(URL, status(429, { 'retry-after': '30' }));
		await assert.rejects(httpGet(URL, 'Example'), { message: /Try again in a minute\.$/ });
		fake(URL, status(429));
		await assert.rejects(httpGet(URL, 'Example'), { message: /Try again in a few minutes\.$/ });
	});

	it('server error', async () => {
		fake(URL, status(502));
		await assert.rejects(httpGet(URL, 'Example'), {
			kind: 'server',
			message: 'Example is having problems (error 502). Try again later.',
		});
	});

	it('no answer within 15 seconds', async (t) => {
		t.mock.timers.enable({ apis: ['setTimeout'] });
		fake(URL, 'hang');
		const request = httpGet(URL, 'Example');
		t.mock.timers.tick(15_000);
		await assert.rejects(request, {
			kind: 'timeout',
			message: 'Example took too long to respond. Try again later.',
		});
	});

	it('unreadable response', () => {
		assert.throws(() => parseJson({ status: 200, text: '<html>', headers: {} } as never, 'Example'), {
			kind: 'bad-response',
			message: "Example sent a response Dictionary Notes couldn't read. Try again later.",
		});
	});
});

describe('errors from the idiom and quote sources', () => {
	beforeEach(resetNetwork);
	const plugin = { settings: sanitizeSettings({ idiomUseFallback: false }) } as unknown as DictionaryNotesPlugin;

	it('Wiktionary rate limit', async () => {
		fake('en.wiktionary.org', status(429, { 'retry-after': '60' }));
		await assert.rejects(idioms.find('break the ice', plugin, undefined), {
			kind: 'rate-limited',
			message: 'Wiktionary has received too many requests. Try again in a minute.',
		});
	});

	it('Wikiquote rate limit', async () => {
		fake('en.wikiquote.org', status(429));
		await assert.rejects(findByKeyword('courage'), {
			kind: 'rate-limited',
			message: 'Wikiquote has received too many requests. Try again in a few minutes.',
		});
	});

	it('Wikidata down while checking a page', async () => {
		fake('www.wikidata.org', status(503));
		await assert.rejects(findByKeyword('definition of insanity is doing the same thing'), {
			kind: 'server',
			message: 'Wikidata is having problems (error 503). Try again later.',
		});
	});

	it('offline', async () => {
		setOnline(false);
		await assert.rejects(findByKeyword('courage'), { kind: 'offline' });
		await assert.rejects(idioms.find('break the ice', plugin, undefined), { kind: 'offline' });
	});
});
