import { resolve } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockCacheStore, mockCache } = vi.hoisted(() => {
  const store = new Map<string, unknown>();
  return {
    mockCacheStore: store,
    mockCache: {
      get: async (key: string) => store.get(key),
      set: async (key: string, value: unknown) => {
        store.set(key, value);
      },
    },
  };
});

vi.mock('@aussieljk/forkbook/internal/common', () => ({
  cache: mockCache,
}));

describe('ai-checklist-flags', () => {
  beforeEach(() => {
    mockCacheStore.clear();
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe('hasAiInitOptIn', () => {
    it('returns false when nothing is cached', async () => {
      const { hasAiInitOptIn } = await import('./ai-checklist-flags.ts');
      expect(await hasAiInitOptIn('/some/project/.forkbook')).toBe(false);
    });

    it('returns false when the cached configDir is for a different project', async () => {
      mockCacheStore.set('ai-init-opt-in', {
        timestamp: Date.now(),
        configDir: resolve('/repo/apps/web/.forkbook'),
      });
      const { hasAiInitOptIn } = await import('./ai-checklist-flags.ts');
      expect(await hasAiInitOptIn('/repo/packages/ui/.forkbook')).toBe(false);
    });

    it('returns false when the cached entry lacks a configDir field', async () => {
      // Defensive — should never happen in practice because the CLI always
      // writes configDir, but a corrupted cache shouldn't unlock this flag.
      mockCacheStore.set('ai-init-opt-in', { timestamp: Date.now() });
      const { hasAiInitOptIn } = await import('./ai-checklist-flags.ts');
      expect(await hasAiInitOptIn('/any/project/.forkbook')).toBe(false);
    });

    it('returns true when the cached configDir matches the resolved input', async () => {
      mockCacheStore.set('ai-init-opt-in', {
        timestamp: Date.now(),
        configDir: resolve('/repo/apps/web/.forkbook'),
        answer: true,
      });
      const { hasAiInitOptIn } = await import('./ai-checklist-flags.ts');
      expect(await hasAiInitOptIn('/repo/apps/web/.forkbook')).toBe(true);
    });

    it('returns false when the cached entry is for this project and indicates user opt-out', async () => {
      // Defensive — should never happen in practice because the CLI always
      // writes configDir, but a corrupted cache shouldn't unlock this flag.
      mockCacheStore.set('ai-init-opt-in', {
        timestamp: Date.now(),
        configDir: resolve('/repo/apps/web/.forkbook'),
        answer: false,
      });
      const { hasAiInitOptIn } = await import('./ai-checklist-flags.ts');
      expect(await hasAiInitOptIn('/repo/apps/web/.forkbook')).toBe(false);
    });
  });

  describe('hasAiSetupRun', () => {
    it('returns false when nothing is cached', async () => {
      const { hasAiSetupRun } = await import('./ai-checklist-flags.ts');
      expect(await hasAiSetupRun('/some/project/.forkbook')).toBe(false);
    });

    it('returns true when the cached configDir matches', async () => {
      mockCacheStore.set('ai-setup-ran', {
        timestamp: Date.now(),
        configDir: resolve('/repo/apps/web/.forkbook'),
      });
      const { hasAiSetupRun } = await import('./ai-checklist-flags.ts');
      expect(await hasAiSetupRun('/repo/apps/web/.forkbook')).toBe(true);
    });

    it('returns false when the cached configDir is for a sibling monorepo project', async () => {
      // Regression: running `forkbook skills setup` in one repo must not flip
      // another repo's checklist to "done".
      mockCacheStore.set('ai-setup-ran', {
        timestamp: Date.now(),
        configDir: resolve('/repo/apps/web/.forkbook'),
      });
      const { hasAiSetupRun } = await import('./ai-checklist-flags.ts');
      expect(await hasAiSetupRun('/repo/packages/ui/.forkbook')).toBe(false);
    });

    it('treats relative input as resolved against cwd', async () => {
      mockCacheStore.set('ai-setup-ran', {
        timestamp: Date.now(),
        configDir: resolve('.forkbook'),
      });
      const { hasAiSetupRun } = await import('./ai-checklist-flags.ts');
      expect(await hasAiSetupRun('.forkbook')).toBe(true);
    });

    it('returns false when the cached entry lacks a configDir field', async () => {
      mockCacheStore.set('ai-setup-ran', { timestamp: Date.now() });
      const { hasAiSetupRun } = await import('./ai-checklist-flags.ts');
      expect(await hasAiSetupRun('/any/project/.forkbook')).toBe(false);
    });
  });

  describe('getAiSetupRunId', () => {
    it('returns undefined when nothing is cached', async () => {
      const { getAiSetupRunId } = await import('./ai-checklist-flags.ts');
      expect(await getAiSetupRunId('/some/project/.forkbook')).toBeUndefined();
    });

    it('returns the runId when the cached configDir matches', async () => {
      mockCacheStore.set('ai-setup-ran', {
        timestamp: Date.now(),
        configDir: resolve('/repo/apps/web/.forkbook'),
        runId: 'abc123',
      });
      const { getAiSetupRunId } = await import('./ai-checklist-flags.ts');
      expect(await getAiSetupRunId('/repo/apps/web/.forkbook')).toBe('abc123');
    });

    it('returns undefined when the cached configDir is for a different project', async () => {
      mockCacheStore.set('ai-setup-ran', {
        timestamp: Date.now(),
        configDir: resolve('/repo/apps/web/.forkbook'),
        runId: 'abc123',
      });
      const { getAiSetupRunId } = await import('./ai-checklist-flags.ts');
      expect(await getAiSetupRunId('/repo/packages/ui/.forkbook')).toBeUndefined();
    });
  });
});
