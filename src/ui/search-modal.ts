import { App, ButtonComponent, Modal, TextComponent } from 'obsidian';
import { LookupError, toLookupError } from '../errors';
import { LookupResult } from '../sources';
import { collapseWhitespace } from '../utils';

type Lookup = (word: string) => Promise<LookupResult>;

/** Ask for a word and look it up. Resolves with null if the user cancels. */
export function openSearchModal(
	app: App,
	initialQuery: string,
	lookup: Lookup,
): Promise<LookupResult | null> {
	return new Promise((resolve) => {
		new SearchModal(app, initialQuery, lookup, resolve).open();
	});
}

// Errors are shown inside the modal (instead of closing it) so the user can
// fix a typo or retry without starting over.
class SearchModal extends Modal {
	private query: string;
	private lookup: Lookup;
	private done: (result: LookupResult | null) => void;
	private result: LookupResult | null = null;
	private busy = false;
	private closed = false;
	private input!: TextComponent;
	private button!: ButtonComponent;
	private messageEl!: HTMLElement;

	constructor(
		app: App,
		initialQuery: string,
		lookup: Lookup,
		done: (result: LookupResult | null) => void,
	) {
		super(app);
		this.query = initialQuery;
		this.lookup = lookup;
		this.done = done;
	}

	onOpen() {
		this.setTitle('Look up a word');
		const { contentEl } = this;

		this.input = new TextComponent(contentEl)
			.setPlaceholder('Type a word')
			.setValue(this.query)
			.onChange((value) => (this.query = value));
		this.input.inputEl.addClass('dictionary-notes-search-input');

		this.messageEl = contentEl.createDiv({ cls: 'dictionary-notes-message' });

		const buttons = contentEl.createDiv({ cls: 'modal-button-container' });
		this.button = new ButtonComponent(buttons)
			.setButtonText('Look up')
			.setCta()
			.onClick(() => void this.search());

		this.scope.register([], 'Enter', (evt) => {
			if (evt.isComposing) return;
			void this.search();
			return false;
		});

		this.input.inputEl.focus();
		this.input.inputEl.select();
	}

	onClose() {
		this.closed = true;
		this.contentEl.empty();
		this.done(this.result);
	}

	private async search() {
		const word = collapseWhitespace(this.query);
		if (this.busy) return;
		if (!word) {
			this.showMessage('Type a word to look up.', true);
			return;
		}

		this.setBusy(true);
		this.showMessage('');
		try {
			const result = await this.lookup(word);
			if (this.closed) return;
			this.result = result;
			this.close();
		} catch (err) {
			if (this.closed) return;
			this.showError(toLookupError(err));
		} finally {
			this.setBusy(false);
		}
	}

	private showError(error: LookupError) {
		this.showMessage(error.message, true);
		if (error.suggestions.length === 0) return;

		const list = this.messageEl.createDiv({ cls: 'dictionary-notes-suggestions' });
		list.createSpan({ text: 'Did you mean:' });
		for (const suggestion of error.suggestions) {
			new ButtonComponent(list).setButtonText(suggestion).onClick(() => {
				this.query = suggestion;
				this.input.setValue(suggestion);
				void this.search();
			});
		}
	}

	private showMessage(text: string, isError = false) {
		this.messageEl.empty();
		this.messageEl.toggleClass('is-error', isError);
		if (text) this.messageEl.createDiv({ text });
	}

	private setBusy(busy: boolean) {
		this.busy = busy;
		if (this.closed) return;
		this.button.setDisabled(busy).setButtonText(busy ? 'Looking up…' : 'Look up');
	}
}
