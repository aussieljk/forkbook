import type { ForkbookConfig as StorybookConfigBase } from '@aussieljk/forkbook/internal/types';

import type { ReactNativeOptions } from './prepareStories.ts';

// The config types of `.rnforkbook/main.ts`. They have no React Native imports, so the Node side
// (metro/, scripts/) can use them.

export type Features = {
  /** Enable the built-in on-device backgrounds addon panel. */
  ondeviceBackgrounds?: boolean;
};

export type Addon = string | { name: string; options?: Record<string, any> };

export interface ForkbookConfig {
  stories: StorybookConfigBase['stories'];
  /** @deprecated Use `deviceAddons`. This field will be removed in a future version. */
  addons?: Addon[];
  /**
   * Addons loaded only at runtime on the device and merged into
   * `forkbook.requires`. Not evaluated as presets by Forkbook, which
   * avoids failures during server-side operations like `extract`.
   */
  deviceAddons?: Addon[];
  // TODO move this to params
  reactNative?: ReactNativeOptions;
  features?: Features;
  framework?: '@aussieljk/forkbook/react-native';
}
