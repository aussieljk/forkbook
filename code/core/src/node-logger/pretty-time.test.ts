import { expect, it } from 'vitest';

import { prettyTime } from './pretty-time.ts';

it('formats a duration in its largest unit', () => {
  expect(prettyTime([2, 500_000_000])).toBe('2.5 s');
  expect(prettyTime([0, 340_000_000])).toBe('340 ms');
  expect(prettyTime([0, 1_234_567])).toBe('1.23 ms');
  expect(prettyTime([90, 0])).toBe('1.5 min');
  expect(prettyTime([7200, 0])).toBe('2 h');
  expect(prettyTime([0, 0])).toBe('');
});
