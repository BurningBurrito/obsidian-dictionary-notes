import { App, SuggestModal } from 'obsidian';
import { Sense, WordEntry } from '../types';

/** Let the user pick one sense of a word. Resolves with null if they cancel. */
export function chooseSense(app: App, entry: WordEntry): Promise<Sense | null> {
	return new Promise((resolve) => {
		new SenseModal(app, entry, resolve).open();
	});
}

class SenseModal extends SuggestModal<Sense> {
	private entry: WordEntry;
	private done: (sense: Sense | null) => void;
	private chosen = false;

	constructor(app: App, entry: WordEntry, done: (sense: Sense | null) => void) {
		super(app);
		this.entry = entry;
		this.done = done;
		this.limit = entry.senses.length;
		this.emptyStateText = 'No definitions match.';
		this.setPlaceholder(
			`Choose a definition of "${entry.word}" (${entry.senses.length} found). Type to filter.`,
		);
		this.setInstructions([
			{ command: '↑↓', purpose: 'to navigate' },
			{ command: '↵', purpose: 'to choose' },
			{ command: 'esc', purpose: 'to cancel' },
		]);
	}

	getSuggestions(query: string): Sense[] {
		const q = query.trim().toLowerCase();
		if (!q) return this.entry.senses;
		return this.entry.senses.filter(
			(s) =>
				s.definition.toLowerCase().includes(q) || s.partOfSpeech.toLowerCase().includes(q),
		);
	}

	renderSuggestion(sense: Sense, el: HTMLElement) {
		el.addClass('dictionary-notes-sense');
		el.toggleClass('is-subsense', sense.depth === 1);
		if (sense.partOfSpeech) {
			el.createDiv({ cls: 'dictionary-notes-sense-pos', text: sense.partOfSpeech });
		}
		el.createDiv({ text: sense.definition });
		const example = sense.examples[0];
		if (example) el.createDiv({ cls: 'dictionary-notes-sense-example', text: example });
	}

	onChooseSuggestion(sense: Sense) {
		this.chosen = true;
		this.done(sense);
	}

	onClose() {
		super.onClose();
		// Obsidian closes the modal before calling onChooseSuggestion, so wait a
		// tick before treating the close as a cancel.
		window.setTimeout(() => {
			if (!this.chosen) this.done(null);
		}, 0);
	}
}
