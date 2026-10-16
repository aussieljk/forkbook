import type { ProjectInfo } from '../../project-info.ts';

/**
 * The markdown URL of a Forkbook docs page. Each docs page also has a `.md` copy for agents. The
 * docs have one version, for React only, so the project info changes nothing.
 */
export function getDocsMarkdownUrl(
  path: string,
  _projectInfo?: Pick<ProjectInfo, 'majorVersion' | 'renderer' | 'language'>
): string {
  return `https://forkbook.ljk.dev/docs/${path}.md`;
}
