import type { Channel } from '@aussieljk/forkbook/internal/channels';
import {
  AI_PROMPT_NUDGE,
  PREVIEW_INITIALIZED,
  SHARE_ISOLATE_MODE,
  SIDEBAR_FILTER_CHANGED,
} from '@aussieljk/forkbook/internal/core-events';
import { telemetry } from '@aussieljk/forkbook/internal/telemetry';

import { REVIEW_EVENTS, type ReviewPageviewPayload } from '../../shared/review/events.ts';

export function initTelemetryChannel(channel: Channel) {
  // Send only the first preview load of each dev server.
  let previewLoaded = false;
  channel.on(PREVIEW_INITIALIZED, ({ userAgent }) => {
    if (!previewLoaded) {
      previewLoaded = true;
      telemetry('preview-first-load', { userAgent });
    }
  });
  channel.on(SHARE_ISOLATE_MODE, async () => {
    telemetry('share', { action: 'isolate-mode-opened' });
  });
  channel.on(SIDEBAR_FILTER_CHANGED, (payload) => {
    telemetry('sidebar-filter', payload);
  });
  channel.on(AI_PROMPT_NUDGE, async ({ id, origin }: { id: string; origin: string }) => {
    telemetry('ai-prompt-nudge', { id, origin });
  });
  channel.on(REVIEW_EVENTS.PAGEVIEW, ({ page, reviewCreatedAt }: ReviewPageviewPayload) => {
    // Reviews are only produced by the MCP review-create tool today; other
    // producers should report their own `source` under the same event.
    telemetry('review', { action: 'pageview', source: 'mcp-review', page, reviewCreatedAt });
  });
}
