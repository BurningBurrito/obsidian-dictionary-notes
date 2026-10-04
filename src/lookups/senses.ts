import { App } from 'obsidian';
import { pickItem } from '../ui/pick-modal';

/** One meaning of a word or idiom, e.g. "run" as a verb meaning "to move swiftly". */
export interface Sense {
	partOfSpeech: string;
	definition: string;
	examples: string[];
	synonyms: string[];
	antonyms: string[];
	/** 0 for a main sense, 1 for a sub-sense of the main sense before it. */
	depth: 0 | 1;
	/** For a form of another word ("ran", "corrí"), that word ("run", "correr"). */
	baseWord?: string;
}

/**
 * Let the user pick one sense. `noun` is what a sense is called in the list:
 * "definition" for words, "meaning" for idioms. Resolves with null on cancel.
 */
export function chooseSense(
	app: App,
	title: string,
	senses: Sense[],
	noun: 'definition' | 'meaning',
): Promise<Sense | null> {
	return pickItem(app, {
		items: senses,
		placeholder: `Choose a ${noun} of "${title}" (${senses.length} found). Type to filter.`,
		emptyText: `No ${noun}s match.`,
		matches: (s, q) =>
			s.definition.toLowerCase().includes(q) || s.partOfSpeech.toLowerCase().includes(q),
		render: renderSense,
	});
}

function renderSense(sense: Sense, el: HTMLElement) {
	el.addClass('dictionary-notes-sense');
	el.toggleClass('is-subsense', sense.depth === 1);
	if (sense.partOfSpeech) {
		el.createDiv({ cls: 'dictionary-notes-sense-pos', text: sense.partOfSpeech });
	}
	el.createDiv({ text: sense.definition });
	const example = sense.examples[0];
	if (example) el.createDiv({ cls: 'dictionary-notes-sense-example', text: example });
}

/** Every sense, grouped by part of speech, as numbered Markdown lists. */
export function formatSenseList(senses: Sense[]): string {
	const groups = new Map<string, Sense[]>();
	for (const sense of senses) {
		const key = sense.partOfSpeech || 'other';
		groups.set(key, [...(groups.get(key) ?? []), sense]);
	}
	const blocks: string[] = [];
	for (const [partOfSpeech, group] of groups) {
		const lines = [`**${partOfSpeech}**`, ''];
		let number = 0;
		for (const sense of group) {
			if (sense.depth === 1 && number > 0) lines.push(`\t- ${sense.definition}`);
			else lines.push(`${++number}. ${sense.definition}`);
		}
		blocks.push(lines.join('\n'));
	}
	return blocks.join('\n\n');
}
