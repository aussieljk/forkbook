import type { FC } from 'react';
import React, { Fragment, useEffect, useState } from 'react';

import { Button, Loader } from '@aussieljk/forkbook/internal/components';

import { global } from '../../shared/global.ts';
import { EyeIcon, EyeOffIcon, HeartIcon, TriangleAlertIcon } from 'lucide-react';

import { useStorybookApi, useStorybookState } from '@aussieljk/forkbook/manager-api';
import { useTheme } from '@aussieljk/forkbook/theming';

import { useCopyButton } from '../../shared/useCopyButton.ts';
import styles from './whats_new.module.css';

export const WhatsNewFooter = ({
  isNotificationsEnabled,
  onToggleNotifications,
  copyContent,
}: {
  isNotificationsEnabled: boolean;
  onToggleNotifications?: () => void;
  copyContent: string;
}) => {
  const theme = useTheme();
  const { children: copyText, buttonProps: copyButtonProps } = useCopyButton({
    children: 'Copy Link',
    content: copyContent,
  });

  return (
    <div className={styles.footer}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <HeartIcon color={theme.color.mediumdark} />
        <div>Share this with your team.</div>
        <Button size="small" variant="ghost" {...copyButtonProps}>
          {copyText}
        </Button>
      </div>
      {isNotificationsEnabled ? (
        <Button ariaLabel={false} size="small" variant="ghost" onClick={onToggleNotifications}>
          <EyeOffIcon />
          Hide notifications
        </Button>
      ) : (
        <Button ariaLabel={false} size="small" variant="ghost" onClick={onToggleNotifications}>
          <EyeIcon />
          Show notifications
        </Button>
      )}
    </div>
  );
};

const WhatsNewLoader: FC = () => (
  <div className={styles.centered}>
    <div className={styles.loaderWrapper}>
      <Loader />
    </div>
    <div className={styles.message}>Loading...</div>
  </div>
);

const MaxWaitTimeMessaging: FC = () => (
  <div className={styles.centered}>
    <TriangleAlertIcon className={styles.alertIcon} />
    <div className={styles.message}>
      The page couldn't be loaded. Check your internet connection and try again.
    </div>
  </div>
);

export interface WhatsNewProps {
  didHitMaxWaitTime: boolean;
  isLoaded: boolean;
  onLoad: () => void;
  url?: string;
  isNotificationsEnabled: boolean;
  copyContent: string;
  onToggleNotifications?: () => void;
}

const PureWhatsNewScreen: FC<WhatsNewProps> = ({
  didHitMaxWaitTime,
  isLoaded,
  onLoad,
  url,
  copyContent,
  onToggleNotifications,
  isNotificationsEnabled,
}) => (
  <Fragment>
    {!isLoaded && !didHitMaxWaitTime && <WhatsNewLoader />}
    {didHitMaxWaitTime ? (
      <MaxWaitTimeMessaging />
    ) : (
      <>
        <iframe
          className={styles.iframe}
          data-loaded={isLoaded || undefined}
          onLoad={onLoad}
          src={url}
          title={`What's new?`}
        />
        <WhatsNewFooter
          isNotificationsEnabled={isNotificationsEnabled}
          onToggleNotifications={onToggleNotifications}
          copyContent={copyContent}
        />
      </>
    )}
  </Fragment>
);

const MAX_WAIT_TIME = 10000; // 10 seconds

const WhatsNewScreen: FC = () => {
  const api = useStorybookApi();
  const state = useStorybookState();
  const { whatsNewData } = state;
  const [isLoaded, setLoaded] = useState(false);
  const [didHitMaxWaitTime, setDidHitMaxWaitTime] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => !isLoaded && setDidHitMaxWaitTime(true), MAX_WAIT_TIME);
    return () => clearTimeout(timer);
  }, [isLoaded]);

  if (whatsNewData?.status !== 'SUCCESS') {
    return null;
  }

  const isNotificationsEnabled = !whatsNewData.disableWhatsNewNotifications;

  return (
    <PureWhatsNewScreen
      didHitMaxWaitTime={didHitMaxWaitTime}
      isLoaded={isLoaded}
      onLoad={() => {
        api.whatsNewHasBeenRead();
        setLoaded(true);
      }}
      url={whatsNewData.url}
      isNotificationsEnabled={isNotificationsEnabled}
      copyContent={whatsNewData.blogUrl ?? whatsNewData.url}
      onToggleNotifications={() => {
        if (isNotificationsEnabled) {
          if (global.confirm('All update notifications will no longer be shown. Are you sure?')) {
            api.toggleWhatsNewNotifications();
          }
        } else {
          api.toggleWhatsNewNotifications();
        }
      }}
    />
  );
};

export { WhatsNewScreen, PureWhatsNewScreen };
