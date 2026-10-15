import type { Path } from 'storybook/internal/types';

import { watchDirectories } from './watch-story-specifiers.ts';

/** Watch the `.storybook` dir for changes */
export function watchConfig(
  configDir: Path,
  onInvalidate: (path: Path, removed: boolean) => Promise<void>
) {
  return watchDirectories([configDir], async (events) => {
    await Promise.all(events.map(({ path, type }) => onInvalidate(path, type === 'delete')));
  });
}
