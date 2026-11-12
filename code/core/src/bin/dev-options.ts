import * as v from 'valibot';
import { HandledError } from '@aussieljk/forkbook/internal/common';

import { isClaudePreviewLaunch, type AgentEnvironment } from '../shared/utils/agent-environment.ts';

type DevCommandEnvironment = AgentEnvironment & {
  CI?: string;
  PORT?: string;
  FORKBOOK_CONFIG_DIR?: string;
  FORKBOOK_HOSTNAME?: string;
  FORKBOOK_PORT?: string;
  FORKBOOK_STATIC_DIR?: string;
};

type DevCommandOptions = {
  ci?: boolean | string;
  configDir?: string;
  host?: string;
  open?: boolean;
  port?: number | string;
  staticDir?: string;
};

const PortSchema = v.message(
  v.pipe(
    v.union([v.pipe(v.string(), v.trim(), v.regex(/^\d+$/), v.transform(Number)), v.number()]),
    v.minValue(1),
    v.integer(),
    v.maxValue(65535)
  ),
  (issue) => `Port must be a valid number from 1 to 65535, received ${issue.received}.`
);

const DevOptionsSchema = v.looseObject({
  ci: v.optional(v.union([v.boolean(), v.string()])),
  configDir: v.optional(v.string()),
  host: v.optional(v.string()),
  open: v.optional(v.boolean()),
  port: v.optional(PortSchema),
  staticDir: v.optional(v.string()),
});

export function resolveDevCommandOptions<TOptions extends DevCommandOptions>(
  options: TOptions,
  { env = process.env }: { env?: DevCommandEnvironment } = {}
) {
  const isClaudePreview = isClaudePreviewLaunch(env);
  const PORT = env.PORT ?? undefined;
  const FORKBOOK_PORT = env.FORKBOOK_PORT ?? undefined;

  // An explicit CLI option wins over the FORKBOOK_* env vars. Child processes inherit these env
  // vars (addon-vitest sets FORKBOOK_CONFIG_DIR for its test runner, and the Next.js server
  // helper reads FORKBOOK_PORT), so a command that gives `--config-dir` must keep it.
  const result = v.safeParse(DevOptionsSchema, {
    ...options,
    host: options.host || env.FORKBOOK_HOSTNAME,
    staticDir: options.staticDir || env.FORKBOOK_STATIC_DIR,
    configDir: options.configDir || env.FORKBOOK_CONFIG_DIR,
    ci: env.CI || options.ci,
    port: isClaudePreview
      ? (PORT ?? options.port ?? FORKBOOK_PORT)
      : (options.port ?? FORKBOOK_PORT ?? PORT),
    open: options.open ?? false,
  });

  if (!result.success) {
    throw new HandledError(v.summarize(result.issues));
  }

  return result.output as TOptions & v.InferOutput<typeof DevOptionsSchema>;
}
