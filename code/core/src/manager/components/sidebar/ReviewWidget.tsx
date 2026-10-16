import React, { useMemo, useRef, type SyntheticEvent } from 'react';

import { ActionList, Card } from '@aussieljk/forkbook/internal/components';

import { MagicWandIcon, XCircleIcon } from '@phosphor-icons/react';

import { useStorybookApi } from '@aussieljk/forkbook/manager-api';

import { useLandmark } from '../../hooks/useLandmark.ts';
import { useReviewContext } from '../review/review-context.ts';
import { collectReviewStoryIds } from '../review/review-status.ts';
import styles from './ReviewWidget.module.css';

const HEADING_ID = 'storybook-review-widget-heading';

/** Story count for the displayed review payload, not the sidebar status store. */
export const useActiveReviewStoryCount = () => {
  const { review } = useReviewContext();

  return useMemo(() => (review ? collectReviewStoryIds(review).size : 0), [review]);
};

const useActiveReviewTitle = () => {
  const { review } = useReviewContext();
  return review?.title ?? null;
};

export const ReviewWidget = () => {
  const api = useStorybookApi();
  const { openSummary, dismiss } = useReviewContext();
  const storyCount = useActiveReviewStoryCount();
  const reviewTitle = useActiveReviewTitle();

  const regionRef = useRef<HTMLElement>(null);
  const { landmarkProps } = useLandmark(
    { role: 'region', 'aria-labelledby': HEADING_ID },
    regionRef
  );

  if (!api.getIsNavShown()) {
    return null;
  }

  if (storyCount === 0) {
    return null;
  }

  const onOpen = () => {
    openSummary();
  };

  const onDismiss = (event: SyntheticEvent) => {
    event.stopPropagation();
    dismiss();
  };

  const storyLabel = storyCount === 1 ? 'story' : 'stories';

  // The dismiss button is rendered last (and pinned to the top-right corner) so
  // the review action comes before it in the tab order.
  // The section is a landmark, so the review widget is reachable via F6 and announced as a named
  // region; the Card provides the visuals. A plain block (not `display: contents`) keeps the region
  // reliably exposed in the a11y tree.
  return (
    <section className={styles.region} ref={regionRef} {...landmarkProps}>
      <Card color="agentic" outlineAnimation="spin" id="storybook-review-widget">
        <ActionList as="div">
          <ActionList.Item as="div">
            <ActionList.Text className={styles.headerContent}>
              <MagicWandIcon className={styles.agenticIcon} aria-hidden />
              <h2 className={styles.headerTitle} id={HEADING_ID}>
                Quick review
              </h2>
            </ActionList.Text>
          </ActionList.Item>
        </ActionList>
        <ActionList as="div">
          <ActionList.Item as="div">
            <ActionList.Action
              ariaLabel={
                reviewTitle
                  ? `Review ${storyCount} ${storyLabel}: ${reviewTitle}`
                  : `Review ${storyCount} ${storyLabel}`
              }
              disableAllTooltips
              appearance="agentic"
              onClick={onOpen}
            >
              <ActionList.Text>
                <strong>
                  Review {storyCount} {storyLabel}
                </strong>
                {reviewTitle ? <small>{reviewTitle}</small> : null}
              </ActionList.Text>
            </ActionList.Action>
          </ActionList.Item>
        </ActionList>
        <ActionList.Button
          className={styles.dismissButton}
          appearance="agentic"
          ariaLabel="Dismiss review"
          onClick={onDismiss}
        >
          <XCircleIcon className={styles.dismissIcon} />
        </ActionList.Button>
      </Card>
    </section>
  );
};

export default ReviewWidget;
