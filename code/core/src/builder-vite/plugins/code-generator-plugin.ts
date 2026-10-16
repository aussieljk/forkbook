import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import type { StoryIndexGenerator } from '@aussieljk/forkbook/internal/core-server';
import type { Options } from '@aussieljk/forkbook/internal/types';

import type { Plugin } from 'vite';

import { importMetaResolve } from '../../shared/utils/module.ts';
import { generateImportFnScriptCode } from '../codegen-importfn-script.ts';
import { generateModernIframeScriptCode } from '../codegen-modern-iframe-script.ts';
import { generateAddonSetupCode } from '../codegen-set-addon-channel.ts';
import { transformIframeHtml } from '../transform-iframe-html.ts';
import { applyChunkedPreviewRuntime, ensureStrictExecutionOrder } from '../utils/vite-features.ts';
import {
  FB_VIRTUAL_FILES,
  FB_VIRTUAL_FILE_IDS,
  getResolvedVirtualModuleId,
} from '../virtual-file-names.ts';

export function codeGeneratorPlugin(options: Options) {
  const iframePath = fileURLToPath(
    importMetaResolve('@aussieljk/forkbook/builder-vite/input/iframe.html')
  );
  let iframeId: string;
  const storyIndexGeneratorPromise: Promise<StoryIndexGenerator> =
    options.presets.apply<StoryIndexGenerator>('storyIndexGenerator');

  return {
    name: 'storybook:code-generator-plugin',
    enforce: 'pre',
    async configureServer(server) {
      (await storyIndexGeneratorPromise).onInvalidated(() => {
        // TODO: this is only necessary when new files are added.
        // Changes and removals are already watched and handled by Vite, so they actually trigger a double HMR event right now.
        server.watcher.emit(
          'change',
          getResolvedVirtualModuleId(FB_VIRTUAL_FILES.VIRTUAL_STORIES_FILE)
        );
      });
    },
    config(config, { command }) {
      // If we are building the static distribution, add iframe.html as an entry.
      // In development mode, it's not an entry - instead, we use a middleware
      // to serve iframe.html. The reason is that Vite's dev server (at the time of writing)
      // does not support virtual files as entry points.
      if (command === 'build') {
        config.build ??= {};
        config.build.rolldownOptions = { ...config.build.rolldownOptions, input: iframePath };
        ensureStrictExecutionOrder(config);
        if (options.features?.experimentalChunkedPreviewRuntime) {
          applyChunkedPreviewRuntime(config);
        }
      }
    },
    configResolved(config) {
      iframeId = `${config.root}/iframe.html`;
    },
    resolveId(source) {
      if (FB_VIRTUAL_FILE_IDS.includes(source)) {
        return getResolvedVirtualModuleId(source);
      }
      if (source === iframePath) {
        return iframeId;
      }

      return undefined;
    },
    async load(id) {
      switch (id) {
        case getResolvedVirtualModuleId(FB_VIRTUAL_FILES.VIRTUAL_STORIES_FILE): {
          const storyIndexGenerator = await storyIndexGeneratorPromise;
          const index = await storyIndexGenerator?.getIndex();
          return generateImportFnScriptCode(index);
        }

        case getResolvedVirtualModuleId(FB_VIRTUAL_FILES.VIRTUAL_ADDON_SETUP_FILE): {
          return generateAddonSetupCode();
        }
        case getResolvedVirtualModuleId(FB_VIRTUAL_FILES.VIRTUAL_APP_FILE): {
          return generateModernIframeScriptCode();
        }
        case iframeId: {
          return readFileSync(
            fileURLToPath(importMetaResolve('@aussieljk/forkbook/builder-vite/input/iframe.html')),
            'utf-8'
          );
        }
      }
    },
    async transformIndexHtml(html, ctx) {
      if (ctx.path !== '/iframe.html') {
        return undefined;
      }
      return transformIframeHtml(html, options);
    },
  } satisfies Plugin;
}
