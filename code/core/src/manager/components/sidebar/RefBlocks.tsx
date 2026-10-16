import type { FC, ReactNode } from 'react';
import React, { Fragment, useCallback, useState } from 'react';

import { logger } from '@aussieljk/forkbook/internal/client-logger';
import {
  Button,
  ErrorFormatter,
  Link,
  PopoverProvider,
  Spaced,
} from '@aussieljk/forkbook/internal/components';

import { global } from '@storybook/global';
import { ArrowsClockwiseIcon, BroomIcon, CaretDownIcon, LockIcon } from '@phosphor-icons/react';

import { useStorybookApi } from '@aussieljk/forkbook/manager-api';

import { useLayout } from '../layout/LayoutProvider.tsx';
import { Contained, Loader } from './Loader.tsx';
import { NoResults } from './NoResults.tsx';
import styles from './RefBlocks.module.css';

const { window: globalWindow } = global;

const Text = ({ children }: { children: ReactNode }) => (
  <div className={styles.text}>{children}</div>
);

export const AuthBlock: FC<{ loginUrl: string; id: string }> = ({ loginUrl, id }) => {
  const [isAuthAttempted, setAuthAttempted] = useState(false);

  const refresh = useCallback(() => {
    globalWindow.document.location.reload();
  }, []);

  const open = useCallback<React.MouseEventHandler>((e) => {
    e.preventDefault();
    const childWindow = globalWindow.open(loginUrl, `storybook_auth_${id}`, 'resizable,scrollbars');

    // poll for window to close
    const timer = setInterval(() => {
      if (!childWindow) {
        logger.error('unable to access loginUrl window');
        clearInterval(timer);
      } else if (childWindow.closed) {
        clearInterval(timer);
        setAuthAttempted(true);
      }
    }, 1000);
  }, []);

  return (
    <Contained>
      <Spaced>
        {isAuthAttempted ? (
          <Fragment>
            <Text>
              Authentication on <strong>{loginUrl}</strong> concluded. Refresh the page to fetch
              this Forkbook.
            </Text>
            <div>
              <Button ariaLabel={false} size="small" variant="outline" onClick={refresh}>
                <ArrowsClockwiseIcon />
                Refresh now
              </Button>
            </div>
          </Fragment>
        ) : (
          <Fragment>
            <Text>Sign in to browse this Forkbook.</Text>
            <div>
              <Button size="small" variant="outline" onClick={open}>
                <LockIcon />
                Sign in
              </Button>
            </div>
          </Fragment>
        )}
      </Spaced>
    </Contained>
  );
};

export const ErrorBlock: FC<{ error: Error }> = ({ error }) => {
  const { isMobile } = useLayout();
  return (
    <Contained>
      <Spaced>
        <div className={styles.textStyle}>
          Oh no! Something went wrong loading this Forkbook.
          <br />
          <PopoverProvider
            ariaLabel="Error details"
            hasCloseButton
            offset={isMobile ? 0 : 8}
            placement={isMobile ? 'bottom-end' : 'bottom-start'}
            popover={
              <pre className={styles.errorDisplay} data-mobile={isMobile || undefined}>
                <ErrorFormatter error={error} />
              </pre>
            }
          >
            <Link>
              View error <CaretDownIcon />
            </Link>
          </PopoverProvider>{' '}
          <Link href="https://forkbook.ljk.dev/docs" cancel={false} target="_blank">
            View docs
          </Link>
        </div>
      </Spaced>
    </Contained>
  );
};

export const EmptyBlock = ({
  isMain,
  hasEntries,
  activeFilterCount,
}: {
  isMain: boolean;
  hasEntries: boolean;
  activeFilterCount: number;
}) => {
  const api = useStorybookApi();

  return (
    <Contained>
      <Spaced className={styles.flexSpaced} col={1}>
        <Spaced className={styles.wideSpaced}>
          {hasEntries ? (
            <NoResults>
              <strong>No stories found</strong>
              {activeFilterCount > 0 ? (
                <small>Your selected filters did not match any stories.</small>
              ) : (
                <small>Try adding some stories!</small>
              )}
              {activeFilterCount > 0 ? (
                <Button
                  ariaLabel={false}
                  size="small"
                  variant="outline"
                  onClick={async () => {
                    await api.setAllTagFilters([], []);
                    await api.resetStatusFilters();
                  }}
                >
                  <BroomIcon />
                  Clear filters
                </Button>
              ) : null}
            </NoResults>
          ) : isMain ? (
            <Text>
              Oh no! Your Forkbook is empty. This can happen when:
              <ul>
                <li>
                  Your{' '}
                  <Link
                    href="https://forkbook.ljk.dev/docs/api/main-config/main-config-stories"
                    cancel={false}
                    target="_blank"
                  >
                    stories glob configuration
                  </Link>{' '}
                  does not match any files.{' '}
                </li>
                <li>
                  You have{' '}
                  <Link
                    href="https://forkbook.ljk.dev/docs/writing-stories"
                    cancel={false}
                    target="_blank"
                  >
                    no stories defined
                  </Link>{' '}
                  in your story files.{' '}
                </li>
              </ul>
            </Text>
          ) : (
            <Text>
              This composed Forkbook is empty. Perhaps no stories match your selected filters.
            </Text>
          )}
        </Spaced>
      </Spaced>
    </Contained>
  );
};

export const LoaderBlock: FC<{ isMain: boolean }> = ({ isMain }) => (
  <Contained>
    <Loader size={isMain ? 17 : 5} />
  </Contained>
);
