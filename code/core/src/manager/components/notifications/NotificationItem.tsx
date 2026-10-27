import type { CSSProperties, FC, SyntheticEvent } from 'react';
import React, { useCallback, useEffect, useRef } from 'react';

import { Button } from '@aussieljk/forkbook/internal/components';
import { Link } from '@aussieljk/forkbook/internal/router';

import { CircleXIcon } from 'lucide-react';

import { clsx } from 'clsx';
import { type State } from '@aussieljk/forkbook/manager-api';

import styles from './NotificationItem.module.css';

const ItemContent: FC<Pick<State['notifications'][0], 'icon' | 'content'>> = ({
  icon,
  content: { headline, subHeadline },
}) => (
  <>
    {!icon || <div className={styles.iconWrapper}>{icon}</div>}
    <div className={styles.textWrapper}>
      <div className={styles.headline} title={headline}>
        {headline}
      </div>
      {subHeadline && <div className={styles.subHeadline}>{subHeadline}</div>}
    </div>
  </>
);

const DismissNotificationItem: FC<{
  onDismiss: () => void;
}> = ({ onDismiss }) => (
  <Button
    className={styles.dismissButton}
    padding="small"
    variant="ghost"
    ariaLabel="Dismiss notification"
    onClick={(e: SyntheticEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onDismiss();
    }}
  >
    <CircleXIcon size={12} />
  </Button>
);

export const NotificationItemSpacer = () => <div className={styles.spacer} />;

const NotificationItem: FC<{
  notification: State['notifications'][0];
  onDismissNotification: (id: string) => void;
  zIndex?: number;
}> = ({
  notification: { content, duration, link, onClear, onClick, id, icon },
  onDismissNotification,
  zIndex,
}) => {
  const onTimeout = useCallback(() => {
    onDismissNotification(id);

    if (onClear) {
      onClear({ dismissed: false, timeout: true });
    }
  }, [id, onDismissNotification, onClear]);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!duration) {
      return;
    }
    timer.current = setTimeout(onTimeout, duration);
    // @ts-expect-error (non strict)
    return () => clearTimeout(timer.current);
  }, [duration, onTimeout]);

  const onDismiss = useCallback(() => {
    // @ts-expect-error (non strict)
    clearTimeout(timer.current);
    onDismissNotification(id);

    if (onClear) {
      onClear({ dismissed: true, timeout: false });
    }
  }, [id, onDismissNotification, onClear]);

  const props = {
    className: styles.notification,
    'data-duration': duration || undefined,
    style: { zIndex, '--duration': `${duration}ms` } as CSSProperties,
  };
  const children = (
    <>
      <ItemContent icon={icon} content={content} />
      <DismissNotificationItem onDismiss={onDismiss} />
    </>
  );

  if (link) {
    return (
      <Link to={link} {...props} className={clsx(styles.notification, styles.interactive)}>
        {children}
      </Link>
    );
  }

  if (onClick) {
    return (
      <div
        {...props}
        className={clsx(styles.notification, styles.interactive)}
        onClick={() => onClick({ onDismiss })}
      >
        {children}
      </div>
    );
  }

  return <div {...props}>{children}</div>;
};

export default NotificationItem;
