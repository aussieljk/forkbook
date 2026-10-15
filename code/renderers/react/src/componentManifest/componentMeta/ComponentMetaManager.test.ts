import { utimesSync, writeFileSync } from 'node:fs';

import { afterAll, describe, expect, it } from 'vitest';

import { dedent } from 'ts-dedent';

import type { ComponentRef } from '../types.ts';
import { ComponentMetaManager } from './ComponentMetaManager.ts';
import { cleanup, createTempProject } from './test-helpers.ts';

const { projectDir, filePaths } = createTempProject({
  'Button.tsx': dedent`
    import React from 'react';
    export interface ButtonProps {
      /**
       * The text of the button.
       * @deprecated Use children.
       */
      label?: string;
      size?: 'small' | 'medium' | 'large';
    }
    /** A button. */
    export const Button = ({ size = 'medium' }: ButtonProps) => <button />;
  `,
  'Button.stories.tsx': dedent`
    import { Button } from './Button';
    export default { component: Button };
  `,
});
const manager = new ComponentMetaManager({ cwd: projectDir });

afterAll(() => {
  manager.dispose();
  cleanup(projectDir);
});

const extractButton = () => {
  const component: ComponentRef = {
    componentName: 'Button',
    importId: './Button',
    importName: 'Button',
    localImportName: 'Button',
    isPackage: false,
    path: filePaths['Button.tsx'],
  };
  manager.batchExtract([{ storyPath: filePaths['Button.stories.tsx'], component }]);
  return component.reactComponentMeta;
};

describe('ComponentMetaManager', () => {
  it('extracts the props of a story component', () => {
    const doc = extractButton();
    expect(doc?.description).toBe('A button.');
    expect(doc?.props.label.description).toBe('The text of the button.\n@deprecated Use children.');
    expect(doc?.props.size).toMatchObject({
      required: false,
      defaultValue: { value: "'medium'" },
      // Tsgo sorts union members; the extractor gives back the order of the source.
      type: { name: 'enum', raw: '"small" | "medium" | "large"' },
    });
  });

  it('extracts the props of a component file without a story', () => {
    const doc = manager.extractFromFile(filePaths['Button.tsx'], 'Button');
    expect(Object.keys(doc?.props ?? {})).toEqual(['label', 'size']);
  });

  it('reads a component file again when it changes', () => {
    expect(extractButton()?.props.disabled).toBeUndefined();

    writeFileSync(
      filePaths['Button.tsx'],
      dedent`
        import React from 'react';
        export interface ButtonProps { disabled?: boolean }
        export const Button = (props: ButtonProps) => <button />;
      `
    );
    // Make sure that the modified time changes, also on file systems with a coarse time.
    const later = new Date(Date.now() + 10_000);
    utimesSync(filePaths['Button.tsx'], later, later);

    expect(Object.keys(extractButton()?.props ?? {})).toEqual(['disabled']);
  });
});
