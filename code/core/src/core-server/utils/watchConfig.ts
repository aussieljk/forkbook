import type { Path } from '@aussieljk/forkbook/internal/types';

import { watchDirectories } from './watch-story-specifiers.ts';

/** Watch the `.forkbook` dir for changes */
export function watchConfig(
  configDir: Path,
  onInvalidate: (path: Path, removed: boolean) => Promise<void>
) {
  return watchDirectories([configDir], async (events) => {
    await Promise.all(events.map(({ path, type }) => onInvalidate(path, type === 'delete')));
  });
}
