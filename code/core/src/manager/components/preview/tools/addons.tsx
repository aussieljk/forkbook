import React from 'react';

import { Button } from '@aussieljk/forkbook/internal/components';
import type { Addon_BaseType } from '@aussieljk/forkbook/internal/types';

import { SidebarSimpleIcon, SquareSplitVerticalIcon } from '@phosphor-icons/react';

import { Consumer, types } from '@aussieljk/forkbook/manager-api';
import type { Combo } from '@aussieljk/forkbook/manager-api';

import { focusableUIElements } from '../../../../manager-api/modules/layout.ts';

const SHOW_ADDON_PANEL_BUTTON_ID = 'storybook-show-addon-panel';

const menuMapper = ({ api, state }: Combo) => ({
  isVisible: api.getIsPanelShown(),
  singleStory: state.singleStory,
  panelPosition: state.layout.panelPosition,
  showPanel: async (forceFocus: boolean) => {
    api.togglePanel(true);
    api.focusOnUIElement(focusableUIElements.addonPanel, {
      forceFocus,
      poll: true,
    });
  },
});

export const addonsTool: Addon_BaseType = {
  title: 'addons',
  id: 'addons',
  type: types.TOOL,
  match: ({ viewMode }) => viewMode === 'story',
  render: () => {
    return (
      <Consumer filter={menuMapper}>
        {({ isVisible, showPanel, singleStory, panelPosition }) =>
          !singleStory &&
          !isVisible && (
            <>
              <Button
                padding="small"
                variant="ghost"
                ariaLabel="Show addon panel"
                id={SHOW_ADDON_PANEL_BUTTON_ID}
                key="addons"
                onClick={() => showPanel(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    showPanel(true);
                  }
                }}
              >
                {panelPosition === 'bottom' ? <SquareSplitVerticalIcon /> : <SidebarSimpleIcon />}
              </Button>
            </>
          )
        }
      </Consumer>
    );
  },
};
