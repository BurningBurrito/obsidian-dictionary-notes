// Fake network for tests. Normally every request is answered from responses
// recorded from the real services (tests/fixtures/http/<suite>.json.gz), so
// tests never go online. `npm run test:record` makes the real requests and
// saves new recordings. Tests can also inject failures with `fake()`.
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { gunzipSync, gzipSync } from 'node:zlib';

export interface FakeResponse {
	status: number;
	text: string;
	headers: Record<string, string>;
}

type Fake = FakeResponse | 'network-error' | 'hang';

const RECORD = process.env.DN_RECORD === '1';
const suite = basename(process.argv[1] ?? 'unknown').replace(/\.test\.cjs$/, '');
const file = join(process.cwd(), 'tests', 'fixtures', 'http', `${suite}.json.gz`);

interface Recording {
	recorded: string;
	responses: Record<string, FakeResponse>;
}
const recording: Recording = existsSync(file)
	? (JSON.parse(gunzipSync(readFileSync(file)).toString('utf8')) as Recording)
	: { recorded: '', responses: {} };
if (RECORD) {
	recording.recorded = new Date().toISOString();
	recording.responses = {};
	process.on('exit', () => {
		if (Object.keys(recording.responses).length === 0) {
			rmSync(file, { force: true });
			return;
		}
		mkdirSync(dirname(file), { recursive: true });
		writeFileSync(file, gzipSync(JSON.stringify(recording)));
	});
}

const fakes: { match: (url: string) => boolean; response: Fake }[] = [];
export const requests: string[] = [];

/** Answer requests whose URL contains `match` (or matches the regex) with `response`. */
export function fake(match: string | RegExp, response: Fake) {
	const test = typeof match === 'string' ? (url: string) => url.includes(match) : (url: string) => match.test(url);
	fakes.unshift({ match: test, response });
}

export function resetNetwork() {
	fakes.length = 0;
	requests.length = 0;
	setOnline(true);
}

export function setOnline(online: boolean) {
	Object.defineProperty(globalThis.navigator, 'onLine', { value: online, configurable: true });
}

export async function handleRequest(url: string, headers: Record<string, string>): Promise<FakeResponse> {
	requests.push(url);
	const injected = fakes.find((f) => f.match(url))?.response;
	if (injected === 'network-error') throw new Error('net::ERR_INTERNET_DISCONNECTED');
	if (injected === 'hang') return new Promise(() => undefined);
	if (injected) return injected;

	if (RECORD) {
		const response = await fetch(url, {
			headers: { 'User-Agent': 'DictionaryNotes-tests (https://github.com/BurningBurrito/obsidian-dictionary-notes)', ...headers },
		});
		const retryAfter = response.headers.get('retry-after');
		const saved = { status: response.status, text: await response.text(), headers: retryAfter ? { 'retry-after': retryAfter } : {} };
		recording.responses[url] = saved;
		return saved;
	}
	const saved = recording.responses[url];
	if (!saved) throw new Error(`No recorded response for ${url}. Run "npm run test:record" to record it.`);
	return saved;
}
