import type { FC } from 'react';
import React, { useEffect, useState } from 'react';

import { EmptyTabContent, Link } from 'storybook/internal/components';

import { DocumentIcon } from '@storybook/icons';

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
            Storybook couldn&apos;t find or generate any controls for this story. Define{' '}
            <code>args</code> or <code>argTypes</code>, or configure docgen to let Storybook
            generate controls automatically.
          </>
        }
        footer={
          <div className={styles.links}>
            <Link
              href="https://storybook.js.org/docs/essentials/controls?ref=ui"
              target="_blank"
              withArrow
            >
              <DocumentIcon /> Read docs
            </Link>
          </div>
        }
      />
    </div>
  );
};
