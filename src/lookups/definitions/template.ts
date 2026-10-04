import type { TemplateVariables } from '../../core/render';
import { formatSenseList, Sense } from '../senses';
import { WordEntry } from './types';

export const DEFAULT_TEMPLATE = `---
word: {{word}}
part-of-speech: {{partOfSpeech}}
phonetic: {{phonetic}}
synonyms: {{synonyms}}
source: {{source}}
created: {{date}}
tags:
  - dictionary
---
**{{partOfSpeech}}** {{phonetic}}

> {{definition}}

{{examples}}

## All definitions

{{allDefinitions}}

---
Source: [{{source}}]({{sourceUrl}}), {{license}}
`;

/**
 * For definitions written in Spanish (Wikcionario). Headings are in Spanish;
 * property names stay in English so notes in both languages work together in
 * searches and Bases.
 */
export const SPANISH_TEMPLATE = `---
word: {{word}}
language: {{language}}
part-of-speech: {{partOfSpeech}}
phonetic: {{phonetic}}
synonyms: {{synonyms}}
source: {{source}}
created: {{date}}
tags:
  - dictionary
  - spanish
---
**{{partOfSpeech}}** {{phonetic}}

> {{definition}}

{{examples}}

## Etimología

{{etymology}}

## Todas las definiciones

{{allDefinitions}}

---
Fuente: [{{source}}]({{sourceUrl}}), {{license}}
`;

export function buildVariables(entry: WordEntry, sense: Sense): TemplateVariables {
	return {
		word: entry.word,
		language: entry.language,
		definition: sense.definition,
		partOfSpeech: sense.partOfSpeech,
		phonetic: entry.phonetic,
		example: sense.examples[0] ?? '',
		examples: sense.examples.map((e) => `- *${e}*`).join('\n'),
		synonyms: sense.synonyms.length ? sense.synonyms : entry.synonyms,
		antonyms: sense.antonyms.length ? sense.antonyms : entry.antonyms,
		etymology: entry.etymology,
		audio: entry.audioUrl,
		allDefinitions: formatSenseList(entry.senses),
		source: entry.source.name,
		sourceUrl: entry.source.url,
		license: entry.source.license,
		licenseUrl: entry.source.licenseUrl,
	};
}
