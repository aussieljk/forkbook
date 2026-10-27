import { registerRootComponent } from 'expo';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { view } from './forkbook.requires';

/**
 * This file is user-editable.
 *
 * Use it as your React Native Storybook entrypoint and wrap `ForkbookUIRoot`
 * with application decorators/providers (theme, i18n, state, navigation, etc).
 */
const ForkbookUIRoot = view.getForkbookUI({
  shouldPersistSelection: true,
  storage: {
    getItem: AsyncStorage.getItem,
    setItem: AsyncStorage.setItem,
  },
});

registerRootComponent(ForkbookUIRoot);
