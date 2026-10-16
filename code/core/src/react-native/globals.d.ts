import type { Channel } from '@aussieljk/forkbook/internal/channels';
import type { PreviewWithSelection } from '@aussieljk/forkbook/internal/preview-api';
import type { ReactRenderer } from '@aussieljk/forkbook/react';
import type { Features } from './config.ts';

type sbCoreGlobalFeatures = {
  measure?: boolean;
  outline?: boolean;
  interactions?: boolean;
  viewport?: boolean;
  highlight?: boolean;
  backgrounds?: boolean;
};

declare global {
  var global: typeof globalThis | undefined;
  var CHANNEL_OPTIONS: { maxDepth: number } | undefined;
  var FEATURES: (Features & sbCoreGlobalFeatures) | undefined;
  var STORYBOOK_WEBSOCKET:
    | {
        host?: string;
        port?: number;
        secured?: boolean;
      }
    | undefined;
  var __STORYBOOK_ADDONS_CHANNEL__: Channel | undefined;
  var __STORYBOOK_PREVIEW__: PreviewWithSelection<ReactRenderer> | undefined;
}
