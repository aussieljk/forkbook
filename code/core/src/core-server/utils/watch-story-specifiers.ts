import { lstatSync } from 'node:fs';
import { basename, join, relative, resolve, sep } from 'node:path';

import { commonGlobOptions } from 'storybook/internal/common';
import type { NormalizedStoriesSpecifier, Path } from 'storybook/internal/types';

// eslint-disable-next-line depend/ban-dependencies
import slash from 'slash';
import { type Event, subscribe } from '@parcel/watcher';

const isDirectory = (directory: Path) => {
  try {
    return lstatSync(directory).isDirectory();
  } catch (err) {
    return false;
  }
};

/**
 * Watch directories and everything in them. Returns a function that stops watching. A directory
 * inside another watched directory is not watched again, so each event comes only once.
 */
export function watchDirectories(directories: Path[], onEvents: (events: Event[]) => void) {
  const existing = [...new Set(directories)].filter(isDirectory);
  const roots = existing.filter(
    (directory) => !existing.some((other) => directory.startsWith(other + sep))
  );
  const subscriptions = Promise.all(
    roots.map((directory) =>
      subscribe(
        directory,
        (error, events) => {
          if (!error) {
            onEvents(events);
          }
        },
        { ignore: ['**/.git', '**/node_modules'] }
      )
    )
  );

  return async () => {
    await Promise.all((await subscriptions).map((subscription) => subscription.unsubscribe()));
  };
}

export function watchStorySpecifiers(
  specifiers: NormalizedStoriesSpecifier[],
  options: { workingDir: Path },
  onInvalidate: (path: Path, removed: boolean) => void
) {
  const toImportPath = (absolutePath: Path) => {
    const relativePath = relative(options.workingDir, absolutePath);
    return slash(relativePath.startsWith('.') ? relativePath : `./${relativePath}`);
  };

  async function onChangeOrRemove(absolutePath: Path, removed: boolean) {
    // The watcher gives absolute paths. Convert to an import path so we can run against the specifiers.
    const importPath = toImportPath(absolutePath);

    const matchingSpecifier = specifiers.find((ns) => ns.importPathMatcher.exec(importPath));
    if (matchingSpecifier) {
      onInvalidate(importPath, removed);
      return;
    }

    // When a directory is removed, the watcher fires a delete event for each file also
    // (so we don't need to do anything special).
    // However, when a directory is added, it does not fire events for any files *within* the directory,
    // so we need to scan within that directory for new files. It is tricky to use a glob for this,
    // so we'll do something a bit more "dumb" for now
    if (!removed && isDirectory(absolutePath)) {
      await Promise.all(
        specifiers
          // We only receive events for files (incl. directories) that are *within* a specifier,
          // so will match one (or more) specifiers with this simple `startsWith`
          .filter((specifier) => importPath.startsWith(specifier.directory))
          .map(async (specifier) => {
            // If `./path/to/dir` was added, check all files matching `./path/to/dir/**/*.stories.*`
            // (where the last bit depends on `files`).
            const dirGlob = join(
              absolutePath,
              '**',
              // files can be e.g. '**/foo/*/*.js' so we just want the last bit,
              // because the directory could already be within the files part (e.g. './x/foo/bar')
              basename(specifier.files)
            );

            // Dynamically import globby because it is a pure ESM module
            // eslint-disable-next-line depend/ban-dependencies
            const { globby } = await import('globby');

            // glob only supports forward slashes
            const addedFiles = await globby(slash(dirGlob), commonGlobOptions(dirGlob));

            addedFiles.forEach((filePath: Path) => {
              const fileImportPath = toImportPath(filePath);

              if (specifier.importPathMatcher.exec(fileImportPath)) {
                onInvalidate(fileImportPath, removed);
              }
            });
          })
      );
    }
  }

  return watchDirectories(
    specifiers.map((ns) => resolve(options.workingDir, ns.directory)),
    async (events) => {
      // The last event for a path wins.
      const removedByPath = new Map(events.map(({ path, type }) => [path, type === 'delete']));
      await Promise.all(
        Array.from(removedByPath, ([path, removed]) => onChangeOrRemove(path, removed))
      );
    }
  );
}
