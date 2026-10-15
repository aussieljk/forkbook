import React, { useMemo } from 'react';

import { Link } from '@aussieljk/forkbook/internal/components';

import { useStorybookApi } from '@aussieljk/forkbook/manager-api';

import { DOCUMENTATION_DISCREPANCY_LINK } from '../constants.ts';
import styles from './TestDiscrepancyMessage.module.css';

export type TestDiscrepancy =
  | 'browserPassedCliFailed'
  | 'cliPassedBrowserFailed'
  | 'cliFailedButModeManual'
  | null;

interface TestDiscrepancyMessageProps {
  discrepancy: TestDiscrepancy;
}
export const TestDiscrepancyMessage = ({ discrepancy }: TestDiscrepancyMessageProps) => {
  const api = useStorybookApi();
  const docsUrl = api.getDocsUrl({
    subpath: DOCUMENTATION_DISCREPANCY_LINK,
    versioned: true,
    renderer: true,
  });

  const message = useMemo(() => {
    switch (discrepancy) {
      case 'browserPassedCliFailed':
        return 'Accessibility checks passed in this browser but failed in the CLI.';
      case 'cliPassedBrowserFailed':
        return 'Accessibility checks passed in the CLI but failed in this browser.';
      case 'cliFailedButModeManual':
        return 'Accessibility checks failed in the CLI. Run the tests manually to see the results.';
      default:
        return null;
    }
  }, [discrepancy]);

  if (!message) {
    return null;
  }

  return (
    <div className={styles.wrapper}>
      {message}{' '}
      <Link href={docsUrl} target="_blank" withArrow>
        Learn what could cause this
      </Link>
    </div>
  );
};
