import { expect, test } from 'vitest';

const { run, cleanLog } = require('../helpers.cjs');

test('suggests the closest match to an unknown command', () => {
  const { status, stdout } = run(['ad']);

  // Assertions
  expect(status).toBe(1);
  const stdoutString = cleanLog(stdout.toString());

  // Error messages are now written to stdout
  expect(stdoutString).toContain('Invalid command: ad.');
  expect(stdoutString).toContain('Did you mean add?');
});

test('help command', () => {
  const { status, stdout, stderr } = run(['help']);

  const stderrString = cleanLog(stderr.toString());
  const stdoutString = cleanLog(stdout.toString());

  expect(stderrString).toBe('');
  expect(stdoutString).toContain('init');
  expect(stdoutString).toContain('Initialize Storybook into your project');

  expect(stdoutString).toContain('add');
  expect(stdoutString).toContain('Add an addon to your Storybook');

  expect(stdoutString).toContain('remove');
  expect(stdoutString).toContain('Remove an addon from your Storybook');

  expect(stdoutString).toContain('info');
  expect(stdoutString).toContain('Prints debugging information about the local');

  expect(status).toBe(0);
});
