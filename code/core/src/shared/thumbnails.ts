import { dirname, isAbsolute, normalize, relative, resolve } from 'pathe';

/**
 * Story thumbnails (`parameters.thumbnail`).
 *
 * A thumbnail is a URL (`https://...`, `data:...`, `/logo.png`) or a path to a local file, relative
 * to the story file (`./button.png`). The index keeps a URL as it is. It changes a local path to
 * `thumbnails/<path from the project root>`. The dev server serves that path, and the static build
 * copies the file to it.
 */

/** The folder below the Forkbook root that has the local thumbnail files. */
export const THUMBNAIL_ROUTE = 'thumbnails';

/** File extensions that a local thumbnail can have. */
export const THUMBNAIL_TYPES: Record<string, string> = {
  avif: 'image/avif',
  gif: 'image/gif',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  png: 'image/png',
  svg: 'image/svg+xml',
  webp: 'image/webp',
};

const extension = (path: string) => path.split('.').pop()?.toLowerCase() ?? '';

/** True for a thumbnail that is a URL, not a local file. */
export const isThumbnailUrl = (value: string) => /^([a-z][a-z\d+.-]*:|\/\/|\/)/i.test(value);

/**
 * Changes a `parameters.thumbnail` value to the value in the index. Returns `undefined` for a local
 * file that is not an image, or that is not in the project folder.
 */
export const resolveThumbnail = (
  value: string | undefined,
  storyFile: string,
  workingDir: string
): string | undefined => {
  if (!value) {
    return undefined;
  }
  if (isThumbnailUrl(value) && !isAbsolute(value)) {
    return value;
  }
  // An absolute path in the file system is local, but `/logo.png` is a URL on the host.
  const file = isAbsolute(value) ? value : resolve(dirname(storyFile), value);
  if (isAbsolute(value) && !normalize(value).startsWith(normalize(workingDir))) {
    return value;
  }
  const path = relative(workingDir, file);
  if (path.startsWith('..') || !THUMBNAIL_TYPES[extension(path)]) {
    return undefined;
  }
  return `${THUMBNAIL_ROUTE}/${path}`;
};

/**
 * The local file of a thumbnail URL path (`thumbnails/src/button.png`), or `undefined` when the
 * path is not a local thumbnail.
 */
export const thumbnailFile = (urlPath: string, workingDir: string): string | undefined => {
  let path = urlPath.replace(/^\/+/, '');
  try {
    path = decodeURIComponent(path);
  } catch {
    return undefined;
  }
  if (!path.startsWith(`${THUMBNAIL_ROUTE}/`)) {
    return undefined;
  }
  const file = resolve(workingDir, path.slice(THUMBNAIL_ROUTE.length + 1));
  if (relative(workingDir, file).startsWith('..') || !THUMBNAIL_TYPES[extension(file)]) {
    return undefined;
  }
  return file;
};

/** The content type of a thumbnail file. */
export const thumbnailContentType = (file: string) =>
  THUMBNAIL_TYPES[extension(file)] ?? 'application/octet-stream';
