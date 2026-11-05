import { ElementA11yParameterError } from '@aussieljk/forkbook/internal/preview-errors';

import { global } from '../shared/global.ts';

import type { AxeResults, ContextProp, ContextSpec, RunOptions, Spec } from 'axe-core';
import { addons, waitForAnimations } from '@aussieljk/forkbook/preview-api';

import { withLinkPaths } from './a11yRunnerUtils.ts';
import { EVENTS } from './constants.ts';
import type { A11yParameters } from './params.ts';

const { document } = global;

const channel = addons.getChannel();

const DEFAULT_PARAMETERS = { config: {}, options: {} } as const;

const DISABLED_RULES = [
  // In component testing, landmarks are not always present
  // and the rule check can cause false positives
  'region',
] as const;

const getDisabledRules = (rules: Spec['rules'] = []) => {
  const disabledRules: NonNullable<RunOptions['rules']> = {};

  // Rules are applied in order, so a later entry overrides an earlier one for the same id.
  for (const { id, enabled } of rules) {
    if (!id || typeof enabled !== 'boolean') {
      continue;
    }

    if (enabled) {
      delete disabledRules[id];
    } else {
      disabledRules[id] = { enabled: false };
    }
  }

  return disabledRules;
};

const mergeDisabledRulesIntoRunOptions = (options: RunOptions, config: Spec): RunOptions => {
  // axe.run({ runOnly }) can re-enable tagged rules, so mirror configured disables into
  // the same run options object without mutating the user's parameters.
  if (!options.runOnly) {
    return options;
  }

  const disabledRules = getDisabledRules(config.rules);

  if (Object.keys(disabledRules).length === 0) {
    return options;
  }

  return {
    ...options,
    rules: {
      ...disabledRules,
      ...options.rules,
    },
  };
};

// A simple queue to run axe-core in sequence
// This is necessary because axe-core is not designed to run in parallel
const queue: (() => Promise<void>)[] = [];
let isRunning = false;

const runNext = async () => {
  if (queue.length === 0) {
    isRunning = false;
    return;
  }

  isRunning = true;
  const next = queue.shift();
  if (next) {
    await next();
  }
  runNext();
};

export const run = async (input: A11yParameters = DEFAULT_PARAMETERS, storyId: string) => {
  const axeCore = await import('axe-core');
  // We do this workaround when Vite projects can't optimize deps in pnpm projects
  // as axe-core is UMD and therefore won't resolve.
  // In that case, we just use the global axe (which will be there as a side effect of UMD import).
  const axe = axeCore?.default || (globalThis as unknown as { axe: typeof axeCore.default }).axe;

  const { config = {}, options = {} } = input;

  // 'element' is not an A11yParameters key, but users may still pass it
  if ('element' in input && input.element) {
    throw new ElementA11yParameterError();
  }

  const context: ContextSpec = {
    include: document?.body,
    exclude: ['.fb-wrapper', '#storybook-docs', '#forkbook-highlights-root'], // Internal Forkbook elements that are always in the document
  };

  if (input.context) {
    const inputContext = input.context;
    const include =
      typeof inputContext === 'object' && 'include' in inputContext
        ? inputContext.include
        : undefined;
    const exclude =
      typeof inputContext === 'object' && 'exclude' in inputContext
        ? inputContext.exclude
        : undefined;

    // 1. if context.include exists, use it
    if (include !== undefined) {
      context.include = include as ContextProp;
    } else if (exclude === undefined) {
      // 2. if context exists, but it's not an object with include or exclude, it's an implicit include to be used directly
      context.include = inputContext as ContextProp;
    }

    // 3. if context.exclude exists, merge it with the default exclude
    if (exclude !== undefined) {
      context.exclude = (context.exclude as string[]).concat(exclude as string[]);
    }
  }

  axe.reset();

  const configWithDefault = {
    ...config,
    rules: [...DISABLED_RULES.map((id) => ({ id, enabled: false })), ...(config?.rules ?? [])],
  };

  axe.configure(configWithDefault);

  const optionsWithDisabledRules = mergeDisabledRulesIntoRunOptions(options, configWithDefault);

  return new Promise<AxeResults>((resolve, reject) => {
    const highlightsRoot = document?.getElementById('forkbook-highlights-root');
    if (highlightsRoot) {
      highlightsRoot.style.display = 'none';
    }

    const task = async () => {
      try {
        const result = await axe.run(context, optionsWithDisabledRules);
        const resultWithLinks = withLinkPaths(result, storyId);
        resolve(resultWithLinks);
      } catch (error) {
        reject(error);
      }
    };

    queue.push(task);

    if (!isRunning) {
      runNext();
    }

    if (highlightsRoot) {
      highlightsRoot.style.display = '';
    }
  });
};

channel.on(EVENTS.MANUAL, async (storyId: string, input: A11yParameters = DEFAULT_PARAMETERS) => {
  try {
    await waitForAnimations();
    const result = await run(input, storyId);
    // Axe result contains class instances, which telejson deserializes in a
    // way that violates:
    //  Content Security Policy directive: "script-src 'self' 'unsafe-inline'".
    const resultJson = JSON.parse(JSON.stringify(result));
    channel.emit(EVENTS.RESULT, resultJson, storyId);
  } catch (error) {
    channel.emit(EVENTS.ERROR, error);
  }
});
