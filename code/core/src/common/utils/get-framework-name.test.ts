import { describe, expect, it } from 'vitest';

import {
  extractFrameworkPackageName,
  forkbookFramework,
  withForkbookFramework,
} from './get-framework-name.ts';

describe('get-framework-name', () => {
  describe('extractProperFrameworkName', () => {
    it('should extract the proper framework name from the given framework field', () => {
      expect(extractFrameworkPackageName('@aussieljk/forkbook/react-vite')).toBe(
        '@aussieljk/forkbook/react-vite'
      );
    });

    it('should return the given framework name if it is a third-party framework', () => {
      expect(extractFrameworkPackageName('@third-party/framework')).toBe('@third-party/framework');
    });

    it('should give the Forkbook name for a Storybook framework name', () => {
      expect(extractFrameworkPackageName('@storybook/nextjs-vite')).toBe(
        '@aussieljk/forkbook/nextjs-vite'
      );
      expect(extractFrameworkPackageName('@storybook/react-vite')).toBe(
        '@aussieljk/forkbook/react-vite'
      );
    });
  });

  describe('forkbookFramework', () => {
    it('changes a Storybook name in a string field', () => {
      expect(forkbookFramework('@storybook/nextjs-vite')).toBe('@aussieljk/forkbook/nextjs-vite');
    });

    it('changes a Storybook name in an object field and keeps the options', () => {
      expect(forkbookFramework({ name: '@storybook/react-vite', options: { a: 1 } })).toEqual({
        name: '@aussieljk/forkbook/react-vite',
        options: { a: 1 },
      });
    });

    it('keeps other names', () => {
      expect(forkbookFramework('@aussieljk/forkbook/react-vite')).toBe(
        '@aussieljk/forkbook/react-vite'
      );
      expect(forkbookFramework(undefined)).toBeUndefined();
    });
  });

  describe('withForkbookFramework', () => {
    it('gives a new config with the Forkbook name', () => {
      const config = { stories: [], framework: '@storybook/nextjs-vite' };
      expect(withForkbookFramework(config)).toEqual({
        stories: [],
        framework: '@aussieljk/forkbook/nextjs-vite',
      });
      expect(config.framework).toBe('@storybook/nextjs-vite');
    });

    it('gives the same config when there is nothing to change', () => {
      const config = { framework: '@aussieljk/forkbook/react-vite' };
      expect(withForkbookFramework(config)).toBe(config);
    });
  });
});
