import { afterEach, beforeAll, beforeEach, inject, vi } from 'vitest';
import type { RunnerTask, TaskMeta } from 'vitest';

import { Channel } from '@aussieljk/forkbook/internal/channels';
import { getChannel, setChannel } from '@aussieljk/forkbook/internal/channels';

import { COMPONENT_TESTING_PANEL_ID, FORKBOOK_TEST_FEATURES_PROVIDE_KEY } from '../constants.ts';

// Vitest 5 replaces the Vite define without exposing it on the runtime global.
const features = inject(FORKBOOK_TEST_FEATURES_PROVIDE_KEY);
if (features) {
  vi.stubGlobal('FEATURES', features);
  beforeEach(() => vi.stubGlobal('FEATURES', features));
}

export type Task = Partial<RunnerTask> & {
  meta: TaskMeta & { storyId?: string };
};

let defaultChannel: Channel | null = null;

export const initTransport = () => {
  const existing = getChannel();
  if (existing) {
    defaultChannel ??= existing as Channel;
    return;
  }

  const transport = { setHandler: vi.fn(), send: vi.fn() };
  const channel = new Channel({ transport });
  defaultChannel = channel;
  setChannel(channel);
};

/** Restore the channel installed for story tests (e.g. after manager stories swap in a mock). */
export const restoreDefaultChannel = () => {
  if (!defaultChannel) {
    initTransport();
    return;
  }

  if (getChannel() !== defaultChannel) {
    setChannel(defaultChannel);
  }
};

export const modifyErrorMessage = ({ task }: { task: Task }) => {
  const meta = task.meta;
  if (
    task.type === 'test' &&
    task.result?.state === 'fail' &&
    meta.storyId &&
    task.result.errors?.[0]
  ) {
    const currentError = task.result.errors[0];
    const forkbookUrl = import.meta.env.__FORKBOOK_URL__;
    const storyUrl = `${forkbookUrl}/_story/${meta.storyId}?addonPanel=${COMPONENT_TESTING_PANEL_ID}`;
    currentError.message = `\n\x1B[34mClick to debug the error directly in Forkbook: ${storyUrl}\x1B[39m\n\n${currentError.message}`;
  }
};

initTransport();

beforeAll(() => {
  if (globalThis.globalProjectAnnotations) {
    return globalThis.globalProjectAnnotations.beforeAll();
  }
});

afterEach((ctx) => {
  restoreDefaultChannel();
  modifyErrorMessage({ task: ctx.task });
});
