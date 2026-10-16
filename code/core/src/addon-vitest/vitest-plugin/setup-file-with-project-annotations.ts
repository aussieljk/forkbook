import { setProjectAnnotations } from '@aussieljk/forkbook/internal/preview-api';
import { ProjectAnnotationsAlreadyAppliedError } from '@aussieljk/forkbook/internal/preview-errors';

// @ts-expect-error - virtual module provided by storybook-project-annotations-plugin
import { getProjectAnnotations } from 'virtual:/@storybook/builder-vite/project-annotations.js';

// A user setup file that ran before this one has already called `setProjectAnnotations`
if (
  globalThis.__FORKBOOK_SET_PROJECT_ANNOTATIONS_CALLED__ &&
  !globalThis.__FORKBOOK_ADDON_VITEST_PROJECT_ANNOTATIONS_APPLIED__
) {
  throw new ProjectAnnotationsAlreadyAppliedError();
}

globalThis.__FORKBOOK_ADDON_VITEST_PROJECT_ANNOTATIONS_APPLIED__ = false;

setProjectAnnotations(getProjectAnnotations());

// Later user calls would replace these annotations, so `setProjectAnnotations` refuses them from now on.
globalThis.__FORKBOOK_ADDON_VITEST_PROJECT_ANNOTATIONS_APPLIED__ = true;
