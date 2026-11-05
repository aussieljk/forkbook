import { logger } from '@aussieljk/forkbook/internal/node-logger';
import { CriticalPresetLoadError } from '@aussieljk/forkbook/internal/server-errors';
import type {
  BuilderOptions,
  CLIOptions,
  CoreCommon_ResolvedAddonPreset,
  CoreCommon_ResolvedAddonVirtual,
  LoadOptions,
  LoadedPreset,
  PresetConfig,
  Presets,
  StorybookConfigRaw,
} from '@aussieljk/forkbook/internal/types';

import { readFileSync } from 'node:fs';

import { isAbsolute, join, parse, resolve } from 'pathe';
import { dedent } from 'ts-dedent';

import type { ChannelLike } from '../channels/index.ts';
import { importModule, safeResolveModule } from '../shared/utils/module.ts';
import { getInterpretedFile } from './utils/interpret-files.ts';
import { stripAbsNodeModulesPath } from './utils/strip-abs-node-modules-path.ts';
import { validateConfigurationFiles } from './utils/validate-configuration-files.ts';

export type InterPresetOptions = Omit<
  CLIOptions &
    LoadOptions &
    BuilderOptions & { isCritical?: boolean; build?: StorybookConfigRaw['build'] },
  'frameworkPresets'
>;

const isObject = (val: unknown): val is Record<string, unknown> =>
  val != null && typeof val === 'object' && Array.isArray(val) === false;
const isFunction = (val: unknown): val is Function => typeof val === 'function';

function resolvePresetFunction(
  input: unknown,
  presetOptions: Record<string, unknown>,
  storybookOptions: InterPresetOptions
): PresetConfig[] {
  if (isFunction(input)) {
    return [...input({ ...storybookOptions, ...presetOptions })];
  }
  if (Array.isArray(input)) {
    return [...input];
  }

  return [];
}

const presetNameOf = (preset: PresetConfig): string =>
  typeof preset === 'string' ? preset : preset.name;

function readAddonManifest(dir: string): { name?: string; exports?: unknown } | undefined {
  try {
    const { name, exports } = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
    return { name: typeof name === 'string' && name !== '' ? name : undefined, exports };
  } catch {
    return undefined;
  }
}

/**
 * Parse an addon into either a managerEntries or a preset. Throw on invalid input.
 *
 * Valid inputs:
 *
 * - `'@aussieljk/forkbook/addon-docs/preset' => { type: 'presets', item }`
 * - `'@aussieljk/forkbook/addon-docs' => { type: 'presets', item: '@aussieljk/forkbook/addon-docs/preset' }`
 * - `{ name: '@aussieljk/forkbook/addon-docs(/preset)?', options: { } } => { type: 'presets', item: { name:
 *   '@aussieljk/forkbook/addon-docs/preset', options } }`
 */
export const resolveAddonName = (
  configDir: string,
  name: string,
  options: unknown
): CoreCommon_ResolvedAddonPreset | CoreCommon_ResolvedAddonVirtual | undefined => {
  const resolved = safeResolveModule({ specifier: name, parent: configDir });

  if (resolved && parse(name).name === 'preset') {
    return {
      type: 'presets',
      name: resolved,
    };
  }

  // An absolute `name` is a directory, so joining entry subpaths onto it bypasses the
  // package's `exports` map. Resolving the bare specifier from the package's own directory
  // consults `exports` instead, and restricting that to packages which declare `exports`
  // keeps the lookup from walking node_modules into a different copy of the addon.
  const manifest = isAbsolute(name) ? readAddonManifest(name) : undefined;
  const exportsSpecifier = manifest?.exports ? manifest.name : undefined;

  const resolveEntryFile = (entry: string) =>
    (exportsSpecifier
      ? safeResolveModule({ specifier: `${exportsSpecifier}/${entry}`, parent: name })
      : undefined) ?? safeResolveModule({ specifier: join(name, entry), parent: configDir });

  const presetFile = resolveEntryFile('preset');
  const managerFile = resolveEntryFile('manager');
  const previewFile = resolveEntryFile('preview');

  if (managerFile || previewFile || presetFile) {
    const previewAnnotations = [];
    if (previewFile) {
      const parsedPreviewFile = stripAbsNodeModulesPath(previewFile);
      if (parsedPreviewFile !== previewFile) {
        previewAnnotations.push({
          bare: parsedPreviewFile,
          absolute: previewFile,
        });
      } else {
        previewAnnotations.push(previewFile);
      }
    }
    return {
      type: 'virtual',
      name,
      presets: presetFile ? [{ name: presetFile, options }] : [],
      managerEntries: managerFile ? [managerFile] : [],
      previewAnnotations,
    };
  }

  if (resolved) {
    return {
      type: 'presets',
      name: resolved,
    };
  }

  return undefined;
};

const map =
  ({ configDir }: InterPresetOptions) =>
  (item: PresetConfig) => {
    const options = typeof item === 'string' ? undefined : item.options || undefined;
    const name = presetNameOf(item);

    let resolved;

    try {
      resolved = resolveAddonName(configDir, name, options);
    } catch (err) {
      logger.error(
        `Addon value should end in /manager or /preview or /register OR it should be a valid preset https://forkbook.ljk.dev/docs/addons/writing-presets\n${item}`
      );
      return undefined;
    }

    if (!resolved) {
      const packageName = isAbsolute(name) ? readAddonManifest(name)?.name : undefined;
      logger.warn(
        packageName
          ? dedent`
              Could not resolve addon "${packageName}", skipping.
              It is installed at ${name}, but none of its preset, manager or preview entry points could be resolved.
              If your main config wraps it in getAbsolutePath(), try referencing "${packageName}" directly instead.
            `
          : `Could not resolve addon "${name}", skipping. Is it installed?`
      );
      return undefined;
    }

    return {
      ...(options ? { options } : {}),
      ...resolved,
    };
  };

async function getContent(input: PresetConfig, configDir: string) {
  if (typeof input === 'object' && 'type' in input && input.type === 'virtual') {
    const { type, name, ...rest } = input;
    return rest;
  }
  const name = presetNameOf(input);

  return importModule(safeResolveModule({ specifier: name, parent: configDir }) ?? name);
}

export async function loadPreset(
  input: PresetConfig,
  level: number,
  storybookOptions: InterPresetOptions
): Promise<LoadedPreset[]> {
  const presetName = presetNameOf(input);

  try {
    // Preset options are whatever object the user passed.
    const presetOptions = ((typeof input === 'string' ? undefined : input.options) ?? {}) as Record<
      string,
      unknown
    >;

    let contents = await getContent(input, storybookOptions.configDir);

    if (typeof contents === 'function') {
      // allow the export of a preset to be a function, that gets storybookOptions
      contents = contents(storybookOptions, presetOptions);
    }

    if (Array.isArray(contents)) {
      const subPresets = contents;
      return await loadPresets(subPresets, level + 1, storybookOptions);
    }

    if (isObject(contents)) {
      const { addons: addonsInput = [], presets: presetsInput = [], ...rest } = contents;

      let filter = (i: PresetConfig) => {
        return true;
      };

      if (
        storybookOptions.isCritical !== true &&
        (storybookOptions.build?.test?.disabledAddons?.length || 0) > 0
      ) {
        filter = (i: PresetConfig) => {
          const name = presetNameOf(i);

          return !storybookOptions.build?.test?.disabledAddons?.find((n) => name.includes(n));
        };
      }

      const subPresets = resolvePresetFunction(
        presetsInput,
        presetOptions,
        storybookOptions
      ).filter(filter);
      const subAddons = resolvePresetFunction(addonsInput, presetOptions, storybookOptions).filter(
        filter
      );

      return [
        ...(await loadPresets([...subPresets], level + 1, storybookOptions)),
        ...(await loadPresets(
          [...subAddons.map(map(storybookOptions))].filter(Boolean) as PresetConfig[],
          level + 1,
          storybookOptions
        )),
        {
          name: presetName,
          preset: rest,
          options: presetOptions,
        },
      ];
    }

    throw new Error(dedent`
      ${input} is not a valid preset
    `);
  } catch (error) {
    if (storybookOptions?.isCritical) {
      throw new CriticalPresetLoadError({
        error: error as Error,
        presetName,
      });
    }

    const warning =
      level > 0
        ? `  Failed to load preset: ${JSON.stringify(input)} on level ${level}`
        : `  Failed to load preset: ${JSON.stringify(input)}`;

    logger.warn(warning);
    logger.error(error);
    return [];
  }
}

async function loadPresets(
  presets: PresetConfig[],
  level: number,
  storybookOptions: InterPresetOptions
): Promise<LoadedPreset[]> {
  if (!presets || !Array.isArray(presets) || !presets.length) {
    return [];
  }

  return (
    await Promise.all(
      presets.map(async (preset) => {
        return loadPreset(preset, level, storybookOptions);
      })
    )
  ).reduce((acc, loaded) => {
    return acc.concat(loaded);
  }, []);
}

function applyPresets(
  presets: LoadedPreset[],
  extension: string,
  config: any,
  args: any,
  storybookOptions: InterPresetOptions
): Promise<any> {
  const presetResult = new Promise((res) => res(config));

  if (!presets.length) {
    return presetResult;
  }

  return presets.reduce((accumulationPromise: Promise<unknown>, { preset, options }) => {
    const change = preset[extension];

    if (!change) {
      return accumulationPromise;
    }

    if (typeof change === 'function') {
      const extensionFn = change;
      const context = {
        preset,
        combinedOptions: {
          ...storybookOptions,
          ...args,
          ...options,
          presetsList: presets,
          presets: {
            apply: async (ext: string, c: any, a = {}) =>
              applyPresets(presets, ext, c, a, storybookOptions),
          },
        },
      };

      return accumulationPromise.then((newConfig) =>
        extensionFn.call(context.preset, newConfig, context.combinedOptions)
      );
    }

    return accumulationPromise.then((newConfig) => {
      if (Array.isArray(newConfig) && Array.isArray(change)) {
        return [...newConfig, ...change];
      }
      if (isObject(newConfig) && isObject(change)) {
        return { ...newConfig, ...change };
      }
      return change;
    });
  }, presetResult);
}

export async function getPresets(
  presets: PresetConfig[],
  storybookOptions: InterPresetOptions
): Promise<Presets> {
  const loadedPresets: LoadedPreset[] = await loadPresets(presets, 0, storybookOptions);

  return {
    apply: async (extension: string, config?: any, args = {}) =>
      applyPresets(loadedPresets, extension, config, args, storybookOptions),
  };
}

export async function loadAllPresets(
  options: CLIOptions &
    LoadOptions &
    BuilderOptions & {
      corePresets: PresetConfig[];
      overridePresets: PresetConfig[];
      /** Whether preset failures should be critical or not */
      isCritical?: boolean;
      build?: StorybookConfigRaw['build'];
      channel: ChannelLike;
    }
) {
  const { corePresets = [], overridePresets = [], ...restOptions } = options;
  validateConfigurationFiles(options.configDir);

  const mainUrl = getInterpretedFile(resolve(options.configDir, 'main')) as string;
  const presetsConfig: PresetConfig[] = [...corePresets, mainUrl, ...overridePresets];

  return getPresets(presetsConfig, restOptions);
}
