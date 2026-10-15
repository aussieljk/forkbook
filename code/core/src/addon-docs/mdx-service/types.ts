import type { MdxPayload } from '@aussieljk/forkbook/internal/core-server';
import type { DocsIndexEntry } from '@aussieljk/forkbook/internal/types';

export interface MdxProviderInput {
  componentId: string;
  entries: DocsIndexEntry[];
}

export type MdxProvider = (input: MdxProviderInput) => Promise<MdxPayload | undefined>;
