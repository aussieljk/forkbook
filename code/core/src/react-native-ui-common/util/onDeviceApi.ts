import type { Channel } from '@aussieljk/forkbook/internal/channels';
import type { PreviewWithSelection } from '@aussieljk/forkbook/internal/preview-api';
import type { API } from '@aussieljk/forkbook/manager-api';
import type { ReactRenderer } from '@aussieljk/forkbook/react';

type DevicePreview = PreviewWithSelection<ReactRenderer>;

/** The small store API that the on-device addons get. */
export interface OnDeviceStore {
  fromId: (id: string) => ReturnType<DevicePreview['getStoryContext']>;
  getSelection: () => DevicePreview['currentSelection'];
  _channel: Channel;
}

/** On device, `View` gives the addons this API, not the full manager API. */
export interface OnDeviceAPI {
  store: () => OnDeviceStore;
}

/**
 * Returns the store of the API that an on-device addon gets. `addons.register` types that API as
 * the manager `API`, but on device it is an `OnDeviceAPI`.
 */
export const getOnDeviceStore = (api: API) => (api as unknown as OnDeviceAPI).store();
