import type { ComponentProps, FC } from 'react';
import React, { useCallback, useMemo } from 'react';
import { createRoot } from 'react-dom/client';

import { ProviderDoesNotExtendBaseProviderError } from '@aussieljk/forkbook/internal/manager-errors';
import { Location, LocationProvider, useNavigate } from '@aussieljk/forkbook/internal/router';
import type { Addon_PageType } from '@aussieljk/forkbook/internal/types';

import { global } from '../shared/global.ts';

import { LucideProvider } from 'lucide-react';
import { HelmetProvider } from 'react-helmet-async';
import { Provider as ManagerProvider, types } from '@aussieljk/forkbook/manager-api';
import type { Combo } from '@aussieljk/forkbook/manager-api';
import { ThemeProvider, ensure as ensureTheme } from '@aussieljk/forkbook/theming';

import { App } from './App.tsx';
import type { Layout } from './components/layout/Layout.tsx';
import { LayoutProvider } from './components/layout/LayoutProvider.tsx';
import Provider from './provider.ts';
import { settingsPageAddon } from './settings/index.tsx';

// @ts-expect-error (Converted from ts-ignore)
ThemeProvider.displayName = 'ThemeProvider';
// @ts-expect-error (Converted from ts-ignore)
HelmetProvider.displayName = 'HelmetProvider';

// Forkbook icons are 14 px unless a component gives another size. The addons get the same
// LucideProvider through the 'lucide-react' manager global.

export interface RootProps {
  provider: Provider;
  history?: History;
}

export const Root: FC<RootProps> = ({ provider }) => (
  <HelmetProvider key="helmet.Provider">
    <LocationProvider key="location.provider">
      <Main provider={provider} />
    </LocationProvider>
  </HelmetProvider>
);

export const Main: FC<{ provider: Provider }> = ({ provider }) => {
  const navigate = useNavigate();

  return (
    <Location key="location.consumer">
      {(locationData) => (
        <ManagerProvider
          key="manager"
          provider={provider}
          {...locationData}
          navigate={navigate}
          docsOptions={global?.DOCS_OPTIONS || {}}
        >
          {(combo: Combo) => {
            const { state, api } = combo;
            const setManagerLayoutState = useCallback<
              ComponentProps<typeof Layout>['setManagerLayoutState']
            >(
              (sizes) => {
                api.setSizes(sizes);
              },
              [api]
            );

            const pages: Addon_PageType[] = useMemo(
              () => [settingsPageAddon, ...Object.values(api.getElements(types.experimental_PAGE))],
              [Object.keys(api.getElements(types.experimental_PAGE)).join()]
            );

            return (
              <ThemeProvider key="theme.provider" theme={ensureTheme(state.theme)}>
                <LucideProvider size={14}>
                  <LayoutProvider>
                    <App
                      key="app"
                      pages={pages}
                      managerLayoutState={{
                        ...state.layout,
                        viewMode: state.viewMode,
                      }}
                      setManagerLayoutState={setManagerLayoutState}
                    />
                  </LayoutProvider>
                </LucideProvider>
              </ThemeProvider>
            );
          }}
        </ManagerProvider>
      )}
    </Location>
  );
};

export function renderStorybookUI(domNode: HTMLElement, provider: Provider) {
  if (!(provider instanceof Provider)) {
    throw new ProviderDoesNotExtendBaseProviderError();
  }

  const root = createRoot(domNode);
  root.render(<Root key="root" provider={provider} />);
}

export { Provider };
