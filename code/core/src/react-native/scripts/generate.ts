import { writeFileSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import * as path from 'node:path';

import {
  globToRegexp,
  loadMainConfig,
  normalizeStories,
} from '@aussieljk/forkbook/internal/common';

import type { StoriesEntry } from '@aussieljk/forkbook/internal/types';

import type { ForkbookConfig } from '../config.ts';
import {
  type Addon,
  ensureRelativePathHasDot,
  getAddonName,
  getPreviewExists,
  resolveAddonFile,
  toRequireContext,
} from './common.ts';

const cwd = process.cwd();

/** The import path of the React Native renderer in the generated file. */
const RN = '@aussieljk/forkbook/react-native';

export interface GenerateOptions {
  configPath: string;
  useJs?: boolean;
  docTools?: boolean;
  host?: string;
  port?: number;
  secured?: boolean;
  disableUI?: boolean;
}

/** @todo Remove support for `main.addons` in a future major version. */
function warnDeprecatedMainAddonsField(main: ForkbookConfig, configPath: string) {
  const addons = main.addons ?? [];
  if (addons.length === 0) {
    return;
  }

  const names = addons
    .map((addon) => getAddonName(addon))
    .filter((name) => typeof name === 'string');
  const list = [...new Set(names)].join(', ');
  console.warn(
    `[Forkbook React Native] The \`addons\` field in your main config (${configPath}) is deprecated and will be removed in a future major version.\n` +
      `Move every entry to \`deviceAddons\` instead.\n` +
      (list ? `Still listed under \`addons\`: ${list}.\n` : '')
  );
}

/** The LAN address of the machine, so that devices can connect to the channel. */
function getLocalIPAddress() {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] ?? []) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return '0.0.0.0';
}

/** Writes `forkbook.requires.ts` (or `.js`) in the config folder. */
export async function generate({
  configPath,
  useJs = false,
  docTools = true,
  host = undefined,
  port = undefined,
  secured = false,
  disableUI = false,
}: GenerateOptions) {
  const channelHost = host === 'auto' ? getLocalIPAddress() : host;
  const storybookRequiresLocation = path.resolve(
    cwd,
    configPath,
    `forkbook.requires.${useJs ? 'js' : 'ts'}`
  );

  const main = (await loadMainConfig({
    configDir: path.resolve(cwd, configPath),
    cwd,
  })) as unknown as ForkbookConfig;

  warnDeprecatedMainAddonsField(main, configPath);

  const storiesSpecifiers = normalizeStories(main.stories as StoriesEntry[], {
    configDir: configPath,
    workingDir: cwd,
  });

  const normalizedStories = storiesSpecifiers.map((specifier) => {
    const reg = globToRegexp(`./${specifier.files}`);

    const { path: p, recursive: r, match: m } = toRequireContext(specifier);

    const pathToStory = ensureRelativePathHasDot(path.posix.relative(configPath, p));
    return `{
    titlePrefix: "${specifier.titlePrefix}",
    directory: "${specifier.directory}",
    files: "${specifier.files}",
    importPathMatcher: /${reg.source}/,
    req: require.context(
      '${pathToStory}',
      ${r},
      ${m}
    ),
  }`;
  });

  const allAddons: Addon[] = [
    ...(main.addons ?? []), // TODO remove in v11
    ...(main.deviceAddons ?? []),
  ];
  const extensions = ['js', 'mjs', 'jsx', 'ts', 'tsx'];

  const registeredAddons: string[] = [];
  for (const addon of allAddons) {
    const registerPath = resolveAddonFile(getAddonName(addon), 'register', extensions, configPath);
    if (registerPath) {
      registeredAddons.push(`import "${registerPath}";`);
    }
  }

  const enhancers: string[] = [];

  if (docTools) {
    enhancers.push(`require("${RN}/preview")`);
  }

  for (const addon of allAddons) {
    const previewPath = resolveAddonFile(getAddonName(addon), 'preview', extensions, configPath);
    if (previewPath) {
      enhancers.push(`require('${previewPath}')`);
    }
  }

  let options = '';
  let optionsVar = '';
  const reactNativeOptions: Record<string, unknown> = { ...main.reactNative };

  if (disableUI) {
    reactNativeOptions.disableUI = true;
  }

  if (reactNativeOptions && typeof reactNativeOptions === 'object') {
    optionsVar = `const options = ${JSON.stringify(reactNativeOptions, null, 2)}`;
    options = 'options';
  }

  // Collect features from main config to set on globalThis.FEATURES
  const featuresAssignment = Object.entries(main.features ?? {})
    .filter(([, value]) => typeof value === 'boolean')
    .map(([key, value]) => `globalThis.FEATURES.${key} = ${value};`)
    .join('\n');

  if (getPreviewExists({ configPath })) {
    enhancers.unshift("require('./preview')");
  }

  const annotations = `[
  ${enhancers.join(',\n  ')}
]`;

  const hasWebsocketConfig = host !== undefined || port !== undefined || secured;
  const websocketAssignmentLines: string[] = [];

  if (channelHost) {
    websocketAssignmentLines.push(`host: '${channelHost}',`);
  }

  if (hasWebsocketConfig) {
    websocketAssignmentLines.push(`port: ${port ?? 7007},`);
    websocketAssignmentLines.push(`secured: ${Boolean(secured)},`);
  }

  const globalTypes = `
declare global {
  var view: View;
  var STORIES: typeof normalizedStories;
  var FORKBOOK_WEBSOCKET:
    | { host?: string; port?: number; secured?: boolean }
    | undefined;
  var FEATURES: Features;
}
`;

  const fileContent = `/* do not change this file, it is auto generated by storybook. */
${useJs ? '' : `/// <reference types="${RN}/metro-env" />\n`}import { start, updateView${useJs ? '' : ', type View, type Features'} } from '${RN}';


${registeredAddons.join('\n')}

const normalizedStories = [
  ${normalizedStories.join(',\n  ')}
];

${useJs ? '' : globalTypes}

const annotations = ${annotations};

globalThis.STORIES = normalizedStories;
${
  hasWebsocketConfig
    ? `globalThis.FORKBOOK_WEBSOCKET = {
  ${websocketAssignmentLines.join('\n  ')}
};`
    : ''
}

module?.hot?.accept?.();
${featuresAssignment ? `\n${featuresAssignment}\n` : ''}
${optionsVar}

if (!globalThis.view) {
  globalThis.view = start({
    annotations,
    storyEntries: normalizedStories,
${options ? `    ${options},` : ''}
  });
} else {
  updateView(globalThis.view, annotations, normalizedStories${options ? `, ${options}` : ''});
}

export const view${useJs ? '' : ': View'} = globalThis.view;
`;

  writeFileSync(storybookRequiresLocation, fileContent, { encoding: 'utf8', flag: 'w' });
}
