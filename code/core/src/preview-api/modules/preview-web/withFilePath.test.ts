import { describe, expect, it } from 'vitest';

import { parseWsToken } from '../../../channels/index.ts';
import { withFilePath } from './withFilePath.ts';

describe('withFilePath', () => {
  it('adds the file below the first line and keeps the stack as detail', () => {
    const result = withFilePath(
      { message: 'Boom', stack: 'Error: Boom\n  at Story' },
      './src/Button.stories.tsx'
    );
    expect(result.message).toBe('Boom\nIn ./src/Button.stories.tsx\n\nError: Boom\n  at Story');
  });

  it('keeps the detail of a message with more than one line', () => {
    const result = withFilePath({ message: 'Boom\n\nMore detail' }, './a.stories.tsx');
    expect(result.message).toBe('Boom\nIn ./a.stories.tsx\n\nMore detail');
  });

  it('does not change the error without a path or when the message has the path', () => {
    expect(withFilePath({ message: 'Boom', stack: 's' }, undefined)).toEqual({
      message: 'Boom',
      stack: 's',
    });
    expect(withFilePath({ message: 'Failed ./a.ts', stack: 's' }, './a.ts').message).toBe(
      'Failed ./a.ts'
    );
  });
});

describe('parseWsToken', () => {
  it('reads the token from the channel options in the page HTML', () => {
    expect(parseWsToken('<script>window.CHANNEL_OPTIONS = {"wsToken":"abc-123"};</script>')).toBe(
      'abc-123'
    );
    expect(parseWsToken('<html></html>')).toBeUndefined();
  });
});
