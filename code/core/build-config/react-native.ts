import type { BuildEntries } from '../../../scripts/build/utils/entry-utils.ts';

// React Native (iOS), vendored from storybookjs/react-native v10.6.1. Metro bundles the browser
// entries for the device. The node entries run in metro.config and in the `forkbook rn-stories` command.
const config: BuildEntries = {
  entries: {
    browser: [
      {
        exportEntries: ['./react-native'],
        entryPoint: './src/react-native/index.ts',
      },
      {
        exportEntries: ['./react-native/preview'],
        entryPoint: './src/react-native/preview.ts',
      },
      {
        // Takes the place of the config folder when Storybook is disabled (metro/withForkbook).
        exportEntries: ['./react-native/stub'],
        entryPoint: './src/react-native/stub.tsx',
        dts: false,
      },
      {
        exportEntries: ['./react-native-ui'],
        entryPoint: './src/react-native-ui/index.tsx',
      },
      {
        exportEntries: ['./internal/react-native-theming'],
        entryPoint: './src/react-native-theming/index.ts',
      },
      {
        exportEntries: ['./internal/react-native-ui-common'],
        entryPoint: './src/react-native-ui-common/index.tsx',
      },
      {
        exportEntries: ['./addon-ondevice-controls'],
        entryPoint: './src/addon-ondevice-controls/index.tsx',
      },
      {
        exportEntries: ['./addon-ondevice-controls/register'],
        entryPoint: './src/addon-ondevice-controls/register.ts',
        dts: false,
      },
      {
        exportEntries: ['./addon-ondevice-actions'],
        entryPoint: './src/addon-ondevice-actions/index.tsx',
      },
      {
        exportEntries: ['./addon-ondevice-actions/register'],
        entryPoint: './src/addon-ondevice-actions/register.ts',
        dts: false,
      },
    ],
    node: [
      {
        exportEntries: ['./react-native/metro/withForkbook'],
        entryPoint: './src/react-native/metro/withForkbook.ts',
      },
      {
        exportEntries: ['./react-native/node'],
        entryPoint: './src/react-native/metro/node.ts',
      },
      {
        exportEntries: ['./react-native/scripts/generate'],
        entryPoint: './src/react-native/scripts/generate.ts',
      },
      {
        // The `forkbook rn-stories` command.
        entryPoint: './src/react-native/bin/get-stories.ts',
        dts: false,
      },
    ],
  },
  extraOutputs: {
    './react-native/metro-env': { types: './assets/react-native/metro-env.d.ts' },
  },
};

export default config;
