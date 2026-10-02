import { App, ButtonComponent, Modal, TextComponent } from 'obsidian';
import { LookupError, toLookupError } from '../core/errors';
import { collapseWhitespace } from '../core/utils';

/** One way of searching, such as quotes by keyword, author, or topic. */
export interface SearchMode {
	id: string;
	label: string;
	placeholder: string;
}

export interface SearchOptions {
	title: string;
	placeholder: string;
	/** Shown when the user searches with an empty box. */
	emptyMessage: string;
	initialQuery: string;
	/** Buttons above the search box to switch between ways of searching. */
	modes?: SearchMode[];
	initialMode?: string;
	onModeChange?: (mode: string) => void;
}

type Lookup<T> = (query: string, mode: string | undefined) => Promise<T>;

/** Ask for a search term and look it up. Resolves with null if the user cancels. */
export function openSearchModal<T>(
	app: App,
	options: SearchOptions,
	lookup: Lookup<T>,
): Promise<T | null> {
	return new Promise((resolve) => {
		new SearchModal(app, options, lookup, resolve).open();
	});
}

// Errors are shown inside the modal (instead of closing it) so the user can
// fix a typo or retry without starting over.
class SearchModal<T> extends Modal {
	private options: SearchOptions;
	private query: string;
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

	constructor(app: App, options: SearchOptions, lookup: Lookup<T>, done: (result: T | null) => void) {
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

		this.setBusy(true);
		this.showMessage('');
		try {
			const result = await this.lookup(query, this.mode?.id);
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
		for (const button of this.modeButtons.values()) button.setDisabled(busy);
	}
}
