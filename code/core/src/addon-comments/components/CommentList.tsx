import React from 'react';

import { Button, useCopyButton } from '@aussieljk/forkbook/internal/components';

import { formatCommentsPrompt } from '../prompt.ts';
import type { StoryComment } from '../types.ts';
import styles from './Comments.module.css';

export interface CommentListProps {
  comments: StoryComment[];
  /** Id of the current story. Its comments show a mark. */
  currentStoryId?: string;
  onResolve: (comment: StoryComment) => void;
  onReopen: (comment: StoryComment) => void;
  onDelete: (comment: StoryComment) => void;
  onSelectStory?: (comment: StoryComment) => void;
}

const CopyForClaude = ({ comment }: { comment: StoryComment }) => {
  const { children, buttonProps } = useCopyButton({
    content: formatCommentsPrompt([comment]),
    children: 'Copy for Claude',
    ariaLabel: false,
  });
  return (
    <Button size="small" variant="outline" ariaLabel={false} {...buttonProps}>
      {children}
    </Button>
  );
};

export const CopyAllOpen = ({ comments }: { comments: StoryComment[] }) => {
  const open = comments.filter((comment) => comment.status === 'open');
  const { children, buttonProps } = useCopyButton({
    content: formatCommentsPrompt(open),
    children: `Copy all open (${open.length})`,
    ariaLabel: false,
  });
  return (
    <Button
      size="small"
      variant="solid"
      ariaLabel={false}
      disabled={open.length === 0}
      {...buttonProps}
    >
      {children}
    </Button>
  );
};

export const CommentList = ({
  comments,
  currentStoryId,
  onResolve,
  onReopen,
  onDelete,
  onSelectStory,
}: CommentListProps) => {
  if (comments.length === 0) {
    return <div className={styles.muted}>No comments yet.</div>;
  }
  return (
    <ol className={styles.list} aria-label="Comments">
      {comments.map((comment) => (
        <li
          key={comment.id}
          className={[
            styles.item,
            comment.storyId === currentStoryId ? styles.current : '',
            comment.status === 'resolved' ? styles.resolved : '',
          ].join(' ')}
          data-comment-id={comment.id}
        >
          <div className={styles.muted}>
            {onSelectStory ? (
              <button type="button" className={styles.link} onClick={() => onSelectStory(comment)}>
                {comment.title} / {comment.name}
              </button>
            ) : (
              <span>
                {comment.title} / {comment.name}
              </span>
            )}
            <span>{comment.status === 'resolved' ? 'Resolved' : 'Open'}</span>
          </div>
          {comment.element ? (
            <code className={styles.code} title={comment.element.text}>
              {comment.element.selector}
            </code>
          ) : (
            <div className={styles.muted}>Whole story</div>
          )}
          <p className={styles.note}>{comment.note}</p>
          {comment.reply && <div className={styles.muted}>Reply: {comment.reply}</div>}
          <div className={styles.row}>
            <CopyForClaude comment={comment} />
            {comment.status === 'open' ? (
              <Button
                size="small"
                variant="ghost"
                ariaLabel={false}
                onClick={() => onResolve(comment)}
              >
                Resolve
              </Button>
            ) : (
              <Button
                size="small"
                variant="ghost"
                ariaLabel={false}
                onClick={() => onReopen(comment)}
              >
                Reopen
              </Button>
            )}
            <Button
              size="small"
              variant="ghost"
              ariaLabel={false}
              onClick={() => onDelete(comment)}
            >
              Delete
            </Button>
          </div>
        </li>
      ))}
    </ol>
  );
};
