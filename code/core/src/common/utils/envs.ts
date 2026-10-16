/** StackBlitz WebContainers set `process.versions.webcontainer`. */
export const isWebContainer = () => process.versions.webcontainer != null;

import { nodePathsToArray } from './paths.ts';

// Load environment variables starts with FORKBOOK_ to the client side.

export async function loadEnvs(options: { production?: boolean } = {}): Promise<{
  stringified: Record<string, string>;
  raw: Record<string, string>;
}> {
  const { loadEnv } = await import('vite');
  const defaultNodeEnv = options.production ? 'production' : 'development';

  const baseEnv: Record<string, string> = {
    NODE_ENV: process.env.NODE_ENV || defaultNodeEnv,
    NODE_PATH: process.env['NODE_PATH'] || '',
    STORYBOOK: process.env['STORYBOOK'] || 'true',
    // This is to support CRA's public folder feature.
    // In production we set this to dot(.) to allow the browser to access these assets
    // even when deployed inside a subpath. (like in GitHub pages)
    // In development this is just empty as we always serves from the root.
    PUBLIC_URL: options.production ? '.' : '',
  };

  // .env, .env.local, .env.[mode] and .env.[mode].local, with variable expansion. A variable that
  // is already in process.env wins over the files.
  const envEntries = loadEnv(baseEnv['NODE_ENV'], process.cwd(), 'FORKBOOK_');

  const raw: Record<string, string> = { ...baseEnv, ...envEntries };
  (raw as any).NODE_PATH = nodePathsToArray((raw.NODE_PATH as string) || '');

  const stringified = Object.fromEntries(
    Object.entries(raw).map(([key, value]) => [key, JSON.stringify(value)])
  );
  return { raw, stringified };
}

export const stringifyEnvs = (raw: Record<string, string>): Record<string, string> =>
  Object.entries(raw).reduce<Record<string, string>>((acc, [key, value]) => {
    acc[key] = JSON.stringify(value);
    return acc;
  }, {});

export const stringifyProcessEnvs = (raw: Record<string, string>): Record<string, string> => {
  const envs = Object.entries(raw).reduce<Record<string, string>>((acc, [key, value]) => {
    acc[`process.env.${key}`] = JSON.stringify(value);
    return acc;
  }, {});
  return envs;
};

export const optionalEnvToBoolean = (input: string | undefined): boolean | undefined => {
  if (input === undefined) {
    return undefined;
  }
  if (input.toUpperCase() === 'FALSE' || input === '0') {
    return false;
  }
  if (input.toUpperCase() === 'TRUE' || input === '1') {
    return true;
  }
  return Boolean(input);
};

/**
 * Consistently determine if we are in a CI environment
 *
 * Doing Boolean(process.env.CI) or !process.env.CI is not enough, because users might set CI=false
 * or CI=0, which would be truthy, and thus return true in those cases.
 */
export function isCI(): boolean | undefined {
  return optionalEnvToBoolean(process.env.CI);
}
