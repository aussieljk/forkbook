import type { StoryComment } from './types.ts';

const formatArgs = (args: Record<string, unknown> | undefined) => {
  if (!args || Object.keys(args).length === 0) {
    return undefined;
  }
  try {
    return JSON.stringify(args, null, 2);
  } catch {
    return undefined;
  }
};

/** Makes the details of one comment, for a prompt to Claude Code. */
export function formatCommentPrompt(comment: StoryComment): string {
  const lines = [`Story: ${comment.title} / ${comment.name} (id: ${comment.storyId})`];
  if (comment.importPath) {
    lines.push(`File: ${comment.importPath}`);
  }
  if (comment.element) {
    lines.push(`Element: \`${comment.element.selector}\``);
    if (comment.element.text) {
      lines.push(`Element text: "${comment.element.text}"`);
    }
  } else {
    lines.push('Element: the whole story');
  }
  const args = formatArgs(comment.args);
  if (args) {
    lines.push('Args:', '```json', args, '```');
  }
  lines.push(`Note: ${comment.note}`);
  lines.push(`Comment id: ${comment.id}`);
  return lines.join('\n');
}

/** Makes one ready prompt for a list of comments. */
export function formatCommentsPrompt(comments: StoryComment[]): string {
  if (comments.length === 0) {
    return 'There are no open Forkbook comments.';
  }
  const header =
    comments.length === 1
      ? 'Please address this Forkbook comment on a story.'
      : `Please address these ${comments.length} Forkbook comments on stories.`;
  const footer =
    'When you finish a comment, resolve it with the `resolve_comment` MCP tool (Forkbook addon-mcp). Give its id and a short reply.';
  return [
    header,
    ...comments.map((comment, index) => `## Comment ${index + 1}\n${formatCommentPrompt(comment)}`),
    footer,
  ].join('\n\n');
}
