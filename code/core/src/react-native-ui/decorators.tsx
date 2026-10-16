import type { ComponentType } from 'react';
import { LayoutProvider } from '@aussieljk/forkbook/internal/react-native-ui-common';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { theme, ThemeProvider } from '@aussieljk/forkbook/internal/react-native-theming';

export const decorators = [
  (Story: ComponentType) => (
    <ThemeProvider theme={theme}>
      <SafeAreaProvider>
        <LayoutProvider>
          <Story />
        </LayoutProvider>
      </SafeAreaProvider>
    </ThemeProvider>
  ),
];
