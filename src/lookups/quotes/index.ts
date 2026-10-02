import { Notice } from 'obsidian';
import { noteBaseName } from '../../core/notes';
import { pickItem } from '../../ui/pick-modal';
import type { LookupType } from '../lookup-type';
import { checkOnAuthorPage, findByAuthor, findByKeyword, findByTopic } from './search';
import { DEFAULT_QUOTE_TEMPLATE, quoteExcerpt, quoteVariables, STATUS_LABELS } from './template';
import { Quote, QuoteFound } from './types';

/** Quotes: search Wikiquote by keyword, author, or topic, then pick a quote. */
export const quotes: LookupType<QuoteFound, Quote, Quote> = {
	id: 'quotes',
	commandId: 'create-quote-note',
	commandName: 'Create new quote note',
	heading: 'Quotes',
	noun: 'quote',
	menuTitle: 'Quote',
	icon: 'quote',
	search: {
		title: 'Find a quote',
		placeholder: 'Words from the quote',
		emptyMessage: 'Type something to search for.',
		modes: [
			{ id: 'keyword', label: 'Keyword', placeholder: 'Words from the quote' },
			{ id: 'author', label: 'Author', placeholder: 'Author, such as Mark Twain' },
			{ id: 'topic', label: 'Topic', placeholder: 'Topic, such as courage' },
		],
	},
	settingKeys: { folder: 'quoteFolder', templateFile: 'quoteTemplateFile' },
	searchModeKey: 'quoteSearchMode',
	defaultTemplate: DEFAULT_QUOTE_TEMPLATE,
	templateCopyPath: 'Templates/Quote note.md',

	find(query, _plugin, mode) {
		if (mode === 'author') return findByAuthor(query);
		if (mode === 'topic') return findByTopic(query);
		return findByKeyword(query);
	},
	async chooseItem(app, found) {
		const quote =
			found.quotes.length === 1
				? found.quotes[0]
				: await pickItem(app, {
						items: found.quotes,
						placeholder: `${found.heading} (${found.quotes.length} found). Type to filter.`,
						emptyText: 'No quotes match.',
						matches: (q, s) =>
							q.text.toLowerCase().includes(s) ||
							q.author.toLowerCase().includes(s) ||
							q.citation.toLowerCase().includes(s),
						render: renderQuote,
					});
		if (!quote) return null;
		if (quote.onAuthorPage || !quote.authorPage) return quote;

		const notice = new Notice('Checking the attribution…', 0);
		try {
			return await checkOnAuthorPage(quote);
		} catch (err) {
			// The quote is still usable with the topic page's information.
			console.warn('Dictionary Notes: could not check the attribution', err);
			return quote;
		} finally {
			notice.hide();
		}
	},
	noteName: (quote) =>
		noteBaseName(`${(quote.author || 'Unknown').slice(0, 60)} - ${quoteExcerpt(quote.text)}`, 'Untitled quote'),
	displayName: (quote) => `${quote.author || 'Unknown'}: ${quoteExcerpt(quote.text)}…`,
	chooseDetail: (_app, quote) => Promise.resolve(quote),
	variables: quoteVariables,
};

function renderQuote(quote: Quote, el: HTMLElement) {
	el.addClass('dictionary-notes-quote');
	const text = quote.text.length > 300 ? `${quote.text.slice(0, 300)}…` : quote.text;
	el.createDiv({ cls: 'dictionary-notes-quote-text', text });
	const meta = el.createDiv({ cls: 'dictionary-notes-quote-meta' });
	const source = quote.work || quote.citation;
	const credit = [quote.author || 'Unknown', source.length > 100 ? `${source.slice(0, 100)}…` : source];
	meta.createSpan({ text: credit.filter(Boolean).join(' · ') });
	if (quote.status !== 'sourced') {
		meta.createSpan({ cls: 'dictionary-notes-badge', text: STATUS_LABELS[quote.status] });
	}
}
