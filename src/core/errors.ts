export type LookupErrorKind =
	| 'offline'
	| 'network'
	| 'timeout'
	| 'not-found'
	| 'rate-limited'
	| 'server'
	| 'bad-response'
	| 'config';

/**
 * A failed lookup (definition, idiom, or quote). `message` is written for the
 * user and is shown as-is in the search modal or a notice.
 */
export class LookupError extends Error {
	kind: LookupErrorKind;
	/** Alternative spellings offered by the source (Merriam-Webster only). */
	suggestions: string[];

	constructor(kind: LookupErrorKind, message: string, suggestions: string[] = []) {
		super(message);
		this.name = 'LookupError';
		this.kind = kind;
		this.suggestions = suggestions;
	}
}

export function notFoundError(word: string, suggestions: string[] = []): LookupError {
	return new LookupError('not-found', `No definitions found for "${word}".`, suggestions);
}

export function toLookupError(err: unknown): LookupError {
	if (err instanceof LookupError) return err;
	console.error('Dictionary Notes: unexpected lookup error', err);
	return new LookupError(
		'bad-response',
		'Something went wrong during the lookup. See the developer console for details.',
	);
}
