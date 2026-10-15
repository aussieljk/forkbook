import React from 'react';

import { Link } from 'storybook/internal/components';

import { useStorybookApi } from 'storybook/manager-api';
import { CallStates } from '../../instrumenter/types.ts';
import { DOCUMENTATION_DISCREPANCY_LINK } from '../constants.ts';
import styles from './TestDiscrepancyMessage.module.css';

interface TestDiscrepancyMessageProps {
  browserTestStatus?: CallStates;
}

export const TestDiscrepancyMessage = ({ browserTestStatus }: TestDiscrepancyMessageProps) => {
  const api = useStorybookApi();
  const docsUrl = api.getDocsUrl({
    subpath: DOCUMENTATION_DISCREPANCY_LINK,
    versioned: true,
    renderer: true,
  });
  const [passed, failed] =
    browserTestStatus === CallStates.ERROR
      ? ['the CLI', 'this browser']
      : ['this browser', 'the CLI'];

  return (
    <div className={styles.message}>
      This interaction test passed in {passed}, but the tests failed in {failed}.{' '}
      <Link href={docsUrl} target="_blank" withArrow>
        Learn what could cause this
      </Link>
    </div>
  );
};
