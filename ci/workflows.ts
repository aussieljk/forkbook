/**
 * The CI and the release of Forkbook, in TypeScript. `bun run workflows` writes this file to
 * `.github/workflows/*.yml`. Do not edit the YAML by hand. CI checks that it matches.
 *
 * The workflows are split by branch, so the checks never run two times on one commit:
 *
 *   ci.yml              pull requests. Runs the check.
 *
 *   release.yml         each push to master, plus a manual button (Actions > Release >
 *                       Run workflow). Runs the same check, then publishes
 *                       @aussieljk/forkbook to npm and pushes the version commit.
 *                       On a push it publishes only when the push changed code/core
 *                       (`release.ts --if-changed`). A manual run always publishes.
 *
 *   lint-workflows.yml  actionlint and zizmor on the workflow files.
 *
 * npm needs no token. The release publishes with OIDC (trusted publishing), which is set up
 * for this repo and `release.yml` on npmjs.com. The file name is part of that config. If you
 * change the name of release.yml, update npmjs.com first.
 */
import {
  actionlint,
  checkout,
  install,
  setupBun,
  setupNode,
  sh,
  zizmor,
  type Runner,
  type Step,
  type Workflow,
} from './dsl.ts';

/** GitHub-hosted. npm trusted publishing does not accept self-hosted runners. */
const RUNNER: Runner = 'ubuntu-latest';

/** Trusted publishing needs npm 11.5.1 or later. Node 24 has npm 11. */
const NODE_VERSION = '24';

/** `bun check` (the typecheck) needs Bun 1.4.4 or later, which is a canary build now. */
const BUN_VERSION = 'canary';

const MASTER = 'master';

/** The gate that both workflows run before anything else. */
const check: Step[] = [
  sh('Workflows in sync', 'bun run workflows:check'),
  sh('Build', 'bun run build'),
  sh('Typecheck', 'bun run typecheck'),
  // The manager layout test opens the built manager in headless Chromium.
  sh('Install Chromium', 'node node_modules/playwright/cli.js install --with-deps chromium-headless-shell'),
  sh('Unit tests', 'bun run test:unit'),
];

const ci: Workflow = {
  name: 'CI',
  // Pull requests only. A push to master runs release.yml, which runs the same check.
  on: { pull_request: { branches: ['**'] } },
  // One run for each branch. A new push cancels the run in progress.
  concurrency: {
    group: 'ci-${{ github.head_ref || github.run_id }}',
    'cancel-in-progress': true,
  },
  permissions: { contents: 'read' },
  jobs: {
    check: {
      name: 'Check',
      'runs-on': RUNNER,
      'timeout-minutes': 30,
      steps: [checkout(), setupBun(BUN_VERSION), install(), ...check],
    },
  },
};

const release: Workflow = {
  name: 'Release',
  on: {
    push: { branches: [MASTER] },
    workflow_dispatch: {},
  },
  // Never run two releases at the same time, and never stop one in the middle of a publish.
  concurrency: { group: 'release', 'cancel-in-progress': false },
  // contents: push the version commit to master.
  // id-token: make the OIDC token that npm accepts in place of a publish token.
  permissions: { contents: 'write', 'id-token': 'write' },
  jobs: {
    release: {
      name: 'Check + publish',
      'runs-on': RUNNER,
      'timeout-minutes': 30,
      if: `github.ref == 'refs/heads/${MASTER}'`,
      steps: [
        // fetch-depth: the --if-changed gate compares with the previous push. A clone of
        // depth 1 has no previous commit, so the gate would always publish.
        checkout({ fetchDepth: 100, persistCredentials: true }),
        setupBun(BUN_VERSION),
        setupNode(NODE_VERSION),
        install(),
        ...check,
        // Never set NODE_AUTH_TOKEN here. With it, npm uses token auth and does not use
        // trusted publishing. release.ts stops if it is set.
        sh('Publish to npm', 'bun scripts/release.ts --if-changed', {
          if: "github.event_name == 'push'",
        }),
        sh('Publish to npm (manual)', 'bun scripts/release.ts', {
          if: "github.event_name == 'workflow_dispatch'",
        }),
      ],
    },
  },
};

const WORKFLOW_PATHS = ['.github/workflows/**', 'ci/**'];

const lintWorkflows: Workflow = {
  name: 'Lint workflows',
  on: {
    push: { branches: [MASTER], paths: [...WORKFLOW_PATHS] },
    pull_request: { branches: ['**'], paths: [...WORKFLOW_PATHS] },
  },
  concurrency: {
    group: 'lint-workflows-${{ github.head_ref || github.run_id }}',
    'cancel-in-progress': true,
  },
  permissions: { contents: 'read' },
  jobs: {
    actionlint: {
      name: 'actionlint',
      'runs-on': RUNNER,
      'timeout-minutes': 5,
      steps: [checkout(), actionlint()],
    },
    zizmor: {
      name: 'zizmor',
      'runs-on': RUNNER,
      'timeout-minutes': 5,
      permissions: { 'security-events': 'write' },
      steps: [checkout(), zizmor()],
    },
  },
};

/** File name to workflow. The generator treats this map as all of `.github/workflows`. */
export const workflows: Record<string, Workflow> = {
  'ci.yml': ci,
  'release.yml': release,
  'lint-workflows.yml': lintWorkflows,
};
