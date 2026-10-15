import { join } from 'node:path';

import { beforeEach, describe, expect, test, vi } from 'vitest';

import { logger } from '@aussieljk/forkbook/internal/node-logger';

import { PackageManagerName } from '../common/index.ts';
import { add, getVersionSpecifier } from './add.ts';

const MockedConfig = vi.hoisted(() => {
  return {
    appendValueToArray: vi.fn(),
    getFieldNode: vi.fn(),
    valueToNode: vi.fn(),
    appendNodeToArray: vi.fn(),
  };
});
const MockedPackageManager = vi.hoisted(() => {
  return {
    getPrimaryPackageJson: vi.fn(() => ({
      packageJson: {
        devDependencies: {},
        dependencies: {},
      },
      packageJsonPath: 'some/path',
      operationDir: 'some/path',
    })),
    getDependencyVersion: vi.fn(() => '^8.0.0'),
    latestVersion: vi.fn(() => '1.0.0'),
    addDependencies: vi.fn(() => {}),
    type: 'npm',
  };
});
const MockedPostInstall = vi.hoisted(() => {
  return {
    postinstallAddon: vi.fn(),
  };
});
const MockWrapGetAbsolutePathUtils = vi.hoisted(() => {
  return {
    getAbsolutePathWrapperName: vi.fn(),
    wrapValueWithGetAbsolutePathWrapper: vi.fn(),
  };
});
const MockedConsole = {
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
} as any as Console;

const MockedStorybookInfo = vi.hoisted(() => {
  return {
    getStorybookInfo: vi.fn(() => ({
      mainConfig: {},
      mainConfigPath: '.forkbook/main.ts',
      configDir: '.forkbook',
      previewConfigPath: '.forkbook/preview.ts',
    })),
  };
});

vi.mock('@aussieljk/forkbook/internal/csf-tools', () => {
  return {
    readConfig: vi.fn(() => MockedConfig),
    writeConfig: vi.fn(),
  };
});
vi.mock('./postinstallAddon', () => {
  return MockedPostInstall;
});
vi.mock('@aussieljk/forkbook/internal/common', () => {
  return {
    getStorybookInfo: MockedStorybookInfo.getStorybookInfo,
    loadMainConfig: vi.fn(() => ({})),
    JsPackageManagerFactory: {
      getPackageManager: vi.fn(() => MockedPackageManager),
    },
    setupAddonInConfig: vi.fn(),
    getAbsolutePathWrapperName: MockWrapGetAbsolutePathUtils.getAbsolutePathWrapperName,
    wrapValueWithGetAbsolutePathWrapper:
      MockWrapGetAbsolutePathUtils.wrapValueWithGetAbsolutePathWrapper,
    isCorePackage: (pkg: string) =>
      pkg === '@aussieljk/forkbook' || pkg.startsWith('@aussieljk/forkbook/'),
    frameworkToRenderer: vi.fn(),
  };
});

describe('getVersionSpecifier', (it) => {
  test.each([
    ['@aussieljk/forkbook/addon-docs', ['@aussieljk/forkbook/addon-docs', undefined]],
    ['@aussieljk/forkbook/addon-docs@7.0.1', ['@aussieljk/forkbook/addon-docs', '7.0.1']],
    [
      '@aussieljk/forkbook/addon-docs@7.0.1-beta.1',
      ['@aussieljk/forkbook/addon-docs', '7.0.1-beta.1'],
    ],
    [
      '@aussieljk/forkbook/addon-docs@~7.0.1-beta.1',
      ['@aussieljk/forkbook/addon-docs', '~7.0.1-beta.1'],
    ],
    [
      '@aussieljk/forkbook/addon-docs@^7.0.1-beta.1',
      ['@aussieljk/forkbook/addon-docs', '^7.0.1-beta.1'],
    ],
    ['@aussieljk/forkbook/addon-docs@next', ['@aussieljk/forkbook/addon-docs', 'next']],
  ])('%s => %s', (input, expected) => {
    const result = getVersionSpecifier(input);
    expect(result[0]).toEqual(expected[0]);
    expect(result[1]).toEqual(expected[1]);
  });
});

describe('add', () => {
  const testData = [
    { input: 'aa', expected: 'aa@^1.0.0' }, // resolves to the latest version
    { input: 'aa@4', expected: 'aa@^4' },
    { input: 'aa@4.1.0', expected: 'aa@^4.1.0' },
    { input: 'aa@^4', expected: 'aa@^4' },
    { input: 'aa@~4', expected: 'aa@~4' },
    { input: 'aa@4.1.0-alpha.1', expected: 'aa@^4.1.0-alpha.1' },
    { input: 'aa@next', expected: 'aa@next' },

    { input: '@org/aa', expected: '@org/aa@^1.0.0' },
    { input: '@org/aa@4', expected: '@org/aa@^4' },
    { input: '@org/aa@4.1.0', expected: '@org/aa@^4.1.0' },
    { input: '@org/aa@4.1.0-alpha.1', expected: '@org/aa@^4.1.0-alpha.1' },
    { input: '@org/aa@next', expected: '@org/aa@next' },
  ];

  test.each(testData)('$input', async ({ input, expected }) => {
    await add(input, { packageManager: PackageManagerName.NPM, skipPostinstall: true });

    expect(MockedPackageManager.addDependencies).toHaveBeenCalledWith(
      { type: 'devDependencies', writeOutputToFile: false },
      [expected]
    );
  });

  // Addons inside the storybook package are already installed.
  test.each([
    '@aussieljk/forkbook/addon-docs',
    '@aussieljk/forkbook/addon-docs@next',
    '@aussieljk/forkbook/addon-mcp',
  ])('%s installs nothing', async (input) => {
    vi.clearAllMocks();
    await add(input, { packageManager: PackageManagerName.NPM, skipPostinstall: true });

    expect(MockedPackageManager.addDependencies).not.toHaveBeenCalled();
  });
});

describe('add (extra)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  test('postInstall', async () => {
    await add('@aussieljk/forkbook/addon-docs', {
      packageManager: PackageManagerName.NPM,
      skipPostinstall: false,
    });

    expect(MockedPostInstall.postinstallAddon).toHaveBeenCalledWith(
      '@aussieljk/forkbook/addon-docs',
      {
        packageManager: 'npm',
        configDir: '.forkbook',
        logger: expect.any(Object),
        prompt: expect.any(Object),
      }
    );
  });

  test('logs the main config path relative to the working directory', async () => {
    MockedStorybookInfo.getStorybookInfo.mockReturnValueOnce({
      ...MockedStorybookInfo.getStorybookInfo(),
      mainConfigPath: join(process.cwd(), 'packages', 'ui', '.forkbook', 'main.ts'),
    });

    await add('@aussieljk/forkbook/addon-docs', {
      packageManager: PackageManagerName.NPM,
      skipPostinstall: true,
    });

    expect(logger.log).toHaveBeenCalledWith(
      `Adding '@aussieljk/forkbook/addon-docs' to the "addons" field in ${join('packages', 'ui', '.forkbook', 'main.ts')}`
    );
  });
});
