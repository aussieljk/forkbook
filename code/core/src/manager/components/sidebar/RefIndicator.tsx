import type { ComponentProps, FC, MouseEventHandler, ReactNode } from 'react';
import React, { forwardRef, useCallback, useMemo } from 'react';

import { Button, PopoverProvider, Select, Spaced } from '@aussieljk/forkbook/internal/components';

import { global } from '@storybook/global';
import {
  AlertIcon,
  DocumentIcon,
  GlobeIcon,
  LightningIcon,
  LockIcon,
  MarkupIcon,
  TimeIcon,
} from '@storybook/icons';

import { clsx } from 'clsx';
import { useStorybookApi } from '@aussieljk/forkbook/manager-api';
import { useTheme } from '@aussieljk/forkbook/theming';

import type { NormalLink } from '../../../components/components/tooltip/TooltipLinkList.tsx';
import type { getStateType } from '../../utils/tree.ts';
import { useLayout } from '../layout/LayoutProvider.tsx';
import type { RefType } from './types.ts';
import styles from './RefIndicator.module.css';

const { document, window: globalWindow } = global;

export type ClickHandler = NormalLink['onClick'];
export interface IndicatorIconProps {
  type: ReturnType<typeof getStateType>;
}
export interface CurrentVersionProps {
  url: string;
  versions: RefType['versions'];
}

const MessageTitle = ({ children }: { children: ReactNode }) => (
  <span className={styles.messageTitle}>{children}</span>
);

const Message: FC<{
  blank?: boolean;
  children: ReactNode;
  href?: string;
  onClick?: MouseEventHandler;
}> = ({ href, blank = true, children, onClick }) => {
  return (
    <a
      className={styles.message}
      href={href}
      target={blank ? '_blank' : undefined}
      onClick={onClick}
    >
      {children}
    </a>
  );
};

export const MessageWrapper = ({
  isMobile,
  className,
  ...props
}: ComponentProps<'div'> & { isMobile: boolean }) => (
  <div
    className={clsx(styles.messageWrapper, className)}
    data-mobile={isMobile || undefined}
    {...props}
  />
);

export const RefIndicator = React.memo(
  forwardRef<HTMLDivElement, RefType & { state: ReturnType<typeof getStateType> }>(
    ({ state, ...ref }, forwardedRef) => {
      const api = useStorybookApi();
      const { isMobile } = useLayout();
      const list = useMemo(() => Object.values(ref.index || {}), [ref.index]);
      const componentCount = useMemo(
        () => list.filter((v) => v.type === 'component').length,
        [list]
      );
      const leafCount = useMemo(
        () => list.filter((v) => v.type === 'docs' || v.type === 'story').length,
        [list]
      );

      const currentVersion = useMemo(() => {
        if (ref.versions) {
          return Object.entries(ref.versions).find(([, v]) => v === ref.url)?.[0];
        }
        return undefined;
      }, [ref.versions, ref.url]);

      return (
        <div className={styles.indicatorPlacement} ref={forwardedRef}>
          <PopoverProvider
            ariaLabel="Composed Forkbook status"
            placement={isMobile ? 'bottom' : 'bottom-start'}
            padding={0}
            popover={() => (
              <MessageWrapper isMobile={isMobile}>
                <Spaced row={0}>
                  {state === 'loading' && <LoadingMessage url={ref.url} />}
                  {(state === 'error' || state === 'empty') && (
                    <ErrorOccurredMessage url={ref.url} />
                  )}
                  {state === 'ready' && (
                    <>
                      <ReadyMessage {...{ url: ref.url, componentCount, leafCount }} />
                      {ref.sourceUrl && <SourceCodeMessage url={ref.sourceUrl} />}
                    </>
                  )}
                  {state === 'auth' && <LoginRequiredMessage {...ref} />}
                  {ref.type === 'auto-inject' && state !== 'error' && (
                    <PerformanceDegradedMessage />
                  )}
                  {state !== 'loading' && <ReadDocsMessage />}
                </Spaced>
              </MessageWrapper>
            )}
          >
            <Button
              className={styles.indicatorClickTarget}
              variant="ghost"
              padding="small"
              size="small"
              data-action="toggle-indicator"
              ariaLabel="Extra actions"
            >
              <GlobeIcon />
            </Button>
          </PopoverProvider>

          {ref.versions && Object.keys(ref.versions).length ? (
            <>
              <Select
                className={styles.subtleSelect}
                padding="small"
                size="small"
                ariaLabel="Version"
                tooltip="Choose version"
                defaultOptions={currentVersion}
                onSelect={(item) => {
                  // We only pass strings as version ids, so item is always a string
                  const href = ref.versions?.[item as string];
                  if (href) {
                    api.changeRefVersion(ref.id, href);
                  }
                }}
                options={Object.entries(ref.versions).map(([id, href]) => ({
                  value: id,
                  title: id,
                  href,
                }))}
              >
                version
              </Select>
            </>
          ) : null}
        </div>
      );
    }
  )
);

const ReadyMessage: FC<{
  url: string;
  componentCount: number;
  leafCount: number;
}> = ({ url, componentCount, leafCount }) => {
  const theme = useTheme();

  return (
    <Message href={url.replace(/\/?$/, '/index.html')}>
      <GlobeIcon color={theme.color.secondary} />
      <div>
        <MessageTitle>View external Forkbook</MessageTitle>
        <div>
          Explore {componentCount} components and {leafCount} stories in a new browser tab.
        </div>
      </div>
    </Message>
  );
};

const SourceCodeMessage: FC<{
  url?: string;
}> = ({ url }) => {
  const theme = useTheme();

  return (
    <Message href={url}>
      <MarkupIcon color={theme.color.secondary} />
      <div>
        <MessageTitle>View source code</MessageTitle>
      </div>
    </Message>
  );
};

const LoginRequiredMessage: FC<RefType> = ({ loginUrl, id }) => {
  const theme = useTheme();
  const open = useCallback<MouseEventHandler>(
    (e) => {
      e.preventDefault();
      const childWindow = globalWindow.open(
        loginUrl,
        `storybook_auth_${id}`,
        'resizable,scrollbars'
      );

      // poll for window to close
      const timer = setInterval(() => {
        if (!childWindow) {
          clearInterval(timer);
        } else if (childWindow.closed) {
          clearInterval(timer);
          document.location.reload();
        }
      }, 1000);
    },
    [id, loginUrl]
  );

  return (
    <Message onClick={open} blank={false}>
      <LockIcon color={theme.color.gold} />
      <div>
        <MessageTitle>Log in required</MessageTitle>
        <div>You need to authenticate to view this Forkbook's components.</div>
      </div>
    </Message>
  );
};

const ReadDocsMessage: FC = () => {
  const theme = useTheme();

  return (
    <Message href="https://storybook.js.org/docs/sharing/storybook-composition?ref=ui">
      <DocumentIcon color={theme.color.green} />
      <div>
        <MessageTitle>Read Composition docs</MessageTitle>
        <div>Learn how to combine multiple Storybooks into one.</div>
      </div>
    </Message>
  );
};

const ErrorOccurredMessage: FC<{ url: string }> = ({ url }) => {
  const theme = useTheme();

  return (
    <Message href={url.replace(/\/?$/, '/index.html')}>
      <AlertIcon color={theme.color.negative} />
      <div>
        <MessageTitle>Something went wrong</MessageTitle>
        <div>This external Forkbook didn't load. Debug it in a new tab now.</div>
      </div>
    </Message>
  );
};

const LoadingMessage: FC<{ url: string }> = ({ url }) => {
  const theme = useTheme();

  return (
    <Message href={url.replace(/\/?$/, '/index.html')}>
      <TimeIcon color={theme.color.secondary} />
      <div>
        <MessageTitle>Please wait</MessageTitle>
        <div>This Forkbook is loading.</div>
      </div>
    </Message>
  );
};

// TODO: This is a temporary fix as the documentation link is not available with the 8.0 release, since the features it referenced were removed. See https://storybook.js.org/docs/7/sharing/storybook-composition#improve-your-storybook-composition for context.
const PerformanceDegradedMessage: FC = () => {
  const theme = useTheme();

  return (
    <Message href="https://storybook.js.org/docs/sharing/storybook-composition?ref=ui">
      <LightningIcon color={theme.color.gold} />
      <div>
        <MessageTitle>Reduce lag</MessageTitle>
        <div>Learn how to speed up Composition performance.</div>
      </div>
    </Message>
  );
};
