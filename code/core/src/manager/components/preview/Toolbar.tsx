import React, { useRef } from 'react';

import { AbstractToolbar, Button } from '@aussieljk/forkbook/internal/components';
import { Addon_TypesEnum, type Addon_BaseType } from '@aussieljk/forkbook/internal/types';

import { CloseIcon, ExpandIcon } from '@storybook/icons';

import { clsx } from 'clsx';
import {
  Consumer,
  addons,
  merge,
  types,
  type API,
  type Combo,
  type LeafEntry,
  type State,
} from '@aussieljk/forkbook/manager-api';

import { useLandmark } from '../../hooks/useLandmark.ts';
import { useLayout } from '../layout/LayoutProvider.tsx';
import type { PreviewProps } from './utils/types.tsx';
import styles from './Toolbar.module.css';

export const getTools = (getFn: API['getElements']) => Object.values(getFn(types.TOOL));
export const getToolsExtra = (getFn: API['getElements']) => Object.values(getFn(types.TOOLEXTRA));

const fullScreenMapper = ({ api, state }: Combo) => {
  return {
    toggle: api.toggleFullscreen,
    isFullscreen: api.getIsFullscreen(),
    shortcut: api.getShortcutKeys().fullScreen,
    hasPanel: Object.keys(api.getElements(Addon_TypesEnum.PANEL)).length > 0,
    singleStory: state.singleStory,
    isNavUnavailable: api.getNavAvailability() === 'unavailable',
  };
};

export const fullScreenTool: Addon_BaseType = {
  title: 'fullscreen',
  id: 'fullscreen',
  type: types.TOOL,
  // @ts-expect-error (non strict)
  match: (p) => ['story', 'docs'].includes(p.viewMode),
  render: () => {
    const { isMobile } = useLayout();

    if (isMobile) {
      return null;
    }

    return (
      <Consumer filter={fullScreenMapper}>
        {({ toggle, isFullscreen, shortcut, hasPanel, singleStory, isNavUnavailable }) =>
          !isNavUnavailable &&
          (!singleStory || (singleStory && hasPanel)) && (
            <Button
              key="full"
              padding="small"
              variant="ghost"
              onClick={() => toggle()}
              ariaLabel={isFullscreen ? 'Exit full screen' : 'Enter full screen'}
              shortcut={shortcut}
            >
              {isFullscreen ? <CloseIcon /> : <ExpandIcon />}
            </Button>
          )
        }
      </Consumer>
    );
  },
};

export interface ToolData {
  isShown: boolean;
  tools: Addon_BaseType[];
  toolsExtra: Addon_BaseType[];
}

export const ToolbarComp = React.memo<ToolData>(function ToolbarComp({
  isShown,
  tools,
  toolsExtra,
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const { landmarkProps } = useLandmark(
    { 'aria-labelledby': 'fb-preview-toolbar-title', role: 'region' },
    sectionRef
  );

  return isShown && (tools.length > 0 || toolsExtra.length > 0) ? (
    <section
      className={clsx('fb-bar', styles.section)}
      key="toolbar"
      data-testid="fb-preview-toolbar"
      ref={sectionRef}
      {...landmarkProps}
    >
      <h2 id="fb-preview-toolbar-title" className="fb-sr-only">
        Toolbar
      </h2>
      <AbstractToolbar className={styles.toolbar}>
        <Tools key="left" list={tools} />
        <Tools key="right" list={toolsExtra} />
      </AbstractToolbar>
    </section>
  ) : null;
});

export const Tools = React.memo<{ list: Addon_BaseType[] }>(function Tools({ list }) {
  return (
    <div className={styles.toolGroup}>
      {list.filter(Boolean).map(({ render: Render, id, ...t }, index) => (
        // @ts-expect-error (Converted from ts-ignore)
        <Render key={id || t.key || `f-${index}`} />
      ))}
    </div>
  );
});

function toolbarItemHasBeenExcluded(item: Partial<Addon_BaseType>, entry: LeafEntry | undefined) {
  const parameters = entry?.type === 'story' && entry?.prepared ? entry?.parameters : {};
  // @ts-expect-error (non strict)
  const toolbarItemsFromStoryParameters = 'toolbar' in parameters ? parameters.toolbar : undefined;
  const { toolbar: toolbarItemsFromAddonsConfig } = addons.getConfig();

  const toolbarItems = merge(
    toolbarItemsFromAddonsConfig || {},
    toolbarItemsFromStoryParameters || {}
  );

  // @ts-expect-error (non strict)
  return toolbarItems ? !!toolbarItems[item?.id]?.hidden : false;
}

export function filterToolsSide(
  tools: Addon_BaseType[],
  entry: PreviewProps['entry'],
  viewMode: State['viewMode'],
  location: State['location'],
  path: State['path']
) {
  const filter = (item: Partial<Addon_BaseType>) =>
    item &&
    (!item.match ||
      item.match({
        storyId: entry?.id,
        refId: entry?.refId,
        viewMode,
        location,
        path,
      })) &&
    !toolbarItemHasBeenExcluded(item, entry);

  return tools.filter(filter);
}
