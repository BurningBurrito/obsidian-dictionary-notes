import type { App } from 'obsidian';
import type { TemplateVariables } from '../core/render';
import type DictionaryNotesPlugin from '../main';
import type { DictionaryNotesSettings, NoteSettingKey } from '../settings';
import type { SearchMode, SearchReview } from '../ui/search-modal';

export type LookupTypeId = 'definitions' | 'idioms' | 'quotes';

/** Where a note goes and which template it's made from. */
export interface NoteTarget {
	folder: string;
	templateFile: string;
	/** Used when templateFile is empty or missing. */
	builtInTemplate: string;
}

/**
 * One kind of dictionary note: definitions, idioms, or quotes. The shared flow
 * in core/flow.ts runs the same steps for every type, in this order:
 *
 *   find → chooseItem → noteName (existing note check) → chooseDetail → variables
 *
 * Each type supplies only what differs. Steps a type doesn't need just pass
 * their input through.
 */
export interface LookupType<Found, Item, Detail> {
	id: LookupTypeId;
	/** Command ID. Never change it after a release: users' hotkeys are bound to it. */
	commandId: string;
	commandName: string;
	/** Settings heading, e.g. "Definitions". */
	heading: string;
	/** What one note is called in messages, e.g. "definition". */
	noun: string;
	/** Label and icon in the ribbon menu. */
	menuTitle: string;
	icon: string;
	search: {
		title: string;
		placeholder: string;
		emptyMessage: string;
		modes?: SearchMode[];
	};
	/** Where this type's folder and template file live in the settings. */
	settingKeys: { folder: NoteSettingKey; templateFile: NoteSettingKey };
	/** Search buttons that depend on the settings; overrides search.modes. Empty or undefined: no buttons. */
	searchModes?(settings: DictionaryNotesSettings): SearchMode[] | undefined;
	/** Settings key that remembers the last search mode (types with modes only). */
	searchModeKey?: 'quoteSearchMode' | 'definitionSearchMode';
	defaultTemplate: string;
	/** Where "Create an editable template" saves a copy of the built-in template. */
	templateCopyPath: string;
	/** Folder and template for one item, when they depend on the item. Default: settingKeys and defaultTemplate. */
	target?(item: Item, settings: DictionaryNotesSettings): NoteTarget;

	/** Look up what the user typed. Runs inside the search window; throw a LookupError on failure. */
	find(query: string, plugin: DictionaryNotesPlugin, mode: string | undefined): Promise<Found>;
	/** A question to ask before the search window closes, e.g. when the word is a form of another word. */
	review?(found: Found): SearchReview | undefined;
	/** A message to show once the search window closes, e.g. that a backup source answered. */
	notice?(found: Found): string | undefined;
	/** Pick what the note is about. May show a list or fetch more data. Null means cancelled. */
	chooseItem(app: App, found: Found): Promise<Item | null>;
	/** The note's file name without ".md", already safe for the file system. */
	noteName(item: Item): string;
	/** How messages refer to the item, e.g. the word itself. */
	displayName(item: Item): string;
	/** Pick a detail, such as which meaning. Null means cancelled. */
	chooseDetail(app: App, item: Item): Promise<Detail | null>;
	variables(item: Item, detail: Detail): TemplateVariables;
}
