import type { TemplateVariables } from '../../core/render';
import { formatSenseList, Sense } from '../senses';
import { IdiomEntry } from './types';

export const DEFAULT_IDIOM_TEMPLATE = `---
idiom: {{idiom}}
meaning: {{meaning}}
part-of-speech: {{partOfSpeech}}
source: {{source}}
created: {{date}}
tags:
  - dictionary
  - idiom
---
> {{meaning}}

{{examples}}

## Origin

{{origin}}

## All meanings

{{allMeanings}}

---
Source: [{{source}}]({{sourceUrl}}), {{license}}
`;

export function idiomVariables(entry: IdiomEntry, sense: Sense): TemplateVariables {
	return {
		idiom: entry.idiom,
		meaning: sense.definition,
		partOfSpeech: sense.partOfSpeech,
		example: sense.examples[0] ?? '',
		examples: sense.examples.map((e) => `- *${e}*`).join('\n'),
		origin: entry.origin,
		allMeanings: formatSenseList(entry.senses),
		source: entry.source.name,
		sourceUrl: entry.source.url,
		license: entry.source.license,
		licenseUrl: entry.source.licenseUrl,
	};
}
