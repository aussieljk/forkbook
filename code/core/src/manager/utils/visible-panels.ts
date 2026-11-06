import type {
  API_HashEntry,
  API_StoryEntry,
  Addon_BaseType,
  Addon_Collection,
} from '@aussieljk/forkbook/internal/types';

type PanelCollection = Addon_Collection<Addon_BaseType>;

/**
 * Removes the panels that the current story disables, by a `{ disable: true }` parameter or by
 * the `disabled` option of the panel. Other entries (docs, groups) keep every panel.
 */
export const getVisiblePanels = <T extends PanelCollection | undefined>(
  allPanels: T,
  entry: API_HashEntry | undefined
): T => {
  if (!allPanels || entry?.type !== 'story') {
    return allPanels;
  }
  const { parameters } = entry;
  const filtered: PanelCollection = {};
  Object.entries(allPanels).forEach(([id, p]) => {
    const panelParameter = p.paramKey ? parameters?.[p.paramKey] : undefined;
    if (
      typeof panelParameter === 'object' &&
      panelParameter !== null &&
      'disable' in panelParameter &&
      panelParameter.disable
    ) {
      return;
    }
    if (
      p.disabled === true ||
      (typeof p.disabled === 'function' && p.disabled(parameters, entry as API_StoryEntry))
    ) {
      return;
    }
    filtered[id] = p;
  });
  return filtered as T;
};

/**
 * True when the story has at least one arg type with a control. A story that is not prepared yet
 * counts as controllable, so the panel does not flash while the story loads.
 */
export const hasControllableArgs = (story: API_StoryEntry): boolean => {
  if (!story.prepared) {
    return true;
  }
  return Object.values(story.argTypes ?? {}).some((argType) => {
    const { control, table } = argType as {
      control?: unknown;
      table?: { disable?: boolean };
    };
    if (table?.disable || !control) {
      return false;
    }
    return !(typeof control === 'object' && (control as { disable?: boolean }).disable);
  });
};
