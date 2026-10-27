// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import React from 'react';

import { SELECT_STORY } from '@aussieljk/forkbook/internal/core-events';
import type { DocsContextProps } from '@aussieljk/forkbook/internal/types';

import { ThemeProvider, convert, themes } from '@aussieljk/forkbook/theming';

import { DocsContext } from './DocsContext.ts';
import { StoryGrid, type StoryGridProps } from './StoryGrid.tsx';

const entries = {
  'example-button--docs': {
    id: 'example-button--docs',
    title: 'Example/Button',
    name: 'Docs',
    type: 'docs',
    importPath: './Button.mdx',
    storiesImports: [],
  },
  'example-button--primary': {
    id: 'example-button--primary',
    title: 'Example/Button',
    name: 'Primary',
    type: 'story',
    subtype: 'story',
    importPath: './Button.stories.tsx',
    thumbnail: 'thumbnails/button.png',
  },
  'forms-input--basic': {
    id: 'forms-input--basic',
    title: 'Forms/Input',
    name: 'Basic',
    type: 'story',
    subtype: 'story',
    importPath: './Input.stories.tsx',
  },
  'home--docs': {
    id: 'home--docs',
    title: 'Home',
    name: 'Docs',
    type: 'docs',
    importPath: './.forkbook/Home.mdx',
    storiesImports: [],
  },
};

const renderGrid = (props: StoryGridProps = {}) => {
  const emit = vi.fn();
  const context = {
    channel: { emit },
    store: { storyIndex: { entries } },
  } as unknown as DocsContextProps;
  render(
    <ThemeProvider theme={convert(themes.light)}>
      <DocsContext.Provider value={context}>
        <StoryGrid {...props} />
      </DocsContext.Provider>
    </ThemeProvider>
  );
  return emit;
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('StoryGrid block', () => {
  it('shows one card for each component and hides the start page MDX', () => {
    vi.stubGlobal('FORKBOOK_ROOT', {
      enabled: true,
      mode: 'replace',
      mdxImportPath: './.forkbook/Home.mdx',
    });
    renderGrid();
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(2);
    expect(links[0].textContent).toContain('Button');
    expect(links[1].textContent).toContain('Input');
    expect(links[0].getAttribute('href')).toBe('./example/button/docs');
  });

  it('filters by title prefix', () => {
    renderGrid({ include: ['Forms'] });
    expect(screen.getAllByRole('link')).toHaveLength(1);
    cleanup();
    renderGrid({ exclude: ['Forms', 'Home'] });
    expect(screen.getAllByRole('link')).toHaveLength(1);
  });

  it('opens the component in the manager on click', () => {
    const emit = renderGrid({ include: ['Example'] });
    fireEvent.click(screen.getByRole('link'), { button: 0 });
    expect(emit).toHaveBeenCalledWith(SELECT_STORY, {
      storyId: 'example-button--docs',
      viewMode: 'docs',
    });
  });
});
