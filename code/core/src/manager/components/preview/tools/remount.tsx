import React, { useEffect, useState } from 'react';

import { Button } from '@aussieljk/forkbook/internal/components';
import { FORCE_REMOUNT } from '@aussieljk/forkbook/internal/core-events';
import type { Addon_BaseType } from '@aussieljk/forkbook/internal/types';

import { ArrowsClockwiseIcon } from '@phosphor-icons/react';

import { Consumer, types } from '@aussieljk/forkbook/manager-api';
import type { Combo } from '@aussieljk/forkbook/manager-api';

import styles from './remount.module.css';

const menuMapper = ({ api, state }: Combo) => {
  const { storyId } = state;
  return {
    storyId,
    remount: () => api.emit(FORCE_REMOUNT, { storyId: state.storyId }),
    api,
  };
};

export const remountTool: Addon_BaseType = {
  title: 'remount',
  id: 'remount',
  type: types.TOOL,
  match: ({ viewMode }) => viewMode === 'story',
  render: () => (
    <Consumer filter={menuMapper}>
      {({ remount, storyId, api }) => {
        const [isAnimating, setIsAnimating] = useState(false);
        const remountComponent = () => {
          if (!storyId) {
            return;
          }
          remount();
        };

        useEffect(() => {
          const handler = () => setIsAnimating(true);
          api.on(FORCE_REMOUNT, handler);
          return () => api.off?.(FORCE_REMOUNT, handler);
        }, [api]);

        return (
          <Button
            key="remount"
            className={styles.remountButton}
            data-remount-animating={isAnimating || undefined}
            padding="small"
            variant="ghost"
            ariaLabel="Reload story"
            onClick={remountComponent}
            onAnimationEnd={() => setIsAnimating(false)}
            disabled={!storyId}
          >
            <ArrowsClockwiseIcon />
          </Button>
        );
      }}
    </Consumer>
  ),
};
