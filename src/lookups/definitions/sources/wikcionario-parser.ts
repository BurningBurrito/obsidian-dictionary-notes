import { parseHtml } from '../../../core/html';
import { collapseWhitespace, uniqueStrings } from '../../../core/utils';
import { wikiPageUrl } from '../../../core/wikimedia';
import type { Sense } from '../../senses';
import type { WordEntry } from '../types';

// Reads the "Español" section of a Wikcionario page (the HTML from action=parse).
// The layout it relies on:
// - "Etimología" headings, each followed by a paragraph with the word's origin.
// - Part-of-speech headings ("Sustantivo femenino", "Verbo intransitivo",
//   "Forma verbal"), each followed by definition lists: <dt>1 Música</dt><dd>…</dd>.
// - Inside or right after a definition, labeled items: "Sinónimos:", "Antónimo:",
//   "Ejemplo:". A form of another word is marked with "definicion-impropia" and
//   ends with a link to that word.
// - The pronunciation table ("pron-graf") gives the IPA after "AFI".

export const WIKCIONARIO_HOST = 'es.wiktionary.org';

// Sections without definitions.
const SKIPPED = /^(locuciones|refranes|conjugación|información adicional|véase también|traducciones|referencias y notas|descendientes|compuestos|derivados)/i;
// Wikcionario's placeholder when the origin isn't known yet.
const NO_ETYMOLOGY = /si puedes,? incorpórala/i;

export function parseWikcionario(html: string, word: string): WordEntry | null {
	const root = parseHtml(html);
	const container = root.querySelector('.mw-parser-output') ?? root;

	const senses: Sense[] = [];
	const etymologies: string[] = [];
	let partOfSpeech = '';
	let skipping = false;
	let expectEtymology = false;

	for (const el of Array.from(container.children)) {
		const heading = headingOf(el);
		if (heading) {
			if (heading.level <= 2) continue; // the language heading, "Español"
			expectEtymology = heading.text.startsWith('Etimología');
			skipping = SKIPPED.test(heading.text);
			partOfSpeech = expectEtymology || skipping ? '' : heading.text.toLowerCase();
		} else if (el.tagName === 'P' && expectEtymology) {
			const text = collapseWhitespace(el.textContent ?? '');
			if (text && !NO_ETYMOLOGY.test(text)) etymologies.push(text);
			expectEtymology = false;
		} else if (el.tagName === 'DL' && partOfSpeech && !skipping) {
			readDefinitionList(el, partOfSpeech, senses);
		}
	}
	if (senses.length === 0) return null;

	return {
		word,
		language: 'es',
		explainedIn: 'es',
		phonetic: firstIpa(container),
		audioUrl: '',
		etymology: etymologies[0] ?? '',
		senses,
		synonyms: uniqueStrings(senses.flatMap((s) => s.synonyms), [word]),
		antonyms: uniqueStrings(senses.flatMap((s) => s.antonyms), [word]),
		source: {
			id: 'wikcionario',
			name: 'Wikcionario',
			url: wikiPageUrl(WIKCIONARIO_HOST, word, 'Español'),
			license: 'CC BY-SA 4.0',
			licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
		},
	};
}

function headingOf(el: Element): { level: number; text: string } | undefined {
	const h = /^H[2-6]$/.test(el.tagName)
		? el
		: el.classList.contains('mw-heading')
			? el.querySelector('h2, h3, h4, h5, h6')
			: null;
	if (!h) return undefined;
	return { level: Number(h.tagName[1]), text: collapseWhitespace(h.textContent ?? '') };
}

/**
 * A <dt> starts a definition and the <dd> after it holds the text. A <dd>
 * without a <dt> (often in a list of its own) adds examples or synonyms to the
 * definition before it.
 */
function readDefinitionList(dl: Element, partOfSpeech: string, senses: Sense[]) {
	let label: string | undefined;
	for (const child of Array.from(dl.children)) {
		if (child.tagName === 'DT') {
			// "1 Música" -> "Música"; "1" -> ""
			label = collapseWhitespace(child.textContent ?? '').replace(/^\d+[a-z]?\s*/, '');
		} else if (child.tagName === 'DD') {
			const extras = labeledItems(child);
			if (label !== undefined) {
				const text = ownText(child);
				if (text) {
					senses.push({
						partOfSpeech,
						definition: label ? `(${label}) ${text}` : text,
						examples: extras.examples,
						synonyms: extras.synonyms,
						antonyms: extras.antonyms,
						depth: 0,
						baseWord: baseWordOf(child),
					});
				}
				label = undefined;
			} else {
				const last = senses[senses.length - 1];
				if (last) {
					last.examples = uniqueStrings([...last.examples, ...extras.examples]);
					last.synonyms = uniqueStrings([...last.synonyms, ...extras.synonyms]);
					last.antonyms = uniqueStrings([...last.antonyms, ...extras.antonyms]);
				}
			}
		}
	}
}

/** The definition text, without its labeled items, styles, or footnote markers. */
function ownText(dd: Element): string {
	const copy = dd.cloneNode(true) as Element;
	copy.querySelectorAll('ul, ol, dl, style, sup.reference').forEach((n) => n.remove());
	return collapseWhitespace(copy.textContent ?? '');
}

/** "Sinónimos: a, b." "Antónimo: c." "Ejemplo: …" items below a definition. */
function labeledItems(dd: Element): { examples: string[]; synonyms: string[]; antonyms: string[] } {
	const result = { examples: [] as string[], synonyms: [] as string[], antonyms: [] as string[] };
	for (const li of Array.from(dd.querySelectorAll(':scope > ul > li'))) {
		const label = collapseWhitespace(li.querySelector('b')?.textContent ?? '').toLowerCase();
		const copy = li.cloneNode(true) as Element;
		copy.querySelector('b')?.remove();
		copy.querySelectorAll('ul, ol, style, sup.reference').forEach((n) => n.remove());
		const value = collapseWhitespace(copy.textContent ?? '');
		if (!value) continue;
		if (label.startsWith('ejemplo')) result.examples.push(value);
		else if (label.startsWith('sinónimo')) result.synonyms.push(...list(value));
		else if (label.startsWith('antónimo')) result.antonyms.push(...list(value));
	}
	return result;
}

/** "ajetrearse, darse prisa." -> ["ajetrearse", "darse prisa"] */
function list(value: string): string[] {
	return uniqueStrings(value.replace(/\.$/, '').split(/[,;]/));
}

/** For a form of another word ("Primera persona … de correr."), that word. */
function baseWordOf(dd: Element): string | undefined {
	if (!dd.querySelector('.definicion-impropia')) return undefined;
	const copy = dd.cloneNode(true) as Element;
	copy.querySelectorAll('ul, ol, dl, .definicion-impropia').forEach((n) => n.remove());
	const links = Array.from(copy.querySelectorAll('a[href^="/wiki/"]'));
	const link = links[links.length - 1];
	return link ? link.getAttribute('title') || collapseWhitespace(link.textContent ?? '') || undefined : undefined;
}

/** The first pronunciation in IPA, e.g. "[kãnˈsjõn]". */
function firstIpa(container: Element): string {
	for (const row of Array.from(container.querySelectorAll('table.pron-graf tr'))) {
		const cells = row.querySelectorAll('td');
		if (cells.length >= 2 && /AFI/.test(cells[0]?.textContent ?? '')) {
			const ipa = /\[[^\]]+\]/.exec(cells[1]?.textContent ?? '')?.[0];
			if (ipa) return ipa;
		}
	}
	return '';
}
