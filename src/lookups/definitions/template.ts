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

export function buildVariables(entry: WordEntry, sense: Sense): TemplateVariables {
	return {
		word: entry.word,
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
