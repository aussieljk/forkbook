import { addons } from '@aussieljk/forkbook/preview-api';

import { EVENTS } from './constants.ts';
import { startPicker } from './picker.ts';

const globalState = globalThis as typeof globalThis & { __FORKBOOK_COMMENTS_PICKER__?: boolean };

// The preview can load this file more than once (hot reload). Add the listeners only once.
if (!globalState.__FORKBOOK_COMMENTS_PICKER__ && typeof document !== 'undefined') {
  globalState.__FORKBOOK_COMMENTS_PICKER__ = true;
  const channel = addons.getChannel();
  let stop: (() => void) | undefined;

  channel.on(EVENTS.PICK_START, () => {
    stop?.();
    stop = startPicker(
      document,
      (element) => {
        stop = undefined;
        channel.emit(EVENTS.PICKED, element);
      },
      () => {
        stop = undefined;
        channel.emit(EVENTS.PICK_ENDED);
      }
    );
  });

  channel.on(EVENTS.PICK_CANCEL, () => {
    stop?.();
    stop = undefined;
  });
}

export {};
