/**
 * Source of truth for AI prompts throughout the application.
 */

const DEFAULT_FORKBOOK_EXECUTOR = 'npx forkbook';

export function getAiSetupPrompt(executor = DEFAULT_FORKBOOK_EXECUTOR) {
  return `Run \`${executor} skills setup\` and follow its instructions precisely.`;
}
