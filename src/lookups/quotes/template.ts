import type { TemplateVariables } from '../../core/render';
import { collapseWhitespace, uniqueStrings } from '../../core/utils';
import { wikiPageUrl } from '../../core/wikimedia';
import { Quote, QuoteStatus } from './types';
import { WIKIQUOTE_HOST } from './wikiquote';

export const DEFAULT_QUOTE_TEMPLATE = `---
author: {{author}}
work: {{work}}
year: {{year}}
attribution: {{status}}
topics: {{tags}}
source: {{source}}
created: {{date}}
tags:
  - dictionary
  - quote
---
{{attributionNote}}

> {{quote}}
>
> — {{author}}
> {{citation}}

---
Source: [{{source}}]({{sourceUrl}}), {{license}}
`;

/** The value of {{status}}. */
export const STATUS_NAMES: Record<QuoteStatus, string> = {
	sourced: 'Sourced',
	attributed: 'Attributed',
	disputed: 'Disputed',
	misattributed: 'Misattributed',
	unsourced: 'Unsourced',
};

/** The label shown in the quote list and the warning in the note. */
export const STATUS_LABELS: Record<QuoteStatus, string> = {
	...STATUS_NAMES,
	attributed: 'Attributed (unverified)',
};

export function quoteVariables(quote: Quote): TemplateVariables {
	return {
		quote: quote.text,
		original: quote.original,
		author: quote.author || 'Unknown',
		work: quote.work,
		year: quote.year,
		citation: quote.citation,
		status: STATUS_NAMES[quote.status],
		attributionNote: attributionNote(quote),
		tags: quoteTags(quote),
		source: 'Wikiquote',
		sourceUrl: wikiPageUrl(WIKIQUOTE_HOST, quote.page, quote.anchor),
		license: 'CC BY-SA 4.0',
		licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
	};
}

/**
 * A warning callout for any quote that isn't sourced, with Wikiquote's own
 * explanation when it has one. Empty for sourced quotes, so templates don't
 * need "if" logic.
 */
export function attributionNote(quote: Quote): string {
	if (quote.status === 'sourced') return '';
	const who = quote.author || 'this person';
	const summary: Record<Exclude<QuoteStatus, 'sourced'>, string> = {
		attributed: `Wikiquote lists this quote as attributed to ${who}, without a confirmed original source.`,
		disputed: `Wikiquote lists this quote as disputed: it's attributed to ${who}, but that attribution is doubtful.`,
		misattributed: `Wikiquote lists this quote as misattributed to ${who}.`,
		unsourced: 'Wikiquote gives no source for this quote.',
	};
	const text = collapseWhitespace([summary[quote.status], quote.note].filter(Boolean).join(' '));
	return `> [!warning] ${STATUS_LABELS[quote.status]}\n> ${text}`;
}

/** The searched topic plus subjects linked in the quote, as valid Obsidian tags. */
export function quoteTags(quote: Quote): string[] {
	return uniqueStrings([...quote.topics, ...quote.links].map(toTag).filter(Boolean)).slice(0, 10);
}

/** "Human nature" -> "human-nature". Tags can't contain spaces or be only digits. */
function toTag(text: string): string {
	const tag = text
		.toLowerCase()
		.replace(/[\s_]+/g, '-')
		.replace(/[^\p{L}\p{N}/-]/gu, '')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '');
	return /^\d*$/.test(tag) ? '' : tag;
}

/**
 * The start of a quote for its note name, cut at a word boundary:
 * "Imagination is more important than knowledge. Knowledge is…" ->
 * "Imagination is more important than knowledge".
 */
export function quoteExcerpt(text: string, maxLength = 50): string {
	const firstLine = text.split(' / ')[0] ?? text;
	let excerpt = '';
	for (const word of firstLine.split(/\s+/)) {
		const next = excerpt ? `${excerpt} ${word}` : word;
		if (next.length > maxLength && excerpt) break;
		excerpt = next;
	}
	return excerpt.replace(/^[\s"“‘']+/u, '').replace(/[\s,;:.!?…'"“”‘’()–—-]+$/u, '');
}
