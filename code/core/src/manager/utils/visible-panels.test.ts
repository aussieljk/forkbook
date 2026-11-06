import { describe, expect, it } from 'vitest';

import type { API_StoryEntry, Addon_BaseType } from '@aussieljk/forkbook/internal/types';
import { Addon_TypesEnum } from '@aussieljk/forkbook/internal/types';

import { getVisiblePanels, hasControllableArgs } from './visible-panels.ts';

const story = (extra: Partial<API_StoryEntry> = {}): API_StoryEntry =>
  ({
    type: 'story',
    subtype: 'story',
    id: 'a--b',
    name: 'B',
    title: 'A',
    importPath: './a.stories.tsx',
    depth: 1,
    parent: 'a',
    prepared: true,
    parameters: {},
    args: {},
    argTypes: {},
    initialArgs: {},
    tags: [],
    ...extra,
  }) as API_StoryEntry;

const panel = (extra: Partial<Addon_BaseType> = {}): Addon_BaseType => ({
  type: Addon_TypesEnum.PANEL,
  title: 'Panel',
  render: () => null,
  ...extra,
});

const controlsPanel = panel({
  paramKey: 'controls',
  disabled: (_parameters, entry) => (entry ? !hasControllableArgs(entry) : false),
});

describe('hasControllableArgs', () => {
  it('is false when the story has no args', () => {
    expect(hasControllableArgs(story())).toBe(false);
  });

  it('is false when no arg type has a control', () => {
    expect(
      hasControllableArgs(
        story({
          args: { a: 1 },
          argTypes: {
            a: { name: 'a', control: false },
            b: { name: 'b' },
            c: { name: 'c', control: { type: 'text', disable: true } as never },
            d: { name: 'd', control: { type: 'text' }, table: { disable: true } },
          },
        })
      )
    ).toBe(false);
  });

  it('is true when an arg type has a control', () => {
    expect(
      hasControllableArgs(story({ argTypes: { a: { name: 'a', control: { type: 'text' } } } }))
    ).toBe(true);
  });

  it('is true when the story is not prepared', () => {
    expect(hasControllableArgs(story({ prepared: false }))).toBe(true);
  });
});

describe('getVisiblePanels', () => {
  it('hides only the Controls panel when other panels exist', () => {
    const panels = { controls: controlsPanel, a11y: panel() };
    expect(Object.keys(getVisiblePanels(panels, story()))).toEqual(['a11y']);
  });

  it('returns no panels when Controls is the only panel and the story has no controls', () => {
    expect(getVisiblePanels({ controls: controlsPanel }, story())).toEqual({});
  });

  it('shows Controls again for a story with controls', () => {
    const panels = { controls: controlsPanel, a11y: panel() };
    const withControls = story({ argTypes: { a: { name: 'a', control: { type: 'text' } } } });
    expect(Object.keys(getVisiblePanels(panels, withControls))).toEqual(['controls', 'a11y']);
  });

  it('respects the disable parameter', () => {
    const panels = { a11y: panel({ paramKey: 'a11y' }) };
    expect(getVisiblePanels(panels, story({ parameters: { a11y: { disable: true } } }))).toEqual(
      {}
    );
  });

  it('keeps every panel for entries that are not stories', () => {
    const panels = { controls: controlsPanel };
    expect(getVisiblePanels(panels, undefined)).toBe(panels);
  });
});
