import { readFileSync, rmSync } from 'node:fs';
import * as path from 'node:path';

import { afterAll } from 'vitest';

import { loadCsf } from 'storybook/internal/csf-tools';

import { type StoryRef, getComponents } from '../getComponentImports.ts';
import { findMatchingComponent } from '../resolveComponents.ts';
import { invalidateCache } from '../utils.ts';
import { ComponentMetaManager } from './ComponentMetaManager.ts';
import { createTempProject, writeFiles } from './test-helpers.ts';

/**
 * One temp project and one tsgo session for all tests of a file. Each test writes its files to a new
 * folder, so the tests do not see the files of other tests.
 */
const { projectDir } = createTempProject({});
const manager = new ComponentMetaManager({ cwd: projectDir });
let testCount = 0;

afterAll(() => {
  manager.dispose();
  rmSync(projectDir, { recursive: true, force: true });
});

/**
 * Full production flow: loadCsf → getComponents → batchExtract. Title is auto-derived from the
 * story file name for findMatchingComponent.
 */
export async function extractFromStory(
  files: Record<string, string>,
  storyFileName: string,
  options?: { componentName?: string }
): Promise<StoryRef> {
  invalidateCache();
  const filePaths = writeFiles(path.join(projectDir, `case-${testCount++}`), files);
  const storyPath = filePaths[storyFileName];
  const title = path.basename(storyFileName).replace(/\.stories\.\w+$/, '');
  const csf = loadCsf(readFileSync(storyPath, 'utf-8'), { makeTitle: () => title }).parse();

  const components = await getComponents({ csf, storyFilePath: storyPath });
  const componentName = options?.componentName ?? csf._meta?.component;
  const component = findMatchingComponent(components, componentName, title);

  const entry: StoryRef = { storyPath, component };
  manager.batchExtract([entry]);
  return entry;
}

/**
 * Convenience wrapper: generates a story with meta.component and extracts props. Goes through the
 * meta component path (no JSX).
 */
export async function extract(exportName: string, content: string): Promise<StoryRef> {
  const componentName = exportName === 'default' ? 'Component' : exportName;
  const importLine =
    exportName === 'default'
      ? `import ${componentName} from './Component';`
      : `import { ${exportName} as ${componentName} } from './Component';`;

  return extractFromStory(
    {
      'test/Component.tsx': content,
      'test/Component.stories.tsx': `${importLine}\nexport default { component: ${componentName} };`,
    },
    'test/Component.stories.tsx'
  );
}
