import React, { Fragment, useEffect, useRef, useState } from 'react';

import {
  type API_FilterFunction,
  type Addon_Collection,
  type Addon_TestProviderType,
  Addon_TypesEnum,
} from 'storybook/internal/types';

import {
  experimental_useStatusStore,
  experimental_useTestProviderStore,
  internal_fullTestProviderStore,
} from '#manager-stores';
import { type API, type State, useStorybookApi, useStorybookState } from 'storybook/manager-api';

import type { TestProviderStateByProviderId } from '../../../shared/test-provider-store/index.ts';
import { NotificationList } from '../notifications/NotificationList.tsx';
import { TestingWidget } from './TestingWidget.tsx';
import styles from './SidebarBottom.module.css';

// This ID is used dynamically add/remove space at the bottom to prevent overlapping the main sidebar content.
const SIDEBAR_BOTTOM_SPACER_ID = 'sidebar-bottom-spacer';
// This ID is used by some integrators to target the (fixed position) sidebar bottom element so it should remain stable.
const SIDEBAR_BOTTOM_WRAPPER_ID = 'sidebar-bottom-wrapper';

const filterNone: API_FilterFunction = () => true;
const filterWarn: API_FilterFunction = ({ statuses = {} }) =>
  Object.values(statuses).some(({ value }) => value === 'status-value:warning');
const filterError: API_FilterFunction = ({ statuses = {} }) =>
  Object.values(statuses).some(({ value }) => value === 'status-value:error');
const filterBoth: API_FilterFunction = ({ statuses = {} }) =>
  Object.values(statuses).some(({ value }) =>
    ['status-value:warning', 'status-value:error'].includes(value as any)
  );

const getFilter = (warningsActive = false, errorsActive = false) => {
  if (warningsActive && errorsActive) {
    return filterBoth;
  }

  if (warningsActive) {
    return filterWarn;
  }

  if (errorsActive) {
    return filterError;
  }
  return filterNone;
};

interface SidebarBottomProps {
  api: API;
  notifications: State['notifications'];
  errorCount: number;
  warningCount: number;
  successCount: number;
  hasStatuses: boolean;
  isDevelopment?: boolean;
  testProviderStates: TestProviderStateByProviderId;
  registeredTestProviders: Addon_Collection<Addon_TestProviderType>;
  onRunAll: () => void;
}

export const SidebarBottomBase = ({
  api,
  notifications = [],
  errorCount,
  warningCount,
  successCount,
  hasStatuses,
  isDevelopment,
  testProviderStates,
  registeredTestProviders,
  onRunAll,
}: SidebarBottomProps) => {
  const spacerRef = useRef<HTMLDivElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [warningsActive, setWarningsActive] = useState(false);
  const [errorsActive, setErrorsActive] = useState(false);

  useEffect(() => {
    if (spacerRef.current && wrapperRef.current) {
      const resizeObserver = new ResizeObserver(() => {
        if (spacerRef.current && wrapperRef.current) {
          spacerRef.current.style.height = `${wrapperRef.current.scrollHeight}px`;
        }
      });
      resizeObserver.observe(wrapperRef.current);
      return () => resizeObserver.disconnect();
    }
  }, []);

  useEffect(() => {
    const filter = getFilter(warningCount > 0 && warningsActive, errorCount > 0 && errorsActive);
    api.setFilters({ 'sidebar-bottom-filter': filter });
  }, [api, warningCount, errorCount, warningsActive, errorsActive]);

  if (
    !warningCount &&
    !errorCount &&
    Object.values(registeredTestProviders).length === 0 &&
    notifications.length === 0
  ) {
    return null;
  }

  return (
    <Fragment>
      <div className={styles.spacer} id={SIDEBAR_BOTTOM_SPACER_ID} ref={spacerRef}></div>
      <div className={styles.content} id={SIDEBAR_BOTTOM_WRAPPER_ID} ref={wrapperRef}>
        <NotificationList notifications={notifications} clearNotification={api.clearNotification} />
        {isDevelopment && (
          <TestingWidget
            {...{
              registeredTestProviders,
              testProviderStates,
              onRunAll: () => {
                onRunAll();
                setErrorsActive(false);
                setWarningsActive(false);
              },
              hasStatuses,
              clearStatuses: () => {
                api.clearStatuses();
                setErrorsActive(false);
                setWarningsActive(false);
              },
              errorCount,
              errorsActive,
              setErrorsActive,
              warningCount,
              warningsActive,
              setWarningsActive,
              successCount,
            }}
          />
        )}
      </div>
    </Fragment>
  );
};

export const SidebarBottom = ({ isDevelopment }: { isDevelopment?: boolean }) => {
  const api = useStorybookApi();
  const registeredTestProviders = api.getElements(Addon_TypesEnum.experimental_TEST_PROVIDER);
  const { notifications } = useStorybookState();
  const { hasStatuses, errorCount, warningCount, successCount } = experimental_useStatusStore(
    (statuses) => {
      return Object.values(statuses).reduce(
        (result, storyStatuses) => {
          Object.values(storyStatuses).forEach((status) => {
            result.hasStatuses = true;
            if (status.value === 'status-value:error') {
              result.errorCount += 1;
            }
            if (status.value === 'status-value:warning') {
              result.warningCount += 1;
            }
            if (status.value === 'status-value:success') {
              result.successCount += 1;
            }
          });
          return result;
        },
        { errorCount: 0, warningCount: 0, successCount: 0, hasStatuses: false }
      );
    }
  );

  const testProviderStates = experimental_useTestProviderStore();

  return (
    <SidebarBottomBase
      api={api}
      notifications={notifications}
      hasStatuses={hasStatuses}
      errorCount={errorCount}
      warningCount={warningCount}
      successCount={successCount}
      isDevelopment={isDevelopment}
      testProviderStates={testProviderStates}
      registeredTestProviders={registeredTestProviders}
      onRunAll={internal_fullTestProviderStore.runAll}
    />
  );
};
