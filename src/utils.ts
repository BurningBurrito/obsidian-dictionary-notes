/** Trim, drop empties, and remove duplicates (case-insensitive), keeping order. */
export function uniqueStrings(values: Iterable<string>, exclude: string[] = []): string[] {
	const seen = new Set(exclude.map((v) => v.toLowerCase()));
	const result: string[] = [];
	for (const raw of values) {
		const value = raw.trim();
		const key = value.toLowerCase();
		if (!value || seen.has(key)) continue;
		seen.add(key);
		result.push(value);
	}
	return result;
}

export function collapseWhitespace(text: string): string {
	return text.replace(/\s+/g, ' ').trim();
}
