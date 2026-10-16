import type { StorybookConfig as StorybookConfigBase } from '@aussieljk/forkbook/internal/types';

import type { ReactNativeOptions } from './prepareStories.ts';

// The config types of `.rnstorybook/main.ts`. They have no React Native imports, so the Node side
// (metro/, scripts/) can use them.

export type Features = {
  /** Enable the built-in on-device backgrounds addon panel. */
  ondeviceBackgrounds?: boolean;
};

export type Addon = string | { name: string; options?: Record<string, any> };

export interface StorybookConfig {
  stories: StorybookConfigBase['stories'];
  /** @deprecated Use `deviceAddons`. This field will be removed in a future version. */
  addons?: Addon[];
  /**
   * Addons loaded only at runtime on the device and merged into
   * `storybook.requires`. Not evaluated as presets by Storybook Core, which
   * avoids failures during server-side operations like `extract`.
   */
  deviceAddons?: Addon[];
  // TODO move this to params
  reactNative?: ReactNativeOptions;
  features?: Features;
  framework?: '@aussieljk/forkbook/react-native' | '@storybook/react-native';
}
