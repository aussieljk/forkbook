import { readFileSync } from 'node:fs';

import type { Options, SecurityConfig } from '@aussieljk/forkbook/internal/types';

import { describe, expect, it } from 'vitest';

import { transformIframeHtml } from './transform-iframe-html.ts';

const template = readFileSync(
  new URL('../../assets/builder-vite/iframe.html', import.meta.url),
  'utf-8'
);

const createOptions = (security?: SecurityConfig) =>
  ({
    configType: 'PRODUCTION',
    configDir: '/project/.forkbook',
    presets: {
      apply: async (extension: string) =>
        ({ security, stories: ['../src/**/*.stories.tsx'] })[extension],
    },
  }) as unknown as Options;

describe('transformIframeHtml', () => {
  it('flags the preview when security.insecureIframeMessaging is enabled', async () => {
    const html = await transformIframeHtml(
      template,
      createOptions({ insecureIframeMessaging: true })
    );

    expect(html).toContain('window["INSECURE_IFRAME_MESSAGING"] = true;');
  });

  it('puts the dev app entry under the base path', async () => {
    const options = { ...createOptions(), configType: 'DEVELOPMENT', basePath: '/forkbook' };
    const html = await transformIframeHtml(template, options as unknown as Options);

    expect(html).toContain('/forkbook/@id/__x00__virtual:/@storybook/builder-vite/vite-app.js');
  });

  it('uses the root for the dev app entry with an empty base path', async () => {
    const options = { ...createOptions(), configType: 'DEVELOPMENT', basePath: '' };
    const html = await transformIframeHtml(template, options as unknown as Options);

    expect(html).toContain('src="/@id/__x00__virtual:/@storybook/builder-vite/vite-app.js');
  });

  it('leaves the preview unflagged by default', async () => {
    const html = await transformIframeHtml(template, createOptions());

    expect(html).not.toContain('INSECURE_IFRAME_MESSAGING');
  });
});
