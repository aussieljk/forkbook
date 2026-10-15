import type { UserConfig } from 'vite';

// Headroom under the ~1MB response limit.
const MAX_CHUNK_BYTES = 500 * 1024;

type RolldownOutput = NonNullable<
  Exclude<NonNullable<NonNullable<UserConfig['build']>['rolldownOptions']>['output'], unknown[]>
>;

function eachOutput(config: UserConfig, fn: (output: RolldownOutput) => void) {
  config.build ??= {};
  const options = (config.build.rolldownOptions ??= {});
  if (Array.isArray(options.output)) {
    if (options.output.length === 0) {
      options.output.push({});
    }
    options.output.forEach(fn);
    return;
  }
  options.output ??= {};
  fn(options.output);
}

/** Storybook's preview needs modules to run in import order. */
export function ensureStrictExecutionOrder(config: UserConfig) {
  eachOutput(config, (output) => {
    output.strictExecutionOrder = true;
  });
}

/** Caps chunk size so that each preview chunk stays under the response limit. */
export function applyChunkedPreviewRuntime(config: UserConfig) {
  eachOutput(config, (output) => {
    const splitting = output.codeSplitting;
    const base = splitting && typeof splitting === 'object' ? splitting : {};
    output.codeSplitting = {
      ...base,
      groups: [...(base.groups ?? []), { name: 'sb', maxSize: MAX_CHUNK_BYTES }],
    };
  });
}
