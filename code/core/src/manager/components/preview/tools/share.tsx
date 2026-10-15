import React from 'react';

import { Button } from 'storybook/internal/components';
import { SHARE_ISOLATE_MODE } from 'storybook/internal/core-events';
import type { Addon_BaseType } from 'storybook/internal/types';

import { PopOutIcon } from '@storybook/icons';

import { Consumer, types } from 'storybook/manager-api';
import type { Combo } from 'storybook/manager-api';

const mapper = ({ api, state }: Combo) => {
  const { storyId, refId } = state;
  return { api, refId, storyId };
};

export const isolationModeTool: Addon_BaseType = {
  title: 'isolation mode',
  id: 'isolationMode',
  type: types.TOOLEXTRA,
  match: ({ viewMode }) => viewMode === 'story',
  render: () => (
    <Consumer filter={mapper}>
      {({ api, storyId, refId }) => {
        if (!storyId) return null;
        return (
          <Button
            padding="small"
            variant="ghost"
            ariaLabel="Open in isolation mode"
            tooltip="Open in isolation mode"
            onClick={() => {
              const originHrefs = api.getStoryHrefs(storyId, {
                base: 'origin',
                refId,
                inheritArgs: true,
              });
              window.open(originHrefs.previewHref, '_blank', 'noopener,noreferrer');
              api.emit(SHARE_ISOLATE_MODE, originHrefs.previewHref);
            }}
          >
            <PopOutIcon />
          </Button>
        );
      }}
    </Consumer>
  ),
};
