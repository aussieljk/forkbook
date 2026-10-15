import React, { useCallback, type FC } from 'react';

import { useStorybookApi } from '@aussieljk/forkbook/manager-api';

import { PRE_REVIEW_RETURN_KEY } from '../constants.ts';
import { useReviewContext } from '../review-context.ts';
import { sessionStore } from '../session-store.ts';
import { SummaryScreen } from './SummaryScreen.tsx';
import styles from './ReviewSummaryHost.module.css';

export const ReviewSummaryHost: FC = () => {
  const api = useStorybookApi();
  const { review, storyInfo, banner, isInReviewMode, isSummaryVisible, dismiss } =
    useReviewContext();
  const getStoryPreviewHref = useCallback(
    (storyId: string) => api.getStoryHrefs(storyId, { embed: true, freeze: true }).previewHref,
    [api]
  );

  // Mount on the summary route (so the page renders) and throughout review mode
  // (so hidden thumbnail iframes survive round-trips to individual stories).
  if (!isSummaryVisible && !isInReviewMode) {
    return null;
  }

  return (
    <div
      className={styles.summaryHost}
      ref={(node) => {
        if (node) {
          node.inert = !isSummaryVisible;
        }
      }}
      // Also mark the hidden host aria-hidden, so screen readers and the F6
      // landmark cycle (useLandmark) skip the hidden summary's landmarks.
      aria-hidden={!isSummaryVisible ? true : undefined}
      data-review-summary={isSummaryVisible ? 'visible' : 'hidden'}
    >
      <SummaryScreen
        state={review}
        storyInfo={storyInfo}
        getStoryPreviewHref={getStoryPreviewHref}
        banner={banner}
        summaryHidden={!isSummaryVisible}
        onDismiss={dismiss}
        returnSearch={sessionStore.read(PRE_REVIEW_RETURN_KEY)}
      />
    </div>
  );
};
