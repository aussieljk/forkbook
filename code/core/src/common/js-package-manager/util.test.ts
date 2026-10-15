import { describe, expect, it } from 'vitest';

import { PackageManagerName } from './JsPackageManager.ts';
import { NPMProxy } from './NPMProxy.ts';
import { PNPMProxy } from './PNPMProxy.ts';
import {
  getAgeInMinutes,
  getErrorLogs,
  getLatestStableVersionAdheringToMinimumAgeGate,
  getMswInitCommand,
  getStorybookRerunCommand,
  getVitestStorybookRunCommand,
  hasStorybookMinimumAgeExclusions,
  parsePackageData,
  parsePackageTimeMap,
  parsePositiveIntegerConfigValue,
  parseReleaseTime,
} from './util.ts';

describe('js package manager util', () => {
  it('parses package data', () => {
    expect(parsePackageData('@storybook/addon-essentials@npm:7.0.0')).toEqual({
      name: '@storybook/addon-essentials',
      value: { version: '7.0.0', location: '' },
    });
  });

  it('parses positive integer config values', () => {
    expect(parsePositiveIntegerConfigValue('1440\n')).toBe(1440);
    expect(parsePositiveIntegerConfigValue('0')).toBeNull();
    expect(parsePositiveIntegerConfigValue('false')).toBeNull();
  });

  it('parses release times', () => {
    expect(parseReleaseTime('2026-05-11T11:59:00.000Z')).toEqual(
      new Date('2026-05-11T11:59:00.000Z')
    );
    expect(parseReleaseTime('invalid')).toBeNull();
  });

  it('parses package time maps', () => {
    expect(
      parsePackageTimeMap({
        created: '2025-01-01T00:00:00.000Z',
        '10.4.0-alpha.17': '2026-05-11T11:59:00.000Z',
      })
    ).toEqual({
      created: '2025-01-01T00:00:00.000Z',
      '10.4.0-alpha.17': '2026-05-11T11:59:00.000Z',
    });
    expect(parsePackageTimeMap('bad')).toBeNull();
  });

  it('parses package time maps wrapped in an array', () => {
    expect(
      parsePackageTimeMap([
        {
          created: '2025-01-01T00:00:00.000Z',
          '10.4.0-alpha.17': '2026-05-11T11:59:00.000Z',
          invalid: null,
        },
      ])
    ).toEqual({
      created: '2025-01-01T00:00:00.000Z',
      '10.4.0-alpha.17': '2026-05-11T11:59:00.000Z',
    });
  });

  it.each([
    { input: [], description: 'an empty array' },
    { input: [{}, {}], description: 'multiple time maps' },
    { input: [[{}]], description: 'a nested array' },
    { input: [null], description: 'an array containing null' },
    { input: ['2026-05-11T11:59:00.000Z'], description: 'an array containing a timestamp' },
  ])('rejects $description as a package time map', ({ input }) => {
    expect(parsePackageTimeMap(input)).toBeNull();
  });

  it('computes package age in minutes', () => {
    expect(
      getAgeInMinutes(new Date('2026-05-11T11:00:00.000Z'), new Date('2026-05-11T12:30:00.000Z'))
    ).toBe(90);
  });

  it('finds the latest mature stable version', () => {
    expect(
      getLatestStableVersionAdheringToMinimumAgeGate(
        {
          '10.4.0-alpha.17': '2026-05-11T11:59:00.000Z',
          '10.3.2': '2026-05-01T00:00:00.000Z',
          '10.3.1': '2026-04-01T00:00:00.000Z',
        },
        1440,
        new Date('2026-05-11T12:00:00.000Z')
      )
    ).toBe('10.3.2');
  });

  it('detects when Forkbook minimum-age exclusions are already configured', () => {
    expect(
      hasStorybookMinimumAgeExclusions([
        '@aussieljk/forkbook',
        '@storybook/*',
        'eslint-plugin-storybook',
      ])
    ).toBe(true);
    expect(hasStorybookMinimumAgeExclusions(['storybook', '@storybook/react-vite'])).toBe(false);
    expect(hasStorybookMinimumAgeExclusions(['*forkbook*', '*storybook*'])).toBe(true);
  });

  it('builds the rerun command', () => {
    expect(getStorybookRerunCommand('10.3.2')).toBe('npx @aussieljk/forkbook@10.3.2 init');
    expect(getStorybookRerunCommand(null)).toBe(
      'npx @aussieljk/forkbook@<compatible-version> init'
    );
  });

  it('builds package-manager-aware setup commands', () => {
    const npm = new NPMProxy({ cwd: process.cwd(), configDir: '.forkbook' });
    const pnpm = new PNPMProxy({ cwd: process.cwd(), configDir: '.forkbook' });

    expect(getVitestStorybookRunCommand(npm)).toBe('npx vitest --project storybook run');
    expect(getVitestStorybookRunCommand(pnpm)).toBe('pnpm exec vitest --project storybook run');
    expect(getMswInitCommand(pnpm)).toBe('pnpm exec msw init ./public --save');
  });

  it('extracts structured error logs', () => {
    expect(
      getErrorLogs({
        shortMessage: 'short',
        stderr: 'stderr',
        message: 'message',
      })
    ).toBe('short\nstderr\nmessage');
  });
});
