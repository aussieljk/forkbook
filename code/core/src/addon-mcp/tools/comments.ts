import * as v from 'valibot';

import { getProjectRoot } from '@aussieljk/forkbook/internal/common';

import { formatCommentsPrompt } from '../../addon-comments/prompt.ts';
import { getCommentStore, type CommentStore } from '../../addon-comments/store.ts';
import type { AddonMcpServer } from '../types.ts';
import { errorToMCPContent } from '../utils/errors.ts';

export const LIST_COMMENTS_TOOL_NAME = 'list_comments';
export const RESOLVE_COMMENT_TOOL_NAME = 'resolve_comment';

const ListCommentsInput = v.object({
  status: v.optional(
    v.pipe(
      v.picklist(['open', 'resolved', 'all']),
      v.description('Which comments to list. The default is "open".')
    )
  ),
  storyId: v.optional(v.pipe(v.string(), v.description('Only list comments on this story id.'))),
});

const ResolveCommentInput = v.object({
  id: v.pipe(v.string(), v.description('Id of the comment, from list_comments.')),
  reply: v.optional(
    v.pipe(v.string(), v.description('Optional short note that tells the user what you changed.'))
  ),
});

type ToolEnabled = Parameters<AddonMcpServer['tool']>[0]['enabled'];

/**
 * Registers the tools that read and resolve the comments that users leave on stories with
 * `@aussieljk/forkbook/addon-comments`. The comments are in `.forkbook/comments.json`.
 */
export function addCommentTools(
  server: AddonMcpServer,
  enabled?: ToolEnabled,
  getStore: () => CommentStore = () => getCommentStore(getProjectRoot())
) {
  server.tool(
    {
      name: LIST_COMMENTS_TOOL_NAME,
      title: 'List story comments',
      description:
        'List the comments that the user left on Forkbook stories (from the Comments panel). Each comment has the story id, story file path, the element selector and text, the args and the note. Only open comments by default. Do what each note asks, then call resolve_comment.',
      schema: ListCommentsInput,
      enabled,
    },
    async (input) => {
      try {
        const comments = await getStore().list({
          status: input?.status ?? 'open',
          storyId: input?.storyId,
        });
        return {
          content: [
            { type: 'text' as const, text: formatCommentsPrompt(comments) },
            { type: 'text' as const, text: JSON.stringify({ comments }, null, 2) },
          ],
        };
      } catch (error) {
        return errorToMCPContent(error);
      }
    }
  );

  server.tool(
    {
      name: RESOLVE_COMMENT_TOOL_NAME,
      title: 'Resolve a story comment',
      description:
        'Mark a comment on a Forkbook story as resolved, after you made the change that it asks for. Add an optional reply that the user sees in the Comments panel.',
      schema: ResolveCommentInput,
      enabled,
    },
    async (input) => {
      try {
        const comment = await getStore().resolve(input.id, input.reply);
        return {
          content: [
            {
              type: 'text' as const,
              text: `Resolved comment ${comment.id} on ${comment.title} / ${comment.name}.`,
            },
          ],
        };
      } catch (error) {
        return errorToMCPContent(error);
      }
    }
  );
}
