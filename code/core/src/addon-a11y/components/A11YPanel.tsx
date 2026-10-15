import React, { useMemo } from 'react';

import { Badge, Button } from 'storybook/internal/components';

import { SyncIcon } from '@storybook/icons';

import { RuleType } from '../types.ts';
import { useA11yContext } from './A11yContext.tsx';
import { Report } from './Report/Report.tsx';
import { Tabs } from './Tabs.tsx';
import { TestDiscrepancyMessage } from './TestDiscrepancyMessage.tsx';
import styles from './A11YPanel.module.css';

export const A11YPanel: React.FC = () => {
  const {
    parameters,
    tab,
    results,
    status,
    handleManual,
    error,
    discrepancy,
    handleSelectionChange,
    selectedItems,
    toggleOpen,
  } = useA11yContext();

  const tabs = useMemo(() => {
    const { passes, incomplete, violations } = results ?? {
      passes: [],
      incomplete: [],
      violations: [],
    };
    return [
      {
        label: (
          <div className={styles.tab}>
            Violations
            <Badge compact status={tab === 'violations' ? 'active' : 'neutral'}>
              {violations.length}
            </Badge>
          </div>
        ),
        panel: (
          <Report
            items={violations}
            type={RuleType.VIOLATION}
            empty="No accessibility violations found."
            handleSelectionChange={handleSelectionChange}
            selectedItems={selectedItems}
            toggleOpen={toggleOpen}
          />
        ),
        items: violations,
        type: RuleType.VIOLATION,
      },
      {
        label: (
          <div className={styles.tab}>
            Passes
            <Badge compact status={tab === 'passes' ? 'active' : 'neutral'}>
              {passes.length}
            </Badge>
          </div>
        ),
        panel: (
          <Report
            items={passes}
            type={RuleType.PASS}
            empty="No passing accessibility checks found."
            handleSelectionChange={handleSelectionChange}
            selectedItems={selectedItems}
            toggleOpen={toggleOpen}
          />
        ),
        items: passes,
        type: RuleType.PASS,
      },
      {
        label: (
          <div className={styles.tab}>
            Inconclusive
            <Badge compact status={tab === 'incomplete' ? 'active' : 'neutral'}>
              {incomplete.length}
            </Badge>
          </div>
        ),
        panel: (
          <Report
            items={incomplete}
            type={RuleType.INCOMPLETION}
            empty="No inconclusive accessibility checks found."
            handleSelectionChange={handleSelectionChange}
            selectedItems={selectedItems}
            toggleOpen={toggleOpen}
          />
        ),
        items: incomplete,
        type: RuleType.INCOMPLETION,
      },
    ];
  }, [tab, results, handleSelectionChange, selectedItems, toggleOpen]);

  if (parameters.disable || parameters.test === 'off') {
    return (
      <span className={styles.centered}>
        <div>
          <strong>Accessibility tests are disabled for this story</strong>
          <p>
            Update{' '}
            <code>{parameters.disable ? 'parameters.a11y.disable' : 'parameters.a11y.test'}</code>{' '}
            to enable accessibility tests.
          </p>
        </div>
      </span>
    );
  }

  return (
    <>
      {discrepancy && <TestDiscrepancyMessage discrepancy={discrepancy} />}
      {status === 'ready' || status === 'ran' ? (
        <Tabs key="tabs" tabs={tabs} />
      ) : (
        <span className={styles.centered} style={{ marginTop: discrepancy ? '1em' : 0 }}>
          {status === 'initial' && (
            <div>
              <SyncIcon size={12} className={styles.rotatingIcon} />
              <strong>Preparing accessibility scan</strong>
              <p>Please wait while the addon is initializing...</p>
            </div>
          )}
          {status === 'manual' && (
            <>
              <div>
                <strong>Accessibility tests run manually for this story</strong>
                <p>
                  Results will not show when using the testing module. You can still run
                  accessibility tests manually.
                </p>
              </div>
              <Button ariaLabel={false} size="medium" onClick={handleManual}>
                Run accessibility scan
              </Button>
              <p>
                Update <code>globals.a11y.manual</code> to disable manual mode.
              </p>
            </>
          )}
          {status === 'running' && (
            <div>
              <SyncIcon size={12} className={styles.rotatingIcon} />
              <strong>Accessibility scan in progress</strong>
              <p>Please wait while the accessibility scan is running...</p>
            </div>
          )}
          {status === 'error' && (
            <>
              <div>
                <strong>The accessibility scan encountered an error</strong>
                <p>
                  {typeof error === 'string'
                    ? error
                    : error instanceof Error
                      ? error.toString()
                      : JSON.stringify(error, null, 2)}
                </p>
              </div>
              <Button ariaLabel={false} size="medium" onClick={handleManual}>
                Rerun accessibility scan
              </Button>
            </>
          )}
          {status === 'component-test-error' && (
            <>
              <div>
                <strong>This story&apos;s component tests failed</strong>
                <p>
                  Automated accessibility tests will not run until this is resolved. You can still
                  test manually.
                </p>
              </div>
              <Button ariaLabel={false} size="medium" onClick={handleManual}>
                Run accessibility scan
              </Button>
            </>
          )}
        </span>
      )}
    </>
  );
};
