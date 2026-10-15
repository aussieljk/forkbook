import type { FC } from 'react';
import React from 'react';

import type { State } from '@aussieljk/forkbook/manager-api';

import { useLayout } from '../layout/LayoutProvider.tsx';
import NotificationItem from './NotificationItem.tsx';
import styles from './NotificationList.module.css';

interface NotificationListProps {
  notifications: State['notifications'];
  clearNotification: (id: string) => void;
}

export const NotificationList: FC<NotificationListProps> = ({
  notifications,
  clearNotification,
}) => {
  const { isMobile } = useLayout();
  return (
    <div className={styles.list} data-mobile={isMobile || undefined}>
      {notifications &&
        notifications.map((notification, index) => (
          <NotificationItem
            key={notification.id}
            onDismissNotification={(id: string) => clearNotification(id)}
            notification={notification}
            zIndex={notifications.length - index}
          />
        ))}
    </div>
  );
};
