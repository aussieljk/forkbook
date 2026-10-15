import { describe, expect, it } from 'vitest';

import { extractFrameworkPackageName } from './get-framework-name.ts';

describe('get-framework-name', () => {
  describe('extractProperFrameworkName', () => {
    it('should extract the proper framework name from the given framework field', () => {
      expect(extractFrameworkPackageName('storybook/react-vite')).toBe('storybook/react-vite');
      expect(extractFrameworkPackageName('/path/to/@storybook/react-vite')).toBe(
        'storybook/react-vite'
      );
      expect(extractFrameworkPackageName('\\path\\to\\@storybook\\react-vite')).toBe(
        'storybook/react-vite'
      );
    });

    it('should return the given framework name if it is a third-party framework', () => {
      expect(extractFrameworkPackageName('@third-party/framework')).toBe('@third-party/framework');
    });
  });
});
