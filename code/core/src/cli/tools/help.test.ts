import { describe, expect, it } from 'vitest';

import * as v from 'valibot';

import { defineToolset, type ToolsetCtx } from '../../shared/open-service/toolset-definition.ts';
import { renderMethodHelp, renderToolsHelp, renderToolsetHelp } from './help.ts';

const toolset = defineToolset({
  id: 'example',
  description: 'Example tools.',
  methods: {
    getHTTPFrame: {
      title: 'Inspect an HTTP frame',
      description: `HTTP frame utilities
This second line shows in the toolset and tool help, not in the overview.`,
      input: v.strictObject({}),
      handler: async () => ({ ok: true, data: {}, markdown: '' }),
    },
    preview: {
      title: 'Preview an example',
      description: 'Preview one example.',
      input: v.strictObject({
        id: v.pipe(v.string(), v.description('Example identifier')),
      }),
      output: v.object({
        url: v.pipe(v.string(), v.description('Preview URL')),
      }),
      requiresDevServer: true,
      handler: async ({ id }) => ({
        ok: true,
        data: { url: `http://localhost:6006/${id}` },
        markdown: id,
      }),
    },
  },
});

const ctx: ToolsetCtx = {
  transport: 'cli',
  getService: () => ({}) as never,
};

describe('tools help rendering', () => {
  it('renders the root help as an overview, without the arguments of any tool', () => {
    expect(renderToolsHelp('/repo/.forkbook', [toolset], ctx)).toMatchInlineSnapshot(`
      "Usage: npx forkbook tools [options] [toolset] [tool] [args...]

      Forkbook tools from the Forkbook configuration at /repo/.forkbook.

      Options:
        --cwd <path>                 Project directory of the target Forkbook
        -c, --config-dir <dir-name>  Forkbook config directory of the target Forkbook
        -p, --port <number>          Port of a running Forkbook; targets that instance directly, no --cwd or --config-dir needed
        --attach                     Require attaching to a running Forkbook; gate failures are errors instead of a local fallback
        --no-attach                  Load the project configuration without attaching
        --input <object>             Raw JSON object with the tool arguments (escape hatch for complex values)
        --json                       Print the tool's structured result data as JSON instead of markdown
        -o, --output <path>          Write the result to a file instead of stdout
        -h, --help                   List the tools of the target Forkbook, or show one tool with its arguments

      Commands:
        example get-http-frame  Inspect an HTTP frame  [local]
        example preview         Preview an example  [requires running Forkbook]

      [local] tools run without a running Forkbook.
      [requires running Forkbook] tools need a running Forkbook dev server; start it first.
      Individual \`--key value\` flags override entries of \`--input\`.
      Run \`npx forkbook tools <toolset> <tool> --help\` for the description, arguments and \`--json\` output of one tool."
    `);
  });

  it('renders one toolset exactly', () => {
    expect(renderToolsetHelp(toolset, ctx)).toMatchInlineSnapshot(`
      "Usage: npx forkbook tools example <tool> [--key value ...]

      example — Example tools.

        example get-http-frame  [local]

          HTTP frame utilities
          This second line shows in the toolset and tool help, not in the overview.

          Arguments: none.

        example preview  [requires running Forkbook]

          Preview one example.

          Arguments:
          - \`--id\` (string, required): Example identifier

          Output (\`--json\`):
          - \`url\` (string, required): Preview URL"
    `);
  });

  it('renders one method with its input and output contracts', () => {
    expect(renderMethodHelp(toolset, 'preview', toolset.methods.preview, ctx))
      .toMatchInlineSnapshot(`
      "Usage: npx forkbook tools example preview [--key value ...]

      Execution: requires a running Forkbook dev server; start it first.

      Preview one example.

      Arguments:
      - \`--id\` (string, required): Example identifier

      Output (\`--json\`):
      - \`url\` (string, required): Preview URL"
    `);
  });
});
