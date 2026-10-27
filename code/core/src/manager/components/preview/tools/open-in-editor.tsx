import React from 'react';

import { Button } from '@aussieljk/forkbook/internal/components';
import type { Addon_BaseType } from '@aussieljk/forkbook/internal/types';

import { global } from '../../../../shared/global.ts';
import { CodeIcon } from 'lucide-react';

import { Consumer, types, useStorybookApi } from '@aussieljk/forkbook/manager-api';
import type { Combo } from '@aussieljk/forkbook/manager-api';

const mapper = ({ state, api }: Combo) => {
  const { storyId, refId } = state;
  const entry = api.getData(storyId, refId);

  const isCompositionStory = !!refId; // Only allow opening local stories in editor

  return {
    storyId,
    isCompositionStory,
    importPath: entry?.importPath as string | undefined,
  };
};

export const openInEditorTool: Addon_BaseType = {
  title: 'open-in-editor',
  id: 'open-in-editor',
  type: types.TOOL,
  match: ({ viewMode }) =>
    global.CONFIG_TYPE === 'DEVELOPMENT' && (viewMode === 'story' || viewMode === 'docs'),
  render: () => (
    <Consumer filter={mapper}>
      {({ importPath, isCompositionStory }) => {
        const api = useStorybookApi();
        if (isCompositionStory || !importPath) {
          return null;
        }
        return (
          <Button
            key="open-in-editor"
            onClick={() =>
              api.openInEditor({
                file: importPath,
              })
            }
            ariaLabel="Open in editor"
            padding="small"
            variant="ghost"
          >
            <CodeIcon />
          </Button>
        );
      }}
    </Consumer>
  ),
};
