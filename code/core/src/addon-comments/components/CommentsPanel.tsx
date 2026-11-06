import React, { useCallback, useEffect, useState } from 'react';

import { Button, ScrollArea } from '@aussieljk/forkbook/internal/components';
import { useAddonState, useStorybookApi, useStorybookState } from '@aussieljk/forkbook/manager-api';

import { fetchComments, sendCommentAction } from '../client.ts';
import { ADDON_ID, EVENTS } from '../constants.ts';
import { DEFAULT_STATE, type CommentsAddonState } from '../state.ts';
import type { CommentAction, StoryComment } from '../types.ts';
import { CommentList, CopyAllOpen } from './CommentList.tsx';
import styles from './Comments.module.css';

type Filter = 'open' | 'all';

/** Keeps only the args that JSON can store (functions, such as actions, are dropped). */
const toJsonArgs = (args: Record<string, unknown> | undefined) => {
  if (!args) {
    return undefined;
  }
  try {
    return JSON.parse(JSON.stringify(args)) as Record<string, unknown>;
  } catch {
    return undefined;
  }
};

export const CommentsPanel = ({ active }: { active: boolean }) => {
  const api = useStorybookApi();
  const { storyId } = useStorybookState();
  const [state, setState] = useAddonState<CommentsAddonState>(ADDON_ID, DEFAULT_STATE);
  const [comments, setComments] = useState<StoryComment[]>([]);
  const [note, setNote] = useState('');
  const [filter, setFilter] = useState<Filter>('open');
  const [error, setError] = useState<string>();

  const reload = useCallback(async () => {
    try {
      setComments(await fetchComments());
      setError(undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    if (active) {
      void reload();
    }
  }, [active, reload]);

  const run = async (action: CommentAction) => {
    try {
      await sendCommentAction(action);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const composing = !!state.pending || !!state.wholeStory;

  const startPick = () => {
    setState({ picking: true });
    api.emit(EVENTS.PICK_START);
  };

  const cancel = () => {
    if (state.picking) {
      api.emit(EVENTS.PICK_CANCEL);
    }
    setState(DEFAULT_STATE);
    setNote('');
  };

  const save = async () => {
    const story = api.getCurrentStoryData();
    if (!story || story.type !== 'story' || !note.trim()) {
      return;
    }
    await run({
      action: 'add',
      comment: {
        storyId: story.id,
        title: story.title,
        name: story.name,
        importPath: story.importPath,
        element: state.pending,
        args: toJsonArgs(story.args),
        note,
      },
    });
    setNote('');
    setState(DEFAULT_STATE);
  };

  const shown = filter === 'open' ? comments.filter((c) => c.status === 'open') : comments;

  return (
    <ScrollArea vertical>
      <div className={styles.panel}>
        <div className={styles.row}>
          <Button
            size="small"
            variant="solid"
            ariaLabel={false}
            onClick={startPick}
            disabled={state.picking}
          >
            {state.picking ? 'Click an element in the story…' : 'Add comment on element'}
          </Button>
          <Button
            size="small"
            variant="outline"
            onClick={() => setState({ picking: false, wholeStory: true })}
          >
            Comment on whole story
          </Button>
          {(state.picking || composing) && (
            <Button size="small" variant="ghost" ariaLabel={false} onClick={cancel}>
              Cancel
            </Button>
          )}
        </div>

        {composing && (
          <form
            className={styles.form}
            onSubmit={(event) => {
              event.preventDefault();
              void save();
            }}
          >
            <span className={styles.muted}>
              {state.pending
                ? `Element: ${state.pending.selector}${state.pending.text ? ` ("${state.pending.text}")` : ''}`
                : 'Whole story'}
            </span>
            <textarea
              className={styles.input}
              aria-label="Comment note"
              autoFocus
              value={note}
              placeholder="What should change?"
              onChange={(event) => setNote(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                  void save();
                }
              }}
            />
            <div className={styles.row}>
              <Button
                size="small"
                variant="solid"
                ariaLabel={false}
                type="submit"
                disabled={!note.trim()}
              >
                Save comment
              </Button>
            </div>
          </form>
        )}

        {error && (
          <div className={styles.error} role="alert">
            {error}
          </div>
        )}

        <div className={styles.row}>
          <CopyAllOpen comments={comments} />
          <Button
            size="small"
            variant="ghost"
            onClick={() => setFilter(filter === 'open' ? 'all' : 'open')}
          >
            {filter === 'open' ? 'Show resolved' : 'Hide resolved'}
          </Button>
          <Button size="small" variant="ghost" ariaLabel={false} onClick={() => void reload()}>
            Refresh
          </Button>
        </div>

        <CommentList
          comments={shown}
          currentStoryId={storyId}
          onResolve={(comment) => run({ action: 'resolve', id: comment.id })}
          onReopen={(comment) => run({ action: 'reopen', id: comment.id })}
          onDelete={(comment) => run({ action: 'delete', id: comment.id })}
          onSelectStory={(comment) => api.selectStory(comment.storyId)}
        />
      </div>
    </ScrollArea>
  );
};
