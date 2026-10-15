import React, { Fragment, useEffect, useRef } from 'react';

import { ActionBar, ScrollArea } from '@aussieljk/forkbook/internal/components';

import { Inspector } from 'react-inspector';
import { useTheme } from '@aussieljk/forkbook/theming';

import type { ActionDisplay } from '../../models/index.ts';
import styles from './index.module.css';

interface InspectorProps {
  sortObjectKeys: boolean;
  showNonenumerable: boolean;
  name: any;
  data: any;
  expandLevel?: number;
}

const ThemedInspector = (props: InspectorProps) => {
  const theme = useTheme();
  return <Inspector theme={theme.addonActionsTheme || 'chromeLight'} table={false} {...props} />;
};

interface ActionLoggerProps {
  actions: ActionDisplay[];
  expandLevel?: number;
  onClear: () => void;
}

export const ActionLogger = ({ actions, expandLevel, onClear }: ActionLoggerProps) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const wrapper = wrapperRef.current;
  const wasAtBottom = wrapper && wrapper.scrollHeight - wrapper.scrollTop === wrapper.clientHeight;

  useEffect(() => {
    // Scroll to bottom, when the action panel was already scrolled down

    // Scroll to bottom, when the action panel was already scrolled down
    if (wasAtBottom) {
      wrapperRef.current.scrollTop = wrapperRef.current.scrollHeight;
    }
  }, [wasAtBottom, actions.length]);

  return (
    <Fragment>
      <ScrollArea ref={wrapperRef} horizontal vertical className={styles.wrapper}>
        {actions.map((action: ActionDisplay) => (
          <div className={styles.action} key={action.id}>
            {action.count > 1 && <div className={styles.counter}>{action.count}</div>}
            <div className={styles.inspectorContainer}>
              <ThemedInspector
                sortObjectKeys
                showNonenumerable={false}
                name={action.data.name}
                data={action.data.args ?? action.data}
                expandLevel={expandLevel}
              />
            </div>
          </div>
        ))}
      </ScrollArea>
      <ActionBar actionItems={[{ title: 'Clear', onClick: onClear }]} />
    </Fragment>
  );
};
