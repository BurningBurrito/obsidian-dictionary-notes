import { definitions } from './definitions';
import { idioms } from './idioms';
import type { LookupType } from './lookup-type';

export type AnyLookupType = LookupType<unknown, unknown, unknown>;

/** Every lookup type, in ribbon menu, command, and settings order. */
export const LOOKUP_TYPES: AnyLookupType[] = [definitions, idioms];
