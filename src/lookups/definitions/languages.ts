const NAMES = new Intl.DisplayNames(['en'], { type: 'language' });

/** The English name of a language code: "es" -> "Spanish". Falls back to the code. */
export function languageName(code: string): string {
	try {
		return NAMES.of(code) ?? code;
	} catch {
		return code;
	}
}

/**
 * English Wiktionary puts each language in its own section, named in English
 * ("#Spanish"). English words keep the plain page link, as in 1.0 and 1.1.
 */
export function wiktionarySection(code: string): string {
	return code === 'en' ? '' : languageName(code);
}
