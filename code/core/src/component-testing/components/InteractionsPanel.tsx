import * as React from 'react';

import type { API } from '@aussieljk/forkbook/manager-api';

import { type Call, type CallStates, type ControlStates } from '../../instrumenter/types.ts';
import { announce } from '../../shared/announce.ts';
import { INTERNAL_RENDER_CALL_ID } from '../constants.ts';
import { isTestAssertionError, useAnsiToHtmlFilter } from '../utils.ts';
import { DetachedDebuggerMessage } from './DetachedDebuggerMessage.tsx';
import { Empty } from './EmptyState.tsx';
import { Interaction } from './Interaction.tsx';
import type { PlayStatus } from './StatusBadge.tsx';
import { TestDiscrepancyMessage } from './TestDiscrepancyMessage.tsx';
import { Toolbar } from './Toolbar.tsx';
import styles from './InteractionsPanel.module.css';

export interface Controls {
  start: (args?: any) => void;
  back: (args?: any) => void;
  goto: (args?: any) => void;
  next: (args?: any) => void;
  end: (args?: any) => void;
  rerun: (args?: any) => void;
}

interface InteractionsPanelProps {
  storyUrl: string;
  status: PlayStatus;
  controls: Controls;
  controlStates: ControlStates;
  interactions: (Call & {
    status?: CallStates;
    childCallIds?: Call['id'][];
    isHidden: boolean;
    isCollapsed: boolean;
    toggleCollapsed: () => void;
  })[];
  fileName?: string;
  hasException?: boolean;
  caughtException?: Error;
  unhandledErrors?: SerializedError[];
  pausedAt?: Call['id'];
  calls: Map<string, any>;
  endRef?: React.Ref<HTMLDivElement>;
  onScrollToEnd?: () => void;
  hasResultMismatch?: boolean;
  browserTestStatus?: CallStates;
  importPath?: string;
  canOpenInEditor?: boolean;
  api: API;
}

const StatusAnnouncementMapping: Record<PlayStatus, string> = {
  rendering: 'Component test is rendering.',
  playing: 'Component test is running.',
  completed: 'Component test completed successfully.',
  errored: 'Component test failed.',
  aborted: 'Component test was aborted.',
} as const;

const getStatusAnnouncement = (status: PlayStatus, hasException?: boolean) => {
  if (status === 'completed' && hasException) {
    return StatusAnnouncementMapping.errored;
  }
  return StatusAnnouncementMapping[status];
};

export const InteractionsPanel: React.FC<InteractionsPanelProps> = React.memo(
  function InteractionsPanel({
    storyUrl,
    status,
    calls,
    controls,
    controlStates,
    interactions,
    fileName,
    hasException,
    caughtException,
    unhandledErrors,
    pausedAt,
    onScrollToEnd,
    endRef,
    hasResultMismatch,
    browserTestStatus,
    importPath,
    canOpenInEditor,
    api,
  }) {
    const filter = useAnsiToHtmlFilter();
    const hasRealInteractions = interactions.some((i) => i.id !== INTERNAL_RENDER_CALL_ID);
    const isListBusy = status === 'rendering' || status === 'playing';
    const statusAnnouncement = getStatusAnnouncement(status, hasException);
    const isStatusAlert = status === 'errored' || (status === 'completed' && hasException);

    React.useEffect(() => {
      announce(statusAnnouncement, isStatusAlert ? 'assertive' : 'polite');
    }, [statusAnnouncement, isStatusAlert]);

    return (
      <div className={styles.container}>
        {hasResultMismatch && <TestDiscrepancyMessage browserTestStatus={browserTestStatus} />}
        {controlStates.detached && (hasRealInteractions || hasException) && (
          <DetachedDebuggerMessage storyUrl={storyUrl} />
        )}
        <Toolbar
          controls={controls}
          controlStates={controlStates}
          status={status}
          storyFileName={fileName}
          onScrollToEnd={onScrollToEnd}
          importPath={importPath}
          canOpenInEditor={canOpenInEditor}
          api={api}
        />
        <section className={styles.section}>
          <h3 className={styles.heading}>Interaction steps</h3>
          <ol className={styles.list} aria-busy={isListBusy}>
            {interactions.map((call) => (
              <Interaction
                key={call.id}
                call={call}
                callsById={calls}
                controls={controls}
                controlStates={controlStates}
                childCallIds={call.childCallIds}
                isHidden={call.isHidden}
                isCollapsed={call.isCollapsed}
                toggleCollapsed={call.toggleCollapsed}
                pausedAt={pausedAt}
              />
            ))}
          </ol>
        </section>
        {caughtException && !isTestAssertionError(caughtException) && (
          <div className={styles.caughtException}>
            <div className={styles.caughtExceptionTitle}>
              Caught exception in <code className={styles.caughtExceptionCode}>play</code> function
            </div>
            <pre
              className={styles.caughtExceptionStack}
              data-chromatic="ignore"
              dangerouslySetInnerHTML={{
                __html: filter.toHtml(printSerializedError(caughtException)),
              }}
            ></pre>
          </div>
        )}
        {unhandledErrors && (
          <div className={styles.caughtException}>
            <div className={styles.caughtExceptionTitle}>Unhandled Errors</div>
            <p className={styles.caughtExceptionDescription}>
              Found {unhandledErrors.length} unhandled error{unhandledErrors.length > 1 ? 's' : ''}{' '}
              while running the play function. This might cause false positive assertions. Resolve
              unhandled errors or ignore unhandled errors with setting the
              <code className={styles.caughtExceptionCode}>
                test.dangerouslyIgnoreUnhandledErrors
              </code>{' '}
              parameter to <code className={styles.caughtExceptionCode}>true</code>.
            </p>

            {unhandledErrors.map((error, i) => (
              <pre className={styles.caughtExceptionStack} key={i} data-chromatic="ignore">
                {printSerializedError(error)}
              </pre>
            ))}
          </div>
        )}
        <div ref={endRef} />
        {status === 'completed' && !caughtException && !hasRealInteractions && <Empty />}
      </div>
    );
  }
);

export interface SerializedError {
  name: string;
  stack?: string;
  message: string;
}

function printSerializedError(error: SerializedError) {
  return error.stack || `${error.name}: ${error.message}`;
}
