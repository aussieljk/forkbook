import type { ProjectInfo } from './project-info.ts';

const SUPPORTED_SETUP_RENDERERS = ['@aussieljk/forkbook/react'];

export function getSetupSupportError({
  rendererPackage,
  builderPackage,
}: Pick<ProjectInfo, 'rendererPackage' | 'builderPackage'>): string | undefined {
  if (
    rendererPackage &&
    SUPPORTED_SETUP_RENDERERS.includes(rendererPackage) &&
    builderPackage === '@aussieljk/forkbook/builder-vite'
  ) {
    return undefined;
  }

  return `AI-assisted setup is currently only available for React projects using the Vite builder. Detected renderer: ${rendererPackage ?? 'unknown'}, builder: ${builderPackage ?? 'unknown'}.`;
}
