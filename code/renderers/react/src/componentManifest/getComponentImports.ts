import { dirname } from 'node:path';

import { type NodePath, types as t } from 'storybook/internal/babel';
import {
  type CsfFile,
  buildImportStatements,
  collectImportBindings,
  resolveComponentImport,
} from 'storybook/internal/csf-tools';
import { logger } from 'storybook/internal/node-logger';

import type { ComponentRef } from './types.ts';
import { cachedResolveImport, matchPath } from './utils.ts';

export type { ComponentRef } from './types.ts';

/** Selected component for a story file; `storyPath` is the absolute path on disk. */
export type StoryRef = {
  storyPath: string;
  component?: ComponentRef;
};

const baseIdentifier = (component: string) => component.split('.')[0] ?? component;

/**
 * Collects all React component references used by a CSF story file and resolves as much import and
 * docgen information as possible.
 *
 * Behavior:
 *
 * - Scans the AST for JSX opening elements and meta.component to discover component identifiers.
 * - Filters out components that are locally defined without an import (these are not public imports).
 * - Maps local identifiers back to their import source/specifier when available.
 * - Optionally resolves the absolute file path of each component import (using storyFilePath).
 *
 * Notes:
 *
 * - Member expressions like Foo.Bar are supported; namespace imports are represented accordingly.
 * - The docgen engine adds `importOverride` later, from the JSDoc tags of the component.
 */
export const getComponents = async ({
  csf,
  storyFilePath,
  additionalComponentNames = [],
}: {
  csf: CsfFile;
  storyFilePath?: string;
  additionalComponentNames?: string[];
}): Promise<ComponentRef[]> => {
  const program: NodePath<t.Program> = csf._file.path;

  const componentSet = new Set<string>();
  /** Minimum JSX nesting depth per component name (1 = outermost JSX element). */
  const componentDepth = new Map<string, number>();
  const localToImport = collectImportBindings(program);

  // Gather components from all JSX opening elements, tracking nesting depth incrementally.
  let jsxDepth = 0;
  program.traverse({
    JSXElement: {
      enter() {
        jsxDepth++;
      },
      exit() {
        jsxDepth--;
      },
    },
    JSXOpeningElement(p) {
      const n = p.node.name;
      let name: string | undefined;
      if (t.isJSXIdentifier(n)) {
        name = n.name;
        if (name && /[A-Z]/.test(name.charAt(0))) {
          componentSet.add(name);
        }
      } else if (t.isJSXMemberExpression(n)) {
        const jsxNameToString = (nm: t.JSXIdentifier | t.JSXMemberExpression): string =>
          t.isJSXIdentifier(nm)
            ? nm.name
            : `${jsxNameToString(nm.object)}.${jsxNameToString(nm.property)}`;
        name = jsxNameToString(n);
        componentSet.add(name);
      }

      if (name) {
        // jsxDepth is already incremented by JSXElement.enter for the current element,
        // so subtract 1 to get the number of *wrapping* JSX ancestors.
        const depth = jsxDepth - 1;
        const existing = componentDepth.get(name);
        if (existing === undefined || depth < existing) {
          componentDepth.set(name, depth);
        }
      }
    },
  });

  // Add meta.component if present
  const metaComp = csf._meta?.component;
  if (metaComp) {
    componentSet.add(metaComp);
  }

  for (const componentName of additionalComponentNames) {
    componentSet.add(componentName);
  }

  const components = Array.from(componentSet).sort((a, b) => a.localeCompare(b));

  // Filter out locally defined components (those whose base identifier has a local, non-import binding)
  const isLocallyDefinedWithoutImport = (base: string): boolean => {
    const binding = program.scope.getBinding(base);

    if (!binding) {
      return false; // missing binding -> keep (will become null import)
    }
    const isImportBinding = Boolean(
      binding.path.isImportSpecifier?.() ||
      binding.path.isImportDefaultSpecifier?.() ||
      binding.path.isImportNamespaceSpecifier?.()
    );
    return !isImportBinding;
  };

  const filteredComponents = components.filter(
    (c) => !isLocallyDefinedWithoutImport(baseIdentifier(c))
  );

  const componentObjs = (
    await Promise.all(
      filteredComponents.map(async (c) => {
        const component = {
          ...resolveComponentImport(c, localToImport),
          jsxDepth: componentDepth.get(c),
        };

        let path;
        let isPackage = false;
        try {
          if (component.importId && storyFilePath) {
            path = cachedResolveImport(matchPath(component.importId, dirname(storyFilePath)), {
              basedir: dirname(storyFilePath),
            });
          }
        } catch (e) {
          logger.debug(e);
        }

        try {
          if (component.importId && !component.importId.startsWith('.') && storyFilePath) {
            // throws when it can not be resolved
            cachedResolveImport(component.importId, { basedir: dirname(storyFilePath) });
            isPackage = true;
          }
        } catch {}

        return { ...component, isPackage, ...(path ? { path } : {}) };
      })
    )
  ).sort((a, b) => a.componentName.localeCompare(b.componentName));

  return componentObjs;
};

/** Discover the component references of a CSF file and the import declarations they need. */
export async function getComponentData({
  csf,
  packageName,
  storyFilePath,
}: {
  csf: CsfFile;
  packageName?: string;
  storyFilePath?: string;
}): Promise<{
  components: ComponentRef[];
  imports: string[];
}> {
  const components = await getComponents({ csf, storyFilePath });
  const imports = buildImportStatements({ refs: components, packageName });
  return { components, imports };
}
