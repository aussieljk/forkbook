import * as React from 'react';

import { Button } from '@aussieljk/forkbook/internal/components';

import { ChevronDownIcon, ChevronUpIcon } from '@storybook/icons';

import { type Call, CallStates, type ControlStates } from '../../instrumenter/types.ts';
import { INTERNAL_RENDER_CALL_ID } from '../constants.ts';
import { isChaiError, isJestError, useAnsiToHtmlFilter } from '../utils.ts';
import type { Controls } from './InteractionsPanel.tsx';
import { MatcherResult } from './MatcherResult.tsx';
import { MethodCall } from './MethodCall.tsx';
import { StatusIcon } from './StatusIcon.tsx';
import styles from './Interaction.module.css';

/**
 * Human-readable name for an interaction row (visible text and ARIA), matching instrumented data.
 *
 * Play-function `step('…')` calls are recorded with `method === 'step'` and the user-facing
 * description in `args[0]`. For a **top-level** step (`path` is empty) with a non-empty string
 * there, that string is used so the UI matches what the author wrote.
 *
 * Otherwise we use `call.method` (e.g. `click`, `expect`, nested steps without their own title).
 */
export const extractStepName = (call: Call) => {
  if (call.method === 'step' && call.path?.length === 0 && typeof call.args?.[0] === 'string') {
    const label = call.args[0].trim();
    if (label.length > 0) {
      return label;
    }
  }

  return call.method;
};

/**
 * Accessible name for the main row control. Uses "interaction row" wording so we never combine
 * "Interaction step" with a `stepName` of `step` (awkward "step … step" for screen readers).
 */
export const getRowAriaLabel = ({
  isNavigationDisabled,
  stepName,
  statusText,
}: {
  isNavigationDisabled: boolean;
  stepName: string;
  statusText: string;
}) =>
  `${isNavigationDisabled ? 'Interaction row' : 'Go to interaction row'}: ${stepName}. Status: ${statusText}.`;

export const getExpandButtonAriaLabel = ({
  isCollapsed,
  stepName,
}: {
  isCollapsed: boolean;
  stepName: string;
}) => `${isCollapsed ? 'Expand' : 'Collapse'} nested interaction steps for ${stepName}`;

const stepStatusTextMap: Record<Exclude<Call['status'], undefined>, string> = {
  [CallStates.DONE]: 'passed',
  [CallStates.ERROR]: 'failed',
  [CallStates.ACTIVE]: 'running',
  [CallStates.WAITING]: 'pending',
};

const getInteractionStatusText = (call: Call) =>
  call.status ? stepStatusTextMap[call.status] : 'not run';

const Exception = ({ exception }: { exception: Call['exception'] }) => {
  const filter = useAnsiToHtmlFilter();
  if (!exception) {
    return null;
  }
  if (exception.callId === INTERNAL_RENDER_CALL_ID) {
    return (
      <div className={styles.rowMessage}>
        <pre>
          <span className={styles.errorName}>{exception.name}:</span>{' '}
          <span className={styles.errorMessage}>{exception.message}</span>
        </pre>
        <p className={styles.errorExplainer}>
          The component failed to render properly. Automated component tests will not run until this
          is resolved. Check the full error message in Forkbook’s canvas to debug.
        </p>
      </div>
    );
  }
  if (isJestError(exception)) {
    return <MatcherResult {...exception} />;
  }
  if (isChaiError(exception)) {
    return (
      <div className={styles.rowMessage}>
        <MatcherResult
          message={`${exception.message}${exception.diff ? `\n\n${exception.diff}` : ''}`}
          style={{ padding: 0 }}
        />
        <p>See the full stack trace in the browser console.</p>
      </div>
    );
  }

  const paragraphs = exception.message.split('\n\n');
  const more = paragraphs.length > 1;
  return (
    <div className={styles.rowMessage}>
      <pre dangerouslySetInnerHTML={{ __html: filter.toHtml(paragraphs[0]) }}></pre>
      {more && <p>See the full stack trace in the browser console.</p>}
    </div>
  );
};

export const Interaction = ({
  call,
  callsById,
  controls,
  controlStates,
  childCallIds,
  isHidden,
  isCollapsed,
  toggleCollapsed,
  pausedAt,
}: {
  call: Call;
  callsById: Map<Call['id'], Call>;
  controls: Controls;
  controlStates: ControlStates;
  childCallIds?: Call['id'][];
  isHidden: boolean;
  isCollapsed: boolean;
  toggleCollapsed: () => void;
  pausedAt?: Call['id'];
}) => {
  const [isHovered, setIsHovered] = React.useState(false);
  const isNavigationDisabled =
    !controlStates.goto || !call.interceptable || !!call.ancestors?.length;
  const stepName = extractStepName(call);
  const interactionStatus = getInteractionStatusText(call);

  if (isHidden) {
    return null;
  }

  if (call.id === INTERNAL_RENDER_CALL_ID) {
    return null;
  }

  return (
    <li
      className={styles.row}
      data-status={call.status}
      data-paused={pausedAt === call.id || undefined}
      style={{ paddingLeft: (call.ancestors?.length ?? 0) * 20 }}
    >
      <div
        className={styles.rowHeader}
        data-navigation-disabled={isNavigationDisabled || undefined}
      >
        <button
          className={styles.rowLabel}
          data-status={call.status}
          aria-label={getRowAriaLabel({
            isNavigationDisabled,
            stepName,
            statusText: interactionStatus,
          })}
          onClick={() => controls.goto(call.id)}
          onPointerDown={(e) => e.preventDefault()}
          disabled={isNavigationDisabled}
          onMouseEnter={() => controlStates.goto && setIsHovered(true)}
          onMouseLeave={() => controlStates.goto && setIsHovered(false)}
        >
          <StatusIcon status={isHovered ? CallStates.ACTIVE : call.status} />
          <div className={styles.methodCall} style={{ marginLeft: 6, marginBottom: 1 }}>
            <MethodCall call={call} callsById={callsById} />
          </div>
        </button>
        <div className={styles.rowActions}>
          {(childCallIds?.length ?? 0) > 0 && (
            <Button
              className={styles.button}
              padding="small"
              variant="ghost"
              onClick={toggleCollapsed}
              ariaLabel={getExpandButtonAriaLabel({ isCollapsed, stepName })}
              aria-expanded={!isCollapsed}
            >
              {isCollapsed ? <ChevronUpIcon /> : <ChevronDownIcon />}
            </Button>
          )}
        </div>
      </div>

      {call.status === CallStates.ERROR && call.exception?.callId === call.id && (
        <Exception exception={call.exception} />
      )}
    </li>
  );
};
