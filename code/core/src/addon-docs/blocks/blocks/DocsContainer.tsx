import type { FC, PropsWithChildren } from 'react';
import React, { useEffect, useMemo, useState } from 'react';

import type { Renderer } from '@aussieljk/forkbook/internal/types';

import { LucideProvider } from 'lucide-react';

import type { ThemeVars } from '@aussieljk/forkbook/theming';
import {
  ensure as ensureTheme,
  getPreferredColorScheme,
  ThemeProvider,
  themes,
} from '@aussieljk/forkbook/theming';

import { DocsPageWrapper } from '../components';
import { TableOfContents } from '../components/TableOfContents';
import type { DocsContextProps } from './DocsContext';
import { DocsContext } from './DocsContext';
import { createDocsSlugger, DocsSluggerContext } from './DocsSluggerContext';
import { SourceContainer } from './SourceContainer';
import { scrollToElement } from './utils';

const { document, window: globalWindow } = globalThis;

// Forkbook icons are 14 px unless a component gives another size.

/**
 * The light or dark Forkbook theme, from the OS setting. It changes when the OS setting changes. A
 * `docs.theme` parameter replaces it.
 */
const usePreferredTheme = (): ThemeVars => {
  const [scheme, setScheme] = useState<'light' | 'dark'>(getPreferredColorScheme);
  useEffect(() => {
    const query = globalWindow.matchMedia?.('(prefers-color-scheme: dark)');
    if (!query) {
      return undefined;
    }
    const onChange = () => setScheme(query.matches ? 'dark' : 'light');
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);
  return themes[scheme];
};

export interface DocsContainerProps<TFramework extends Renderer = Renderer> {
  context: DocsContextProps<TFramework>;
  theme?: ThemeVars;
}

export const DocsContainer: FC<PropsWithChildren<DocsContainerProps>> = ({
  context,
  theme,
  children,
}) => {
  const slugger = useMemo(() => createDocsSlugger(), []);
  const preferredTheme = usePreferredTheme();
  let toc;
  // Language of docs prose (descriptions, ArgTypes description cells, free MDX prose).
  let lang;

  try {
    const meta = context.resolveOf('meta', ['meta']);
    const metaParameters = meta.preparedMeta.parameters;
    toc = metaParameters?.docs?.toc;
    lang = metaParameters?.docs?.lang || 'en';
  } catch (err) {
    // No meta, falling back to project annotations
    toc = context?.projectAnnotations?.parameters?.docs?.toc;
    lang = context?.projectAnnotations?.parameters?.docs?.lang || 'en';
  }

  useEffect(() => {
    let url;
    try {
      url = new URL(globalWindow.parent.location.toString());
      if (url.hash) {
        const element = document.getElementById(decodeURIComponent(url.hash.substring(1)));
        if (element) {
          // Introducing a delay to ensure scrolling works when it's a full refresh.
          setTimeout(() => {
            scrollToElement(element);
          }, 200);
        }
      }
    } catch (err) {
      // pass
    }
  });

  return (
    <DocsSluggerContext.Provider value={slugger}>
      <DocsContext.Provider value={context}>
        <SourceContainer channel={context.channel}>
          <ThemeProvider theme={ensureTheme(theme ?? preferredTheme)}>
            <LucideProvider size={14}>
              <DocsPageWrapper
                lang={lang}
                toc={
                  toc ? (
                    <TableOfContents
                      className="sbdocs sbdocs-toc--custom"
                      channel={context.channel}
                      {...toc}
                    />
                  ) : null
                }
              >
                {children}
              </DocsPageWrapper>
            </LucideProvider>
          </ThemeProvider>
        </SourceContainer>
      </DocsContext.Provider>
    </DocsSluggerContext.Provider>
  );
};
