import { cache } from '@aussieljk/forkbook/internal/common';
import { colors } from '@aussieljk/forkbook/internal/node-logger';
import type { VersionCheck } from '@aussieljk/forkbook/internal/types';

import picocolors from 'picocolors';
import semver from 'semver';
import { dedent } from 'ts-dedent';

const { FORKBOOK_VERSION_BASE = 'https://forkbook.ljk.dev', CI } = process.env;

export const updateCheck = async (version: string): Promise<VersionCheck> => {
  let result;
  const time = Date.now();
  try {
    const fromCache = await cache.get('lastUpdateCheck', { success: false, time: 0 });

    // if last check was more then 24h ago
    if (time - 86400000 > fromCache.time && !CI) {
      const fromFetch = await Promise.race([
        fetch(`${FORKBOOK_VERSION_BASE}/versions.json?current=${version}`),
        // if fetch is too slow, we won't wait for it
        new Promise<never>((res, rej) => global.setTimeout(rej, 1500)),
      ]);
      const data = await fromFetch.json();
      result = { success: true, cached: false, data, time };
      await cache.set('lastUpdateCheck', result);
    } else {
      result = { ...fromCache, cached: true };
    }
  } catch (error) {
    result = { success: false, cached: false, error, time };
  }
  return result;
};

export function createUpdateMessage(updateInfo: VersionCheck, version: string): string {
  const latestVersion = updateInfo.data?.latest?.version;
  if (!updateInfo.success || !latestVersion) {
    return '';
  }

  try {
    if (!semver.lt(version, latestVersion)) {
      return '';
    }
    const isPrerelease = semver.prerelease(latestVersion);
    const upgradeCommand = `npx @aussieljk/forkbook@${isPrerelease ? 'next' : 'latest'} upgrade`;
    return dedent`
      ${colors.orange(`A new version (${picocolors.bold(latestVersion)}) is available!`)}

      ${picocolors.gray('Upgrade now:')} ${colors.green(upgradeCommand)}

      ${picocolors.gray('Read full changelog:')} ${picocolors.gray(
        picocolors.underline('https://github.com/aussieljk/forkbook/commits/master')
      )}
    `;
  } catch {
    return '';
  }
}
