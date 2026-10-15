import { describe, expect, it } from 'vitest';

import { isCorePackage, isSatelliteAddon } from './cli.ts';

describe('UTILS', () => {
  describe.each([
    ['@aussieljk/forkbook/react', true],
    ['@aussieljk/forkbook', true],
    ['storybook', false],
    ['@storybook/linter-config', false],
    ['@storybook/design-system', false],
    ['@storybook/addon-styling', false],
    ['@storybook/addon-styling-webpack', false],
    ['@storybook/addon-webpack5-compiler-swc', false],
    ['@storybook/addon-webpack5-compiler-babel', false],
    ['@nx/storybook', false],
    ['@nrwl/storybook', false],
  ])('isCorePackage', (input, output) => {
    it(`It should return "${output}" when given "${input}"`, () => {
      expect(isCorePackage(input)).toEqual(output);
    });
  });

  it('classifies @aussieljk/forkbook/addon-mcp as a core monorepo package, not a satellite addon', () => {
    expect(isCorePackage('@aussieljk/forkbook/addon-mcp')).toBe(true);
    expect(isSatelliteAddon('@aussieljk/forkbook/addon-mcp')).toBe(false);
  });
});
