// The whole note-creation flow, from search to saved note, for every type.
import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { notices } from 'obsidian';
import { createDictionaryNote } from '../src/core/flow';
import { definitions } from '../src/lookups/definitions';
import { idioms } from '../src/lookups/idioms';
import { quotes } from '../src/lookups/quotes';
import type { Quote } from '../src/lookups/quotes/types';
import { fakePlugin } from './support/app';
import { fake, resetNetwork, setOnline } from './support/network';
import { resetUi, script, ui } from './support/ui';

beforeEach(() => {
	resetNetwork();
	resetUi();
	notices.length = 0;
});

describe('definition notes', () => {
	it('creates the note and the Definitions folder', async () => {
		const { plugin, vault } = fakePlugin();
		script.query = 'run';
		await createDictionaryNote(plugin, definitions);
		assert.ok(vault.folders.has('Definitions'));
		assert.match(vault.files.get('Definitions/run.md') ?? '', /^---\nword: run\n/);
		assert.deepEqual(vault.opened, ['Definitions/run.md']);
		assert.match(ui.picks[0]?.placeholder ?? '', /^Choose a definition of "run" \(\d+ found\)/);
	});

	it('keeps using the folder and template from 1.0.1', async () => {
		const { plugin, vault } = fakePlugin(
			{ folder: 'Dictionary', templateFile: 'Templates/Dictionary note.md' },
			{ 'Templates/Dictionary note.md': 'My note for {{word}}: {{definition}}' },
			['Templates', 'Dictionary'],
		);
		script.query = 'run';
		await createDictionaryNote(plugin, definitions);
		assert.match(vault.files.get('Dictionary/run.md') ?? '', /^My note for run: /);
		assert.ok(!vault.folders.has('Definitions'));
	});

	it('creates nested folders that do not exist yet', async () => {
		const { plugin, vault } = fakePlugin({ folder: 'Words/English' });
		script.query = 'run';
		await createDictionaryNote(plugin, definitions);
		assert.ok(vault.files.has('Words/English/run.md'));
	});

	it('opens an existing note instead of overwriting it', async () => {
		const { plugin, vault } = fakePlugin(null, { 'Definitions/run.md': 'my own notes' }, ['Definitions']);
		script.query = 'run';
		await createDictionaryNote(plugin, definitions);
		assert.equal(vault.files.get('Definitions/run.md'), 'my own notes');
		assert.deepEqual(vault.opened, ['Definitions/run.md']);
		assert.deepEqual(notices, ['A note for "run" already exists. Opening it.']);
		assert.equal(ui.picks.length, 0, "doesn't ask which definition");
	});

	it('creates a numbered copy when set to', async () => {
		const { plugin, vault } = fakePlugin({ ifNoteExists: 'new' }, { 'Definitions/run.md': 'mine' }, ['Definitions']);
		script.query = 'run';
		await createDictionaryNote(plugin, definitions);
		assert.equal(vault.files.get('Definitions/run.md'), 'mine');
		assert.ok(vault.files.has('Definitions/run 2.md'));
	});

	it('uses the built-in template when the template file is missing', async () => {
		const { plugin, vault } = fakePlugin({ templateFile: 'Templates/Gone.md' });
		script.query = 'run';
		await createDictionaryNote(plugin, definitions);
		assert.ok(notices.includes('Template "Templates/Gone.md" was not found, so the built-in template was used.'));
		assert.match(vault.files.get('Definitions/run.md') ?? '', /^---\nword: run/);
	});

	it('explains a folder setting that points to a file', async (t) => {
		t.mock.method(console, 'error', () => undefined); // the plugin logs the details
		const { plugin, vault } = fakePlugin(null, { Definitions: 'a file' });
		script.query = 'run';
		await createDictionaryNote(plugin, definitions);
		assert.deepEqual(notices, ['Could not create the note for "run": "Definitions" is a file, not a folder.']);
		assert.equal(vault.files.size, 1);
	});

	it('tells the user when the backup dictionary answered', async () => {
		const { plugin } = fakePlugin();
		fake('freedictionaryapi.com', { status: 503, text: '', headers: {} });
		script.query = 'run';
		await createDictionaryNote(plugin, definitions);
		assert.match(notices[0] ?? '', /\nShowing results from Wiktionary instead\.$/);
	});

	it('shows lookup errors in the search window and creates nothing', async () => {
		const { plugin, vault } = fakePlugin();
		setOnline(false);
		script.query = 'run';
		await createDictionaryNote(plugin, definitions);
		assert.equal(ui.searchErrors[0]?.message, 'You appear to be offline. Check your internet connection and try again.');
		assert.equal(vault.files.size, 0);
	});

	it('creates nothing when the user cancels the list', async () => {
		const { plugin, vault } = fakePlugin();
		script.query = 'run';
		script.pick = () => null;
		await createDictionaryNote(plugin, definitions);
		assert.equal(vault.files.size, 0);
	});
});

describe('idiom notes', () => {
	it('creates a note for an exact idiom in the Idioms folder', async () => {
		const { plugin, vault } = fakePlugin();
		script.query = 'break the ice';
		await createDictionaryNote(plugin, idioms);
		const note = vault.files.get('Idioms/break the ice.md') ?? '';
		assert.match(note, /^---\nidiom: break the ice\n/);
		assert.match(note, /## Origin\n\nBy application of the metaphor/);
		assert.match(note, /Source: \[Wiktionary\]\(https:\/\/en\.wiktionary\.org\/wiki\/break_the_ice\), CC BY-SA 4\.0/);
	});

	it('lets the user pick from matching idioms', async () => {
		const { plugin, vault } = fakePlugin();
		script.query = 'spill beans';
		await createDictionaryNote(plugin, idioms);
		assert.match(ui.picks[0]?.placeholder ?? '', /^Choose an idiom \(\d+ found for "spill beans"\)/);
		assert.ok(vault.files.has('Idioms/spill the beans.md'));
	});
});

describe('quote notes', () => {
	it('labels a misattributed quote in the note', async () => {
		const { plugin, vault } = fakePlugin();
		script.mode = 'author';
		script.query = 'benjamin franklin';
		script.pick = (items) => (items as Quote[]).find((q) => q.text.startsWith('The definition of insanity')) ?? null;
		await createDictionaryNote(plugin, quotes);
		const note = vault.files.get('Quotes/Benjamin Franklin - The definition of insanity is doing the same thing.md') ?? '';
		assert.match(note, /\nattribution: Misattributed\n/);
		assert.match(note, /\n> \[!warning\] Misattributed\n> Wikiquote lists this quote as misattributed to Benjamin Franklin\./);
	});

	it('starts in the remembered search mode and checks topic quotes on the author page', async () => {
		const { plugin, vault } = fakePlugin({ quoteSearchMode: 'topic' });
		script.query = 'courage';
		script.pick = (items) => (items as Quote[]).find((q) => q.text.includes('rank pride')) ?? null;
		await createDictionaryNote(plugin, quotes);
		assert.equal(ui.searches[0]?.initialMode, 'topic');
		const note = vault.files.get('Quotes/Joseph Addison - Tis pride, rank pride, and haughtiness of soul.md') ?? '';
		assert.match(note, /\nauthor: Joseph Addison\nwork: "Cato, A Tragedy"\nyear: "1713"\nattribution: Sourced\n/);
		assert.match(note, /\ntopics: \["courage","pride","soul","stoicism"\]\n/);
	});
});
