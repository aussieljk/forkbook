import { readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import type { Renderer, StoryContextForEnhancers } from 'storybook/internal/types';

import { inferControls } from 'storybook/preview-api';

import { ComponentMetaManager } from './componentManifest/componentMeta/ComponentMetaManager.ts';
import { extractArgTypesFromComponentMeta } from './docgen/buildDocgen.ts';

// Each folder has an `input.tsx` that exports the component as `component`.
const fixturesDir = resolve(__dirname, '../template/stories/docgen-components');
const manager = new ComponentMetaManager();

afterAll(() => manager.dispose());

describe('react component properties', () => {
  const fixtures = readdirSync(fixturesDir, { withFileTypes: true }).filter((entry) =>
    entry.isDirectory()
  );

  it.each(fixtures.map((fixture) => fixture.name))('%s', async (name) => {
    const fixtureDir = join(fixturesDir, name);
    const doc = manager.extractFromFile(join(fixtureDir, 'input.tsx'), 'component');
    expect(doc).toBeDefined();

    // File names differ between machines.
    const props = Object.fromEntries(
      Object.entries(doc!.props).map(([propName, prop]) => [
        propName,
        { ...prop, parent: prop.parent?.name },
      ])
    );
    await expect(
      JSON.stringify({ ...doc, filePath: undefined, props }, null, 2)
    ).toMatchFileSnapshot(join(fixtureDir, 'docgen.snapshot'));

    const argTypes = extractArgTypesFromComponentMeta(doc);
    const rows = inferControls({
      argTypes,
      parameters: { __isArgsStory: true },
    } as unknown as StoryContextForEnhancers<Renderer>);
    await expect(rows).toMatchFileSnapshot(join(fixtureDir, 'argTypes.snapshot'));
  });
});
