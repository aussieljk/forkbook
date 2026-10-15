import React, {
  type ComponentProps,
  type ReactNode,
  type SyntheticEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import { once } from '@aussieljk/forkbook/internal/client-logger';
import { ActionList, Card } from '@aussieljk/forkbook/internal/components';
import type {
  Addon_Collection,
  Addon_TestProviderType,
  TestProviderStateByProviderId,
} from '@aussieljk/forkbook/internal/types';

import { ChevronSmallUpIcon, PlayAllHollowIcon, SweepIcon } from '@storybook/icons';

import { internal_fullTestProviderStore } from '#manager-stores';
import { clsx } from 'clsx';

import { useLandmark } from '../../hooks/useLandmark.ts';
import { Optional } from '../Optional/Optional.tsx';
import { useDynamicFavicon } from './useDynamicFavicon.ts';
import styles from './TestingWidget.module.css';

const DEFAULT_HEIGHT = 500;

const RunButton = ({
  children,
  isRunning,
  onRunAll,
  ...props
}: { children?: ReactNode; isRunning: boolean; onRunAll: () => void } & ComponentProps<
  typeof ActionList.Button
>) => (
  <ActionList.Button
    ariaLabel={isRunning ? 'Running...' : 'Run tests'}
    tooltip={isRunning ? 'Running tests...' : 'Start all tests'}
    disabled={isRunning}
    onClick={(e: SyntheticEvent) => {
      e.stopPropagation();
      onRunAll();
    }}
    {...props}
  >
    <ActionList.Icon>
      <PlayAllHollowIcon />
    </ActionList.Icon>
    {children}
  </ActionList.Button>
);

const StatusFilter = ({
  status,
  pressed,
  className,
  ...props
}: { status: 'negative' | 'warning' } & ComponentProps<typeof ActionList.Toggle>) => (
  <ActionList.Toggle
    className={clsx(styles.statusFilter, className)}
    data-status={pressed ? undefined : status}
    pressed={pressed}
    {...props}
  />
);

interface TestingModuleProps {
  registeredTestProviders: Addon_Collection<Addon_TestProviderType>;
  testProviderStates: TestProviderStateByProviderId;
  hasStatuses: boolean;
  clearStatuses: () => void;
  onRunAll: () => void;
  errorCount: number;
  errorsActive: boolean;
  setErrorsActive: (active: boolean) => void;
  warningCount: number;
  warningsActive: boolean;
  setWarningsActive: (active: boolean) => void;
  successCount: number;
}

export const TestingWidget = ({
  registeredTestProviders,
  testProviderStates,
  hasStatuses,
  clearStatuses,
  onRunAll,
  errorCount,
  errorsActive,
  setErrorsActive,
  warningCount,
  warningsActive,
  setWarningsActive,
  successCount,
}: TestingModuleProps) => {
  const timeoutRef = useRef<null | ReturnType<typeof setTimeout>>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [maxHeight, setMaxHeight] = useState(DEFAULT_HEIGHT);
  const [isCollapsed, setCollapsed] = useState(true);
  const [isChangingCollapse, setChangingCollapse] = useState(false);
  const [isUpdated, setIsUpdated] = useState(false);
  const settingsUpdatedTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const unsubscribe = internal_fullTestProviderStore.onSettingsChanged(() => {
      setIsUpdated(true);
      clearTimeout(settingsUpdatedTimeoutRef.current);
      settingsUpdatedTimeoutRef.current = setTimeout(() => {
        setIsUpdated(false);
      }, 1000);
    });
    return () => {
      unsubscribe();
      clearTimeout(settingsUpdatedTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (contentRef.current) {
      setMaxHeight(contentRef.current?.getBoundingClientRect().height || DEFAULT_HEIGHT);

      const resizeObserver = new ResizeObserver(() => {
        requestAnimationFrame(() => {
          if (contentRef.current && !isCollapsed) {
            const height = contentRef.current?.getBoundingClientRect().height || DEFAULT_HEIGHT;

            setMaxHeight(height);
          }
        });
      });
      resizeObserver.observe(contentRef.current);
      return () => resizeObserver.disconnect();
    }
  }, [isCollapsed]);

  const toggleCollapsed = useCallback((event?: SyntheticEvent, value?: boolean) => {
    event?.stopPropagation();
    setChangingCollapse(true);
    setCollapsed((s) => value ?? !s);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setChangingCollapse(false);
    }, 250);
  }, []);

  const isRunning = Object.values(testProviderStates).some(
    (testProviderState) => testProviderState === 'test-provider-state:running'
  );
  const isCrashed = Object.values(testProviderStates).some(
    (testProviderState) => testProviderState === 'test-provider-state:crashed'
  );
  const hasTestProviders = Object.values(registeredTestProviders).length > 0;

  useDynamicFavicon(
    isCrashed
      ? 'critical'
      : errorCount > 0
        ? 'negative'
        : warningCount > 0
          ? 'warning'
          : isRunning
            ? 'active'
            : successCount > 0
              ? 'positive'
              : undefined
  );

  const cardRef = useRef<HTMLDivElement>(null);
  const { landmarkProps } = useLandmark(
    { 'aria-labelledby': 'storybook-testing-widget-heading', role: 'region' },
    cardRef
  );

  if (!hasTestProviders && !errorCount && !warningCount) {
    return null;
  }

  return (
    <Card
      className={styles.hoverCard}
      id="storybook-testing-module"
      data-updated={isUpdated}
      outlineAnimation={isRunning ? 'spin' : 'none'}
      outlineColor={
        isCrashed || (isRunning && errorCount > 0) ? 'negative' : isUpdated ? 'positive' : undefined
      }
      ref={cardRef}
      outlineAttrs={landmarkProps}
    >
      <h2 id="storybook-testing-widget-heading" className="sb-sr-only">
        Component tests
      </h2>
      <div
        className={styles.bar}
        data-clickable={hasTestProviders || undefined}
        onClick={hasTestProviders ? (e) => toggleCollapsed(e) : undefined}
      >
        <div className={styles.action}>
          {hasTestProviders && (
            <Optional
              content={
                <RunButton isRunning={isRunning} onRunAll={onRunAll}>
                  {isRunning ? 'Running...' : 'Run tests'}
                </RunButton>
              }
              fallback={<RunButton isRunning={isRunning} onRunAll={onRunAll} />}
            />
          )}
        </div>
        <div className={styles.filters}>
          {hasTestProviders && (
            <ActionList.Button
              className={styles.collapseToggle}
              onClick={(e) => toggleCollapsed(e)}
              id="testing-module-collapse-toggle"
              ariaLabel={isCollapsed ? 'Expand testing module' : 'Collapse testing module'}
            >
              <ChevronSmallUpIcon
                style={{
                  transform: isCollapsed ? 'none' : 'rotate(180deg)',
                  transition: 'transform 250ms',
                }}
              />
            </ActionList.Button>
          )}

          {errorCount > 0 && (
            <StatusFilter
              id="errors-found-filter"
              size="medium"
              variant="ghost"
              padding={errorCount < 10 ? 'medium' : 'small'}
              status="negative"
              pressed={errorsActive}
              onClick={(e: SyntheticEvent) => {
                e.stopPropagation();
                setErrorsActive(!errorsActive);
              }}
              ariaLabel={`Filter main navigation to show ${errorCount} tests with errors`}
              tooltip={
                errorsActive
                  ? 'Clear test error filter'
                  : `Filter sidebar to show ${errorCount} tests with errors`
              }
            >
              {errorCount < 1000 ? errorCount : '999+'}
            </StatusFilter>
          )}
          {warningCount > 0 && (
            <StatusFilter
              id="warnings-found-filter"
              size="medium"
              variant="ghost"
              padding={warningCount < 10 ? 'medium' : 'small'}
              status="warning"
              pressed={warningsActive}
              onClick={(e: SyntheticEvent) => {
                e.stopPropagation();
                setWarningsActive(!warningsActive);
              }}
              ariaLabel={`Filter main navigation to show ${warningCount} tests with warnings`}
              tooltip={
                warningsActive
                  ? 'Clear test warning filter'
                  : `Filter sidebar to show ${warningCount} tests with warnings`
              }
            >
              {warningCount < 1000 ? warningCount : '999+'}
            </StatusFilter>
          )}
          {hasStatuses && (
            <ActionList.Button
              id="clear-statuses"
              onClick={(e: SyntheticEvent) => {
                e.stopPropagation();
                clearStatuses();
              }}
              disabled={isRunning}
              ariaLabel={
                isRunning ? "Can't clear statuses while tests are running" : 'Clear all statuses'
              }
            >
              <SweepIcon />
            </ActionList.Button>
          )}
        </div>
      </div>

      {hasTestProviders && (
        <div
          className={styles.collapsible}
          data-testid="collapse"
          {...(isCollapsed && { inert: '' })}
          style={{
            transition: isChangingCollapse ? 'max-height 250ms' : 'max-height 0ms',
            display: hasTestProviders ? 'block' : 'none',
            maxHeight: isCollapsed ? 0 : maxHeight,
          }}
        >
          <div className={styles.content} ref={contentRef}>
            {Object.values(registeredTestProviders).map((registeredTestProvider) => {
              const { render: Render, id } = registeredTestProvider;
              if (!Render) {
                once.warn(
                  `No render function found for test provider with id '${id}', skipping...`
                );
                return null;
              }
              return (
                <div className={styles.testProvider} key={id} data-module-id={id}>
                  <Render />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
};
