import type { ComponentProps, FC } from 'react';
import React, { useMemo, useState } from 'react';

import { Addon_TypesEnum } from '@aussieljk/forkbook/internal/types';

import { useChannel, useStorybookApi, useStorybookState } from '@aussieljk/forkbook/manager-api';

import { STORY_PREPARED } from '../../core-events/index.ts';
import { focusableUIElements } from '../../manager-api/modules/layout.ts';
import { AddonPanel } from '../components/panel/Panel.tsx';
import { getVisiblePanels } from '../utils/visible-panels.ts';

const Panel: FC<Partial<ComponentProps<typeof AddonPanel>>> = (props) => {
  const api = useStorybookApi();
  const state = useStorybookState();
  const [story, setStory] = useState(api.getCurrentStoryData());

  useChannel(
    {
      [STORY_PREPARED]: () => {
        setStory(api.getCurrentStoryData());
      },
    },
    []
  );

  const panelActions = useMemo(
    () => ({
      onSelect: (panel: string) => api.setSelectedPanel(panel),
      toggleVisibility: async () => {
        const wasPanelShown = api.getIsPanelShown();
        api.togglePanel();
        if (wasPanelShown) {
          const success = await api.focusOnUIElement(focusableUIElements.showAddonPanel);
          // Fallback to body for predictable behavior.
          if (success === false) {
            document.body.focus();
          }
        }
      },
      togglePosition: () => api.togglePanelPosition(),
    }),
    [api]
  );

  const panels = useMemo(
    () => getVisiblePanels(api.getElements(Addon_TypesEnum.PANEL), story),
    [api, story]
  );

  return (
    <AddonPanel
      panels={panels}
      selectedPanel={api.getSelectedPanel()}
      panelPosition={state.layout.panelPosition}
      actions={panelActions}
      shortcuts={api.getShortcutKeys()}
      {...props}
    />
  );
};

export default Panel;
