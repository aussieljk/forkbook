import type { FC } from 'react';
import React, { useEffect, useState } from 'react';

import { EmptyTabContent, Link } from '@aussieljk/forkbook/internal/components';

import { FileTextIcon } from '@phosphor-icons/react';

import styles from './Empty.module.css';

interface EmptyProps {
  inAddonPanel?: boolean;
}

export const Empty: FC<EmptyProps> = ({ inAddonPanel }) => {
  const [isLoading, setIsLoading] = useState(true);

  // We are adding a small delay to avoid flickering when the story is loading.
  // It takes a bit of time for the controls to appear, so we don't want
  // to show the empty state for a split second.
  useEffect(() => {
    const load = setTimeout(() => {
      setIsLoading(false);
    }, 100);

    return () => clearTimeout(load);
  }, []);

  if (isLoading) {
    return null;
  }

  return (
    <div className={styles.wrapper} data-in-addon-panel={inAddonPanel || undefined}>
      <EmptyTabContent
        title="This story has no controls"
        description={
          <>
            Forkbook couldn&apos;t find or generate any controls for this story. Define{' '}
            <code>args</code> or <code>argTypes</code>, or configure docgen to let Forkbook generate
            controls automatically.
          </>
        }
        footer={
          <div className={styles.links}>
            <Link
              href="https://forkbook.ljk.dev/docs/essentials/controls"
              target="_blank"
              withArrow
            >
              <FileTextIcon /> Read docs
            </Link>
          </div>
        }
      />
    </div>
  );
};
