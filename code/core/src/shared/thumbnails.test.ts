import { describe, expect, it } from 'vitest';

import {
  isThumbnailUrl,
  resolveThumbnail,
  thumbnailContentType,
  thumbnailFile,
} from './thumbnails.ts';

const workingDir = '/project';
const storyFile = '/project/src/Button.stories.tsx';

describe('isThumbnailUrl', () => {
  it('is true for URLs', () => {
    expect(isThumbnailUrl('https://example.com/a.png')).toBe(true);
    expect(isThumbnailUrl('data:image/png;base64,AAAA')).toBe(true);
    expect(isThumbnailUrl('//cdn.example.com/a.png')).toBe(true);
    expect(isThumbnailUrl('/logo.png')).toBe(true);
  });

  it('is false for relative paths', () => {
    expect(isThumbnailUrl('./button.png')).toBe(false);
    expect(isThumbnailUrl('button.png')).toBe(false);
    expect(isThumbnailUrl('thumbnails/src/button.png')).toBe(false);
  });
});

describe('resolveThumbnail', () => {
  it('keeps URLs', () => {
    expect(resolveThumbnail('https://example.com/a.png', storyFile, workingDir)).toBe(
      'https://example.com/a.png'
    );
    expect(resolveThumbnail('/logo.png', storyFile, workingDir)).toBe('/logo.png');
  });

  it('gives undefined for no value', () => {
    expect(resolveThumbnail(undefined, storyFile, workingDir)).toBeUndefined();
    expect(resolveThumbnail('', storyFile, workingDir)).toBeUndefined();
  });

  it('changes a local file to a path below the thumbnail route', () => {
    expect(resolveThumbnail('./button.png', storyFile, workingDir)).toBe(
      'thumbnails/src/button.png'
    );
    expect(resolveThumbnail('../assets/b.webp', storyFile, workingDir)).toBe(
      'thumbnails/assets/b.webp'
    );
  });

  it('changes an absolute file in the project to a path below the thumbnail route', () => {
    expect(resolveThumbnail('/project/src/button.png', storyFile, workingDir)).toBe(
      'thumbnails/src/button.png'
    );
  });

  it('refuses files outside the project and files that are not images', () => {
    expect(resolveThumbnail('../../secret.png', storyFile, workingDir)).toBeUndefined();
    expect(resolveThumbnail('./button.txt', storyFile, workingDir)).toBeUndefined();
  });
});

describe('thumbnailFile', () => {
  it('gives the local file of a thumbnail path', () => {
    expect(thumbnailFile('thumbnails/src/button.png', workingDir)).toBe('/project/src/button.png');
    expect(thumbnailFile('/thumbnails/src/my%20button.png', workingDir)).toBe(
      '/project/src/my button.png'
    );
  });

  it('refuses other paths, files outside the project and bad URLs', () => {
    expect(thumbnailFile('/other/button.png', workingDir)).toBeUndefined();
    expect(thumbnailFile('thumbnails/../../etc/a.png', workingDir)).toBeUndefined();
    expect(thumbnailFile('thumbnails/%2e%2e/%2e%2e/a.png', workingDir)).toBeUndefined();
    expect(thumbnailFile('thumbnails/src/a.ts', workingDir)).toBeUndefined();
    expect(thumbnailFile('thumbnails/%E0%A4%A', workingDir)).toBeUndefined();
  });
});

describe('thumbnailContentType', () => {
  it('gives the image type', () => {
    expect(thumbnailContentType('a.svg')).toBe('image/svg+xml');
    expect(thumbnailContentType('a.JPG')).toBe('image/jpeg');
    expect(thumbnailContentType('a.bin')).toBe('application/octet-stream');
  });
});
