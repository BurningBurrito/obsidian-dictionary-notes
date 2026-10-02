import { badResponse, httpGet, parseJson } from './http';

// Wikimedia asks API clients to identify themselves, and gives identified
// clients a higher rate limit. https://meta.wikimedia.org/wiki/User-Agent_policy
export const WIKIMEDIA_HEADERS: Record<string, string> = {
	'Api-User-Agent': 'DictionaryNotes (https://github.com/BurningBurrito/obsidian-dictionary-notes)',
};

/**
 * GET a MediaWiki Action API (api.php) request and return the parsed JSON.
 * API-level errors (such as a missing page) arrive with status 200 and an
 * `error` object; use `apiErrorCode` to check for them.
 */
export async function actionApi(
	host: string,
	params: Record<string, string>,
	sourceName: string,
): Promise<unknown> {
	const query = new URLSearchParams({ ...params, format: 'json', formatversion: '2' });
	const response = await httpGet(
		`https://${host}/w/api.php?${query.toString()}`,
		sourceName,
		WIKIMEDIA_HEADERS,
	);
	if (response.status !== 200) throw badResponse(sourceName);
	return parseJson(response, sourceName);
}

/** The error code of an Action API response, such as "missingtitle", if any. */
export function apiErrorCode(data: unknown): string | undefined {
	if (typeof data !== 'object' || data === null || !('error' in data)) return undefined;
	const error = (data as { error?: { code?: unknown } }).error;
	return typeof error?.code === 'string' ? error.code : 'unknown';
}

/** A page URL on a Wikimedia wiki, e.g. https://en.wikiquote.org/wiki/Albert_Einstein#Quotes */
export function wikiPageUrl(host: string, title: string, anchor = ''): string {
	const path = encodeURIComponent(title.replace(/ /g, '_')).replace(/%2F/g, '/');
	return `https://${host}/wiki/${path}${anchor ? `#${encodeURIComponent(anchor)}` : ''}`;
}
