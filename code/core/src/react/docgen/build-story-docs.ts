import type { StoryDocsPayload, StoryDocsProviderInput } from '@aussieljk/forkbook/internal/types';

import { getStoryImportPathFromEntry } from '@aussieljk/forkbook/internal/common';
import path from 'pathe';

import { buildStoryDocsFromResolved } from '../componentManifest/buildReactComponentDocgen.ts';
import { resolveStoryFileComponents } from '../componentManifest/resolveComponents.ts';

export interface BuildStoryDocsContext {
  /** Resolve a CSF import path to an absolute file path. Defaults to `process.cwd()` join. */
  resolvePath?: (importPath: string) => string;
}

/**
 * Build a {@link StoryDocsPayload} for the stories in one CSF story file.
 *
 * Uses {@link resolveStoryFileComponents} and {@link buildStoryDocsFromResolved} without running
 * the docgen engine.
 */
export async function buildStoryDocsPayload(
  input: StoryDocsProviderInput,
  context: BuildStoryDocsContext
): Promise<StoryDocsPayload | undefined> {
  const storyFilePath = getStoryImportPathFromEntry(input.entry);
  if (!storyFilePath) {
    return undefined;
  }

  const resolvePath =
    context.resolvePath ?? ((importPath: string) => path.join(process.cwd(), importPath));
  const storyPath = resolvePath(storyFilePath);

  let resolved;
  try {
    resolved = await resolveStoryFileComponents({
      storyPath,
      title: input.entry.title,
    });
  } catch {
    return undefined;
  }

  const { csf, componentName, component, allComponents } = resolved;

  return buildStoryDocsFromResolved({
    entry: input.entry,
    storyPath,
    storyFilePath,
    csf,
    componentName,
    component,
    allComponents,
  });
}
