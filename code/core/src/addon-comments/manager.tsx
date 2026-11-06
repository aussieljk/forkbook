import React from 'react';

import { ToggleButton } from '@aussieljk/forkbook/internal/components';
import { addons, types, useAddonState, useStorybookApi } from '@aussieljk/forkbook/manager-api';

import { MessageSquareTextIcon } from 'lucide-react';

import { CommentsPanel } from './components/CommentsPanel.tsx';
import { ADDON_ID, EVENTS, PANEL_ID, TOOL_ID } from './constants.ts';
import { DEFAULT_STATE, type CommentsAddonState } from './state.ts';
import type { CommentElement } from './types.ts';

const CommentTool = () => {
  const api = useStorybookApi();
  const [state, setState] = useAddonState<CommentsAddonState>(ADDON_ID, DEFAULT_STATE);
  return (
    <ToggleButton
      key="comments"
      padding="small"
      variant="ghost"
      pressed={state.picking}
      ariaLabel="Add comment"
      tooltip="Add a comment on an element"
      onClick={() => {
        if (state.picking) {
          api.emit(EVENTS.PICK_CANCEL);
          setState(DEFAULT_STATE);
          return;
        }
        api.togglePanel(true);
        api.setSelectedPanel(PANEL_ID);
        setState({ picking: true });
        api.emit(EVENTS.PICK_START);
      }}
    >
      <MessageSquareTextIcon />
    </ToggleButton>
  );
};

addons.register(ADDON_ID, (api) => {
  // Listen here, not in the panel, so a pick is kept when the panel is not on screen.
  api.on(EVENTS.PICKED, (element: CommentElement) => {
    void api.setAddonState<CommentsAddonState>(ADDON_ID, { picking: false, pending: element });
    api.togglePanel(true);
    api.setSelectedPanel(PANEL_ID);
  });
  api.on(EVENTS.PICK_ENDED, () => {
    void api.setAddonState<CommentsAddonState>(ADDON_ID, DEFAULT_STATE);
  });

  addons.add(TOOL_ID, {
    type: types.TOOL,
    title: 'Comments',
    match: ({ viewMode }) => viewMode === 'story',
    render: () => <CommentTool />,
  });

  addons.add(PANEL_ID, {
    type: types.PANEL,
    title: 'Comments',
    render: ({ active }) => <CommentsPanel active={!!active} />,
  });
});
