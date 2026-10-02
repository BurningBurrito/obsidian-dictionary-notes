import { collapseWhitespace } from './utils';

// DOMParser builds an inert document (no scripts run, no images load), so it's
// safe for reading text out of HTML that an API sends.
export function parseHtml(html: string): HTMLElement {
	return new DOMParser().parseFromString(html, 'text/html').body;
}

export function htmlToText(html: string): string {
	return elementText(parseHtml(html));
}

/** Text of an element without its nested lists (sub-senses and quotations). */
export function elementText(el: Element): string {
	const copy = el.cloneNode(true) as Element;
	copy.querySelectorAll('ol, ul, dl, style, sup.reference').forEach((n) => n.remove());
	return collapseWhitespace(copy.textContent ?? '');
}
