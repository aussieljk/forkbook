import { AppRegistry } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LiteUI } from '@storybook/react-native-ui-lite';

import { view } from './forkbook.requires';
import { name as appName } from '../app.json';

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
  CustomUIComponent: LiteUI,
});

AppRegistry.registerComponent(appName, () => ForkbookUIRoot);

export default ForkbookUIRoot;
