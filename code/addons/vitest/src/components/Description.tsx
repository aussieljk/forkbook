import React, { type ComponentProps } from 'react';

import { clsx } from 'clsx';

import { Link as LinkComponent } from 'storybook/internal/components';
import type { TestProviderState } from 'storybook/internal/types';

import type { StoreState } from '../types.ts';
import { GlobalErrorContext } from './GlobalErrorModal.tsx';
import { RelativeTime } from './RelativeTime.tsx';
import styles from './Description.module.css';

interface DescriptionProps extends ComponentProps<'div'> {
  storeState: StoreState;
  testProviderState: TestProviderState;
  entryId?: string;
  isSettingsUpdated: boolean;
}

export function Description({
  entryId,
  storeState,
  testProviderState,
  isSettingsUpdated,
  className,
  ...props
}: DescriptionProps) {
  const { setModalOpen } = React.useContext(GlobalErrorContext);

  const { componentTestCount, totalTestCount, unhandledErrors, finishedAt } = storeState.currentRun;
  const finishedTestCount = componentTestCount.success + componentTestCount.error;

  let description: string | React.ReactNode = 'Not run';
  if (!entryId && isSettingsUpdated) {
    description = <span className={styles.positiveText}>Settings updated</span>;
  } else if (testProviderState === 'test-provider-state:running') {
    description =
      (finishedTestCount ?? 0) === 0
        ? 'Starting...'
        : `Testing... ${finishedTestCount}/${totalTestCount}`;
  } else if (!entryId && testProviderState === 'test-provider-state:crashed') {
    description = setModalOpen ? (
      <LinkComponent onClick={() => setModalOpen(true)}>View full error</LinkComponent>
    ) : (
      'Crashed'
    );
  } else if (!entryId && unhandledErrors.length > 0) {
    const unhandledErrorDescription = `View ${unhandledErrors.length} unhandled error${unhandledErrors?.length > 1 ? 's' : ''}`;
    description = setModalOpen ? (
      <LinkComponent onClick={() => setModalOpen(true)}>{unhandledErrorDescription}</LinkComponent>
    ) : (
      unhandledErrorDescription
    );
  } else if (entryId && totalTestCount) {
    description = `Ran ${totalTestCount} ${totalTestCount === 1 ? 'test' : 'tests'}`;
  } else if (finishedAt) {
    description = (
      <>
        Ran {totalTestCount} {totalTestCount === 1 ? 'test' : 'tests'}{' '}
        <RelativeTime timestamp={finishedAt} />
      </>
    );
  } else if (storeState.watching) {
    description = 'Watching for file changes';
  }

  return (
    <div className={clsx(styles.wrapper, className)} {...props}>
      {description}
    </div>
  );
}
