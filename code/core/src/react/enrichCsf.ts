import { type NodePath, recast, types as t } from 'storybook/internal/babel';
import { formatCode } from 'storybook/internal/common';
import { type CsfFile } from 'storybook/internal/csf-tools';
import type { PresetPropertyFn } from 'storybook/internal/types';

import { join } from 'pathe';

import { getCodeSnippet } from './componentManifest/generateCodeSnippet.ts';

export const enrichCsf: PresetPropertyFn<'experimental_enrichCsf'> = async (input, options) => {
  const features = await options.presets.apply('features');
  if (!features.experimentalCodeExamples || features.docgenServer) {
    return;
  }
  return async (csf: CsfFile, csfSource: CsfFile) => {
    const statements = Object.keys(csf._stories).map(async (key) => {
      if (!csfSource._meta?.component) {
        return;
      }
      let node;
      let snippet;
      try {
        node = getCodeSnippet(csfSource, key, csfSource._meta?.component).node;
      } catch (e) {
        if (!(e instanceof Error)) {
          return;
        }
        snippet = e.message;
      }

      try {
        // TODO read the user config
        if (!snippet && node) {
          snippet = await formatCode(join(process.cwd(), 'component.tsx'), recast.print(node).code);
        }
      } catch (e) {
        if (!(e instanceof Error)) {
          return;
        }
        snippet = e.message;
      }

      if (!snippet) {
        return;
      }

      // e.g. Story.input.parameters
      const originalParameters = t.memberExpression(
        csf._metaIsFactory
          ? t.memberExpression(t.identifier(key), t.identifier('input'))
          : t.identifier(key),
        t.identifier('parameters')
      );

      // e.g. Story.input.parameters?.docs
      const docsParameter = t.optionalMemberExpression(
        originalParameters,
        t.identifier('docs'),
        false,
        true
      );

      // For example:
      // Story.input.parameters = {
      //   ...Story.input.parameters,
      //   docs: {
      //     ...Story.input.parameters?.docs,
      //     source: {
      //       code: "snippet",
      //       ...Story.input.parameters?.docs?.source
      //     }
      //   }
      // };

      return t.expressionStatement(
        t.assignmentExpression(
          '=',
          originalParameters,
          t.objectExpression([
            t.spreadElement(originalParameters),
            t.objectProperty(
              t.identifier('docs'),
              t.objectExpression([
                t.spreadElement(docsParameter),
                t.objectProperty(
                  t.identifier('source'),
                  t.objectExpression([
                    t.objectProperty(t.identifier('code'), t.stringLiteral(snippet)),
                    t.spreadElement(
                      t.optionalMemberExpression(docsParameter, t.identifier('source'), false, true)
                    ),
                  ])
                ),
              ])
            ),
          ])
        )
      );
    });
    // Format the snippets in parallel, but add them in story order.
    for (const statement of await Promise.all(statements)) {
      if (statement) {
        csf._ast.program.body.push(statement);
      }
    }
  };
};
