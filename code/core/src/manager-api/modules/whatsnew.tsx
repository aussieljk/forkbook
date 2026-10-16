import React from 'react';

import {
  REQUEST_WHATS_NEW_DATA,
  RESULT_WHATS_NEW_DATA,
  SET_WHATS_NEW_CACHE,
  TOGGLE_WHATS_NEW_NOTIFICATIONS,
} from '@aussieljk/forkbook/internal/core-events';
import type { WhatsNewCache, WhatsNewData } from '@aussieljk/forkbook/internal/core-events';

import { global } from '@storybook/global';

import type { ModuleFn } from '../lib/types.tsx';

export type SubState = {
  whatsNewData?: WhatsNewData;
};

export type SubAPI = {
  isWhatsNewUnread(): boolean;
  whatsNewHasBeenRead(): void;
  toggleWhatsNewNotifications(): void;
};

const WHATS_NEW_NOTIFICATION_ID = 'whats-new';

// The Forkbook mark as text: the mirror ball emoji. No image, because React Native also uses this module.
const ForkbookIcon = ({ size = 14 }) => (
  <span role="img" aria-label="Forkbook" style={{ fontSize: size, lineHeight: 1 }}>
    {'\u{1FAA9}'}
  </span>
);

export const init: ModuleFn = ({ fullAPI, store, provider }) => {
  const state: SubState = {
    whatsNewData: undefined,
  };

  function setWhatsNewState(newState: WhatsNewData) {
    store.setState({ whatsNewData: newState });
    state.whatsNewData = newState;
  }

  const api: SubAPI = {
    isWhatsNewUnread() {
      return state.whatsNewData?.status === 'SUCCESS' && !state.whatsNewData.postIsRead;
    },
    whatsNewHasBeenRead() {
      if (state.whatsNewData?.status === 'SUCCESS') {
        setWhatsNewCache({ lastReadPost: state.whatsNewData.url });
        setWhatsNewState({ ...state.whatsNewData, postIsRead: true });
        fullAPI.clearNotification(WHATS_NEW_NOTIFICATION_ID);
      }
    },
    toggleWhatsNewNotifications() {
      if (state.whatsNewData?.status === 'SUCCESS') {
        setWhatsNewState({
          ...state.whatsNewData,
          disableWhatsNewNotifications: !state.whatsNewData.disableWhatsNewNotifications,
        });
        provider.channel?.emit(TOGGLE_WHATS_NEW_NOTIFICATIONS, {
          disableWhatsNewNotifications: state.whatsNewData.disableWhatsNewNotifications,
        });
      }
    },
  };

  function getLatestWhatsNewPost(): Promise<WhatsNewData> {
    provider.channel?.emit(REQUEST_WHATS_NEW_DATA);

    return new Promise((resolve) =>
      provider.channel?.once(RESULT_WHATS_NEW_DATA, ({ data }: { data: WhatsNewData }) =>
        resolve(data)
      )
    );
  }

  function setWhatsNewCache(cache: WhatsNewCache): void {
    provider.channel?.emit(SET_WHATS_NEW_CACHE, cache);
  }

  const initModule = async () => {
    // The server channel doesn't exist in production, and we don't want to show what's new in production storybooks.
    if (global.CONFIG_TYPE !== 'DEVELOPMENT') {
      return;
    }

    const whatsNewData = await getLatestWhatsNewPost();
    setWhatsNewState(whatsNewData);

    const urlState = fullAPI.getUrlState();
    const isReviewView =
      urlState?.path === '/review/' ||
      urlState?.path === '/review' ||
      urlState?.path?.startsWith('/review/');

    if (
      !isReviewView &&
      whatsNewData.status === 'SUCCESS' &&
      !whatsNewData.disableWhatsNewNotifications &&
      whatsNewData.showNotification
    ) {
      fullAPI.addNotification({
        id: WHATS_NEW_NOTIFICATION_ID,
        link: '/settings/whats-new',
        content: {
          headline: whatsNewData.title,
          subHeadline: "Learn what's new in Forkbook",
        },
        icon: <ForkbookIcon />,
        onClear({ dismissed }: any) {
          if (dismissed) {
            setWhatsNewCache({ lastDismissedPost: whatsNewData.url });
          }
        },
      });
    }
  };

  return { init: initModule, state, api };
};
