import assert from 'node:assert/strict';
import { before, beforeEach, describe, it } from 'node:test';
import { quotes } from '../src/lookups/quotes';
import { checkOnAuthorPage, findByAuthor, findByKeyword, findByTopic } from '../src/lookups/quotes/search';
import { attributionNote, quoteExcerpt, quoteTags, quoteVariables } from '../src/lookups/quotes/template';
import type { Quote } from '../src/lookups/quotes/types';
import { fetchPage } from '../src/lookups/quotes/wikiquote';
import { findYear, parseQuotes, sameQuote } from '../src/lookups/quotes/wikiquote-parser';
import { resetNetwork } from './support/network';

const counts = (list: Quote[]) =>
	list.reduce<Record<string, number>>((acc, q) => ({ ...acc, [q.status]: (acc[q.status] ?? 0) + 1 }), {});

async function parsePage(title: string, isPerson: boolean, skipAbout = isPerson): Promise<Quote[]> {
	const page = await fetchPage(title);
	assert.ok(page, `${title} should exist`);
	return parseQuotes(page.html, { page: page.title, isPerson, skipAbout });
}

describe('reading Wikiquote pages', () => {
	let einstein: Quote[];
	let franklin: Quote[];
	let courage: Quote[];
	before(async () => {
		resetNetwork();
		einstein = await parsePage('Albert Einstein', true);
		franklin = await parsePage('Benjamin Franklin', true);
		courage = await parsePage('Courage', false);
	});

	it('labels every section of a person page', () => {
		const c = counts(einstein);
		assert.ok((c.sourced ?? 0) > 200, 'sourced');
		assert.ok((c.attributed ?? 0) > 50, 'attributed');
		assert.ok((c.disputed ?? 0) > 0, 'disputed');
		assert.ok((c.misattributed ?? 0) > 20, 'misattributed');
		assert.ok(einstein.every((q) => q.author === 'Albert Einstein' && q.onAuthorPage));
	});

	it('reads the work and year from a section heading', () => {
		const q = einstein.find((x) => x.text.includes('Imagination is more important than knowledge'));
		assert.equal(q?.status, 'sourced');
		assert.equal(q?.work, 'Viereck interview');
		assert.equal(q?.year, '1929');
	});

	it('uses the English translation of a quote in another language', () => {
		const q = einstein.find((x) => x.original.startsWith('Un homme heureux'));
		assert.equal(q?.text, 'A happy man is too satisfied with the present to dwell too much on the future.');
		assert.equal(q?.year, '1896');
	});

	it('finds misattributed quotes inside the Misattributed box, with the explanation', () => {
		const q = franklin.find((x) => x.text.startsWith('The definition of insanity'));
		assert.equal(q?.status, 'misattributed');
		assert.match(q?.note ?? '', /Narcotics Anonymous/);
		assert.equal(q?.work, '');
		assert.equal(q?.year, '');
	});

	it('leaves out "Quotes about" on a person page, or credits them to the speaker', async () => {
		assert.ok(!franklin.some((q) => q.text.startsWith('I congratulate you, as the friend of America')));
		const all = await parsePage('Benjamin Franklin', true, false);
		const burke = all.find((q) => q.text.startsWith('I congratulate you, as the friend of America'));
		assert.equal(burke?.author, 'Edmund Burke');
		assert.equal(burke?.onAuthorPage, false);
	});

	it('credits topic-page quotes to the linked author in the citation', () => {
		const q = courage.find((x) => x.text.includes('rank pride'));
		assert.equal(q?.author, 'Joseph Addison');
		assert.equal(q?.authorPage, 'Joseph Addison');
		assert.equal(q?.work, 'Cato, A Tragedy');
		assert.equal(q?.year, '1713');
		assert.equal(q?.text, "'Tis pride, rank pride, and haughtiness of soul: / I think the Romans call it Stoicism.");
		assert.deepEqual(q?.links, ['Pride', 'Soul', 'Stoicism']);
	});

	it('marks uncited topic-page quotes as unsourced, with no author', () => {
		const q = courage.find((x) => x.text.startsWith('Courage is the most powerful and prominent situation'));
		assert.equal(q?.status, 'unsourced');
		assert.equal(q?.author, '');
	});

	it('labels quotes by the Disputed/Misattributed box alone, and by the heading alone', () => {
		const page = (body: string) =>
			parseQuotes(`<div class="mw-parser-output">${body}</div>`, { page: 'Someone', isPerson: true });
		const quote = '<ul><li>A quote that is long enough.<ul><li>Explanation.</li></ul></li></ul>';
		const boxOnly = page(`<div class="misattributed-begin-frame misattributed-begin-box">${quote}</div>`);
		assert.equal(boxOnly[0]?.status, 'misattributed');
		const headingOnly = page(`<div class="mw-heading mw-heading2"><h2 id="Disputed">Disputed</h2></div>${quote}`);
		assert.equal(headingOnly[0]?.status, 'disputed');
		assert.equal(headingOnly[0]?.note, 'Explanation.');
		// A box's heading doesn't leak into the sections after the box.
		const after = page(
			`<div class="misattributed-begin-frame"><div class="mw-heading mw-heading2"><h2>Misattributed</h2></div>${quote}</div>${quote}`,
		);
		assert.deepEqual(after.map((q) => q.status), ['misattributed', 'sourced']);
	});

	it('skips editor votes on date pages', async () => {
		const day = await parsePage('March 14', false);
		assert.ok(!day.some((q) => /\(UTC\)/.test(q.text)));
	});
});

describe('quote search', () => {
	beforeEach(resetNetwork);

	it('by author, following redirects ("einstein")', async () => {
		const found = await findByAuthor('einstein');
		assert.equal(found.heading, 'Quotes by Albert Einstein');
		assert.ok(found.quotes.length > 300);
		// Sourced first, unsourced last.
		assert.equal(found.quotes[0]?.status, 'sourced');
		assert.equal(found.quotes[found.quotes.length - 1]?.status, 'misattributed');
	});

	it('by author, with a full-text fallback ("twain")', async () => {
		assert.equal((await findByAuthor('twain')).heading, 'Quotes by Mark Twain');
	});

	it('by author, people only', async () => {
		await assert.rejects(findByAuthor('pink floyd'), {
			kind: 'not-found',
			message: '"Pink Floyd" isn\'t a person on Wikiquote. Try a keyword or topic search instead.',
		});
	});

	it('by topic, tagging quotes with the topic', async () => {
		const found = await findByTopic('courage');
		assert.equal(found.heading, 'Quotes about Courage');
		assert.ok(found.quotes.every((q) => q.topics[0] === 'Courage'));
		assert.equal(found.quotes[found.quotes.length - 1]?.status, 'unsourced');
	});

	it('by keyword, labeling a misattributed quote', async () => {
		const found = await findByKeyword('definition of insanity is doing the same thing');
		const franklin = found.quotes.find((q) => q.author === 'Benjamin Franklin');
		assert.equal(franklin?.status, 'misattributed');
	});

	it('by keyword, finding a quote that topic pages list first', async () => {
		const found = await findByKeyword('imagination is more important than knowledge');
		assert.ok(found.quotes.some((q) => q.author === 'Albert Einstein'));
	});

	it('reports when nothing is found', async () => {
		await assert.rejects(findByKeyword('zzqxv flurble'), { message: 'No quotes found for "zzqxv flurble".' });
		await assert.rejects(findByTopic('zzqxv flurble'), { message: 'No Wikiquote page found for "zzqxv flurble".' });
	});

	it("checks a topic-page quote on the author's own page", async () => {
		const fromTopicPage: Quote = {
			text: 'The definition of insanity is doing the same thing over and over and expecting different results.',
			original: '',
			author: 'Benjamin Franklin',
			authorPage: 'Benjamin Franklin',
			citation: 'Benjamin Franklin, Poor Richard (1750)',
			work: 'Poor Richard',
			year: '1750',
			status: 'sourced',
			note: '',
			links: ['Insanity'],
			topics: ['Insanity'],
			page: 'Insanity',
			anchor: 'I',
			onAuthorPage: false,
		};
		const checked = await checkOnAuthorPage(fromTopicPage);
		assert.equal(checked.status, 'misattributed');
		assert.equal(checked.page, 'Benjamin Franklin');
		assert.equal(checked.work, '');
		assert.deepEqual(checked.topics, ['Insanity']);
	});
});

describe('quote notes', () => {
	const quote: Quote = {
		text: 'I am enough of an artist to draw freely upon my imagination. Imagination is more important than knowledge.',
		original: '',
		author: 'Albert Einstein',
		authorPage: 'Albert Einstein',
		citation: '',
		work: 'Viereck interview',
		year: '1929',
		status: 'sourced',
		note: '',
		links: ['Human nature', 'Albert Einstein', '1929'],
		topics: ['Imagination'],
		page: 'Albert Einstein',
		anchor: 'Viereck_interview_(1929)',
		onAuthorPage: true,
	};

	it('names the note "Author - excerpt"', () => {
		assert.equal(quotes.noteName(quote), 'Albert Einstein - I am enough of an artist to draw freely upon my');
		assert.equal(quotes.noteName({ ...quote, author: '', text: '"Who: me?" / yes' }), 'Unknown - Who me');
	});

	it('cuts the excerpt at a word boundary without trailing punctuation', () => {
		assert.equal(quoteExcerpt('Imagination is more important than knowledge. Knowledge is limited.'), 'Imagination is more important than knowledge');
		assert.equal(quoteExcerpt('Short.'), 'Short');
	});

	it('makes valid tags from the topic and linked subjects', () => {
		assert.deepEqual(quoteTags(quote), ['imagination', 'human-nature', 'albert-einstein']);
	});

	it('has no warning for a sourced quote, and a labeled one otherwise', () => {
		assert.equal(attributionNote(quote), '');
		const note = attributionNote({ ...quote, status: 'misattributed', note: 'Earliest known source: 1981.' });
		assert.equal(
			note,
			'> [!warning] Misattributed\n> Wikiquote lists this quote as misattributed to Albert Einstein. Earliest known source: 1981.',
		);
		assert.match(attributionNote({ ...quote, status: 'attributed' }), /^> \[!warning\] Attributed \(unverified\)/);
		assert.equal(attributionNote({ ...quote, status: 'unsourced', author: '' }), '> [!warning] Unsourced\n> Wikiquote gives no source for this quote.');
	});

	it('fills the variables, linking to the exact section', () => {
		const v = quoteVariables(quote);
		assert.equal(v.status, 'Sourced');
		assert.equal(v.sourceUrl, 'https://en.wikiquote.org/wiki/Albert_Einstein#Viereck_interview_(1929)');
		assert.equal(v.author, 'Albert Einstein');
		assert.equal(quoteVariables({ ...quote, author: '' }).author, 'Unknown');
	});

	it('finds the year in a citation', () => {
		assert.equal(findYear('Letter to Max Born (4 December 1926)'), '1926');
		assert.equal(findYear('The Guardian, No. 1050 (1713)'), '1713');
		assert.equal(findYear('Quoted on p. 1234 of a book'), '');
		assert.equal(findYear('ISBN 0-8018-1905-2'), '');
	});

	it('treats an excerpt as the same quote', () => {
		assert.ok(sameQuote('Imagination is more important than knowledge.', 'imagination is more important than knowledge'));
		assert.ok(!sameQuote('Short one', 'Short two'));
	});
});
