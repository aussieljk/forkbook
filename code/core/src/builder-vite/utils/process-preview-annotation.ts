import type { PreviewAnnotation } from '@aussieljk/forkbook/internal/types';

import { isAbsolute, normalize, resolve } from 'pathe';

/** Preview annotations can take several forms, so we normalize them here to absolute file paths. */
export function processPreviewAnnotation(path: PreviewAnnotation, projectRoot: string) {
  // If entry is an object, take the absolute specifier.
  // This absolute specifier is automatically made for addons here:
  // https://github.com/storybookjs/storybook/blob/ac6e73b9d8ce31dd9acc80999c8d7c22a111f3cc/code/core/src/common/presets.ts#L161-L171
  if (typeof path === 'object') {
    return normalize(path.absolute);
  }

  // If it's already an absolute path, return it.
  if (isAbsolute(path)) {
    return normalize(path);
  }
  // resolve relative paths, relative to project root
  return normalize(resolve(projectRoot, path));
}
