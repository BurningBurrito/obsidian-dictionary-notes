import { actionApi, apiErrorCode } from '../../core/wikimedia';

const HOST = 'www.wikidata.org';
const NAME = 'Wikidata';
const HUMAN = 'Q5';

interface ClaimsResponse {
	claims?: { P31?: { mainsnak?: { datavalue?: { value?: { id?: string } } } }[] };
}

// The answer for an item never changes during a session, so ask only once.
const cache = new Map<string, boolean>();

/**
 * Whether a Wikidata item is a person ("instance of: human"). Wikiquote pages
 * link to their Wikidata item, which is how a person's page is told apart from
 * a topic page. The request is tiny (about 240 bytes).
 */
export async function isHuman(id: string): Promise<boolean> {
	if (!/^Q\d+$/.test(id)) return false;
	const cached = cache.get(id);
	if (cached !== undefined) return cached;
	const data = await actionApi(HOST, { action: 'wbgetclaims', entity: id, property: 'P31', props: '' }, NAME);
	const human =
		!apiErrorCode(data) &&
		((data as ClaimsResponse).claims?.P31 ?? []).some((c) => c.mainsnak?.datavalue?.value?.id === HUMAN);
	cache.set(id, human);
	return human;
}
