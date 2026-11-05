import { Platform } from 'react-native';
import {
  parameters as reactParameters,
  argTypesEnhancers,
} from '@aussieljk/forkbook/react/entry-preview-argtypes';
import { type Preview } from '@aussieljk/forkbook/react';

// Workaround for Reanimated globals not being available on web.
// Without these, the actions panel crashes with:
// "ProgressTransitionRegister is not available on non-native platform"
if (Platform.OS === 'web') {
  const reanimatedGlobals = globalThis as typeof globalThis & {
    ProgressTransitionRegister?: object;
    UpdatePropsManager?: object;
  };
  reanimatedGlobals.ProgressTransitionRegister = {};
  reanimatedGlobals.UpdatePropsManager = {};
}

const preview: Preview = {
  argTypesEnhancers,
  parameters: {
    docs: {
      extractArgTypes: reactParameters.docs.extractArgTypes,
    },
  },
};

export default preview;
