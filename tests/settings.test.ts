// Upgrading from 1.0.x: saved settings must carry over unchanged.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEFAULT_SETTINGS, sanitizeSettings } from '../src/settings';

// Exactly what 1.0.1 writes to data.json once any setting is changed:
// the whole settings object, including untouched defaults.
const SAVED_BY_1_0_1 = {
	folder: 'Dictionary',
	templateFile: '',
	ifNoteExists: 'open',
	openAfterCreate: true,
	source: 'free-dictionary',
	language: 'en',
	useFallback: true,
	mwKeySecret: '',
} as const;

describe('settings migration', () => {
	it('a fresh install uses the new defaults', () => {
		const s = sanitizeSettings(null);
		assert.equal(s.folder, 'Definitions');
		assert.equal(s.idiomFolder, 'Idioms');
		assert.equal(s.quoteFolder, 'Quotes');
		assert.equal(s.quoteSearchMode, 'keyword');
		assert.equal(s.idiomUseFallback, true);
		assert.deepEqual(s, DEFAULT_SETTINGS);
	});

	it('a 1.0.1 user with default settings keeps the "Dictionary" folder', () => {
		const s = sanitizeSettings({ ...SAVED_BY_1_0_1 });
		assert.equal(s.folder, 'Dictionary');
	});

	it('a customized 1.0.1 setup carries over completely, and new settings get defaults', () => {
		const saved = {
			folder: 'Words/English',
			templateFile: 'Templates/Dictionary note.md',
			ifNoteExists: 'new',
			openAfterCreate: false,
			source: 'merriam-webster',
			language: 'fr',
			useFallback: false,
			mwKeySecret: 'merriam-webster-key',
		} as const;
		const s = sanitizeSettings({ ...saved });
		for (const [key, value] of Object.entries(saved)) {
			assert.equal(s[key as keyof typeof s], value, `${key} should carry over`);
		}
		assert.equal(s.idiomFolder, 'Idioms');
		assert.equal(s.idiomTemplateFile, '');
		assert.equal(s.quoteFolder, 'Quotes');
		assert.equal(s.quoteTemplateFile, '');
	});

	it('repairs values that are no longer valid', () => {
		const s = sanitizeSettings({
			source: 'bogus' as never,
			language: 'English',
			ifNoteExists: 'replace' as never,
			quoteSearchMode: 'everything',
		});
		assert.equal(s.source, 'free-dictionary');
		assert.equal(s.language, 'en');
		assert.equal(s.ifNoteExists, 'open');
		assert.equal(s.quoteSearchMode, 'keyword');
	});

	it('a 1.1.0 setup carries over, and the Spanish settings get defaults', () => {
		const saved = {
			...SAVED_BY_1_0_1,
			idiomFolder: 'My idioms',
			idiomTemplateFile: 'Templates/Idiom note.md',
			idiomUseFallback: false,
			quoteFolder: 'My quotes',
			quoteTemplateFile: '',
			quoteSearchMode: 'author',
		};
		const s = sanitizeSettings({ ...saved });
		for (const [key, value] of Object.entries(saved)) {
			assert.equal(s[key as keyof typeof s], value, `${key} should carry over`);
		}
		assert.equal(s.spanishEnabled, true);
		assert.equal(s.spanishFolder, 'Definitions/Español');
		assert.equal(s.spanishTemplateFile, '');
		assert.equal(s.definitionSearchMode, 'main');
	});

	it('repairs an unknown definitions search mode', () => {
		assert.equal(sanitizeSettings({ definitionSearchMode: 'klingon' }).definitionSearchMode, 'main');
		assert.equal(sanitizeSettings({ definitionSearchMode: 'es-en' }).definitionSearchMode, 'es-en');
	});

	it('keeps a remembered quote search mode', () => {
		assert.equal(sanitizeSettings({ quoteSearchMode: 'author' }).quoteSearchMode, 'author');
	});
});
