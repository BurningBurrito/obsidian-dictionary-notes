import { requestUrl, RequestUrlResponse } from 'obsidian';
import { LookupError } from '../errors';

const TIMEOUT_MS = 15_000;

/**
 * GET a URL with Obsidian's requestUrl (which, unlike fetch, isn't blocked by
 * CORS and works on mobile). Turns network trouble, timeouts, rate limits and
 * server errors into LookupErrors. Other statuses (including 404) are returned
 * for the caller to interpret.
 */
export async function httpGet(
	url: string,
	sourceName: string,
	headers: Record<string, string> = {},
): Promise<RequestUrlResponse> {
	if (!navigator.onLine) {
		throw new LookupError(
			'offline',
			'You appear to be offline. Check your internet connection and try again.',
		);
	}

	let response: RequestUrlResponse;
	try {
		response = await withTimeout(
			requestUrl({ url, headers, throw: false }),
			TIMEOUT_MS,
			sourceName,
		);
	} catch (err) {
		if (err instanceof LookupError) throw err;
		console.error(`Dictionary Notes: request to ${sourceName} failed`, err);
		throw new LookupError(
			'network',
			`Could not reach ${sourceName}. Check your internet connection and try again.`,
		);
	}

	if (response.status === 429) {
		const minutes = Math.ceil(Number(getHeader(response, 'retry-after')) / 60);
		const wait =
			minutes > 1 ? `in ${minutes} minutes` : minutes === 1 ? 'in a minute' : 'in a few minutes';
		throw new LookupError(
			'rate-limited',
			`${sourceName} has received too many requests. Try again ${wait}.`,
		);
	}
	if (response.status >= 500) {
		throw new LookupError(
			'server',
			`${sourceName} is having problems (error ${response.status}). Try again later.`,
		);
	}
	return response;
}

/** Parse a JSON body, turning invalid JSON into a LookupError. */
export function parseJson(response: RequestUrlResponse, sourceName: string): unknown {
	try {
		return JSON.parse(response.text) as unknown;
	} catch {
		throw badResponse(sourceName);
	}
}

export function badResponse(sourceName: string): LookupError {
	return new LookupError(
		'bad-response',
		`${sourceName} sent a response Dictionary Notes couldn't read. Try again later.`,
	);
}

function getHeader(response: RequestUrlResponse, name: string): string | undefined {
	const key = Object.keys(response.headers).find((k) => k.toLowerCase() === name);
	return key === undefined ? undefined : response.headers[key];
}

function withTimeout<T>(promise: Promise<T>, ms: number, sourceName: string): Promise<T> {
	return new Promise<T>((resolve, reject) => {
		const timer = window.setTimeout(() => {
			reject(
				new LookupError(
					'timeout',
					`${sourceName} took too long to respond. Try again later.`,
				),
			);
		}, ms);
		promise.then(
			(value) => {
				window.clearTimeout(timer);
				resolve(value);
			},
			(err: unknown) => {
				window.clearTimeout(timer);
				reject(err instanceof Error ? err : new Error(String(err)));
			},
		);
	});
}
