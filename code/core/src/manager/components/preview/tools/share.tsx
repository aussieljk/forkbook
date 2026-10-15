import React from 'react';

import { Button } from '@aussieljk/forkbook/internal/components';
import { SHARE_ISOLATE_MODE } from '@aussieljk/forkbook/internal/core-events';
import type { Addon_BaseType } from '@aussieljk/forkbook/internal/types';

import { PopOutIcon } from '@storybook/icons';

import { Consumer, types } from '@aussieljk/forkbook/manager-api';
import type { Combo } from '@aussieljk/forkbook/manager-api';

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
