import { App, ButtonComponent, Modal, TextComponent } from 'obsidian';
import { LookupError, toLookupError } from '../core/errors';
import { collapseWhitespace } from '../core/utils';

/** One way of searching, such as quotes by keyword, author, or topic. */
export interface SearchMode {
	id: string;
	label: string;
	placeholder: string;
}

/** A question to ask before closing, e.g. "corrí" is a form of "correr". */
export interface SearchReview {
	message: string;
	/** Other searches to offer, such as the base word. */
	alternatives: string[];
	/** Button text for keeping the result as it is. */
	keepLabel: string;
}

export interface SearchOptions<T = unknown> {
	title: string;
	placeholder: string;
	/** Shown when the user searches with an empty box. */
	emptyMessage: string;
	initialQuery: string;
	/** Buttons above the search box to switch between ways of searching. */
	modes?: SearchMode[];
	initialMode?: string;
	onModeChange?: (mode: string) => void;
	/** Check a result before closing; return a question to ask, or undefined to close. */
	review?: (result: T) => SearchReview | undefined;
}

type Lookup<T> = (query: string, mode: string | undefined) => Promise<T>;

/** Ask for a search term and look it up. Resolves with null if the user cancels. */
export function openSearchModal<T>(
	app: App,
	options: SearchOptions<T>,
	lookup: Lookup<T>,
): Promise<T | null> {
	return new Promise((resolve) => {
		new SearchModal(app, options, lookup, resolve).open();
	});
}

// Errors are shown inside the modal (instead of closing it) so the user can
// fix a typo or retry without starting over.
class SearchModal<T> extends Modal {
	private options: SearchOptions<T>;
	private query: string;
	/** A result waiting on the user's answer to a review question, and the query it's for. */
	private pending: { query: string; result: T } | null = null;
	private mode: SearchMode | undefined;
	private lookup: Lookup<T>;
	private done: (result: T | null) => void;
	private result: T | null = null;
	private busy = false;
	private closed = false;
	private input!: TextComponent;
	private button!: ButtonComponent;
	private modeButtons = new Map<string, ButtonComponent>();
	private messageEl!: HTMLElement;

	constructor(app: App, options: SearchOptions<T>, lookup: Lookup<T>, done: (result: T | null) => void) {
		super(app);
		this.options = options;
		this.query = options.initialQuery;
		const modes = options.modes ?? [];
		this.mode = modes.find((m) => m.id === options.initialMode) ?? modes[0];
		this.lookup = lookup;
		this.done = done;
	}

	onOpen() {
		this.setTitle(this.options.title);
		const { contentEl } = this;

		if (this.options.modes?.length) {
			const row = contentEl.createDiv({ cls: 'dictionary-notes-modes' });
			for (const mode of this.options.modes) {
				this.modeButtons.set(
					mode.id,
					new ButtonComponent(row).setButtonText(mode.label).onClick(() => this.selectMode(mode)),
				);
			}
		}

		this.input = new TextComponent(contentEl)
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

		this.showMode();
		this.input.inputEl.focus();
		this.input.inputEl.select();
	}

	onClose() {
		this.closed = true;
		this.contentEl.empty();
		this.done(this.result);
	}

	private selectMode(mode: SearchMode) {
		if (this.busy || mode === this.mode) return;
		this.mode = mode;
		this.pending = null;
		this.showMode();
		this.showMessage('');
		this.options.onModeChange?.(mode.id);
		this.input.inputEl.focus();
	}

	private showMode() {
		for (const [id, button] of this.modeButtons) {
			if (id === this.mode?.id) button.setCta();
			else button.removeCta();
		}
		this.input.setPlaceholder(this.mode?.placeholder ?? this.options.placeholder);
	}

	private async search() {
		const query = collapseWhitespace(this.query);
		if (this.busy) return;
		if (!query) {
			this.showMessage(this.options.emptyMessage, true);
			return;
		}
		// Enter again on an unchanged query keeps the result that was questioned.
		if (this.pending?.query === query) {
			this.finish(this.pending.result);
			return;
		}

		this.setBusy(true);
		this.showMessage('');
		this.pending = null;
		try {
			const result = await this.lookup(query, this.mode?.id);
			if (this.closed) return;
			const review = this.options.review?.(result);
			if (review) this.ask(review, query, result);
			else this.finish(result);
		} catch (err) {
			if (this.closed) return;
			this.showError(toLookupError(err));
		} finally {
			this.setBusy(false);
		}
	}

	private finish(result: T) {
		this.result = result;
		this.close();
	}

	private ask(review: SearchReview, query: string, result: T) {
		this.pending = { query, result };
		this.showMessage(review.message);
		const choices = this.messageEl.createDiv({ cls: 'dictionary-notes-suggestions' });
		for (const alternative of review.alternatives) {
			new ButtonComponent(choices).setButtonText(alternative).onClick(() => {
				this.query = alternative;
				this.input.setValue(alternative);
				void this.search();
			});
		}
		new ButtonComponent(choices).setButtonText(review.keepLabel).onClick(() => this.finish(result));
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
		for (const button of this.modeButtons.values()) button.setDisabled(busy);
	}
}
