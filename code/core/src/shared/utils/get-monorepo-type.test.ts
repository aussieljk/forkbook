import * as fs from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { getMonorepoType, monorepoConfigs } from './get-monorepo-type.ts';

vi.mock('node:fs', async () => import('../../../../__mocks__/fs.ts'));

vi.mock('@aussieljk/forkbook/internal/common', async (importOriginal) => {
  return {
    ...(await importOriginal<typeof import('@aussieljk/forkbook/internal/common')>()),
    getProjectRoot: () => 'root',
  };
});

const checkMonorepoType = ({
  monorepoConfigFile,
  isYarnWorkspace = false,
}: {
  monorepoConfigFile?: string;
  isYarnWorkspace?: boolean;
}) => {
  const mockFiles = {
    [join('root', 'package.json')]: isYarnWorkspace ? '{ "workspaces": [] }' : '{}',
  };

  if (monorepoConfigFile) {
    mockFiles[join('root', monorepoConfigFile)] = '{}';
  }

  // node:fs is the mock module, which adds `__setMockFiles`.
  (fs as unknown as typeof import('../../../../__mocks__/fs.ts')).__setMockFiles(mockFiles);

  return getMonorepoType();
};

describe('getMonorepoType', () => {
  describe('Monorepos from json files', () => {
    it.each(Object.entries(monorepoConfigs))(
      'should detect %p from %s file',
      (monorepoName, monorepoConfigFile) => {
        expect(checkMonorepoType({ monorepoConfigFile })).toEqual(monorepoName);
      }
    );
  });

  describe('Yarn|NPM workspaces', () => {
    it('should detect Workspaces from package.json', () => {
      expect(checkMonorepoType({ monorepoConfigFile: undefined, isYarnWorkspace: true })).toEqual(
        'Workspaces'
      );
    });
  });

  describe('Non-monorepos', () => {
    it('should return undefined', () => {
      expect(checkMonorepoType({ monorepoConfigFile: undefined, isYarnWorkspace: false })).toEqual(
        undefined
      );
    });
  });
});
