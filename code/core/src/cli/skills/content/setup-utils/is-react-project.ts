import type { ProjectInfo } from '../../project-info.ts';
import { frameworkToRendererMap } from '../../../../shared/utils/framework-renderer.ts';

export function isReactProject(projectInfo: ProjectInfo): boolean {
  const renderer =
    projectInfo.rendererPackage ??
    (projectInfo.framework ? frameworkToRendererMap[projectInfo.framework] : undefined);
  return renderer === '@aussieljk/forkbook/react';
}
