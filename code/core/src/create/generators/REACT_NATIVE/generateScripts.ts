type PlatformScriptName = 'ios' | 'android';

export interface StorybookPlatformScriptDerivationResult {
  scriptsToAdd: Partial<Record<'storybook:ios' | 'storybook:android', string>>;
  missingBaseScripts: PlatformScriptName[];
}

const FORKBOOK_ENV_ASSIGNMENT = 'FORKBOOK_ENABLED=true';
const FORKBOOK_ENV_PREFIX = `cross-env ${FORKBOOK_ENV_ASSIGNMENT}`;
const FORKBOOK_ENV_PATTERN = /(?:^|\s)FORKBOOK_ENABLED=/;
const CROSS_ENV_PREFIX_PATTERN = /^(cross-env(?:-shell)?\s+)/;

const withStorybookEnv = (scriptValue: string) => {
  const normalizedScriptValue = scriptValue.trim();

  if (FORKBOOK_ENV_PATTERN.test(normalizedScriptValue)) {
    return normalizedScriptValue;
  }

  if (CROSS_ENV_PREFIX_PATTERN.test(normalizedScriptValue)) {
    return normalizedScriptValue.replace(CROSS_ENV_PREFIX_PATTERN, `$1${FORKBOOK_ENV_ASSIGNMENT} `);
  }

  return `${FORKBOOK_ENV_PREFIX} ${normalizedScriptValue}`.trim();
};

export const deriveStorybookPlatformScripts = (
  scripts: Record<string, unknown> | undefined
): StorybookPlatformScriptDerivationResult => {
  const scriptsToAdd: StorybookPlatformScriptDerivationResult['scriptsToAdd'] = {};
  const missingBaseScripts: PlatformScriptName[] = [];

  const iosScript = typeof scripts?.ios === 'string' ? scripts.ios.trim() : '';
  if (iosScript) {
    scriptsToAdd['storybook:ios'] = withStorybookEnv(iosScript);
  } else {
    missingBaseScripts.push('ios');
  }

  const androidScript = typeof scripts?.android === 'string' ? scripts.android.trim() : '';
  if (androidScript) {
    scriptsToAdd['storybook:android'] = withStorybookEnv(androidScript);
  } else {
    missingBaseScripts.push('android');
  }

  return { scriptsToAdd, missingBaseScripts };
};
