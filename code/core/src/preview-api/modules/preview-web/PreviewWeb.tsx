import type { ModuleImportFn, ProjectAnnotations } from '@aussieljk/forkbook/internal/types';
import type { Renderer } from '@aussieljk/forkbook/internal/types';

import { global } from '../../../shared/global.ts';

import type { MaybePromise } from './Preview.tsx';
import { PreviewWithSelection } from './PreviewWithSelection.tsx';
import { UrlStore } from './UrlStore.ts';
import { WebView } from './WebView.ts';

export class PreviewWeb<TRenderer extends Renderer> extends PreviewWithSelection<TRenderer> {
  constructor(
    public importFn: ModuleImportFn,

    public getProjectAnnotations: () => MaybePromise<ProjectAnnotations<TRenderer>>
  ) {
    super(importFn, getProjectAnnotations, new UrlStore(), new WebView());

    global.__FORKBOOK_PREVIEW__ = this;
  }
}
