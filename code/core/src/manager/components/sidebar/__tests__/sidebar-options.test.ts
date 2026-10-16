// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';

import { addons } from '@aussieljk/forkbook/manager-api';

import { expandAllByDefault } from '../useExpanded.ts';

describe('sidebar.expandAll', () => {
  afterEach(() => addons.setConfig({ sidebar: {} }));

  it('is on by default', () => {
    expect(expandAllByDefault()).toBe(true);
  });

  it('is off with expandAll: false', () => {
    addons.setConfig({ sidebar: { expandAll: false } });
    expect(expandAllByDefault()).toBe(false);
  });
});
