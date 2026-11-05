import { dedent } from 'ts-dedent';
import { StorybookError } from '../../storybook-error.ts';
import { Category } from './category.ts';

export class GoogleFontsDownloadError extends StorybookError {
  constructor(public data: { fontFamily: string; url: string }) {
    super({
      name: 'GoogleFontsDownloadError',
      category: Category.FRAMEWORK_NEXTJS,
      code: 1,
      documentation:
        'https://forkbook.ljk.dev/docs/get-started/frameworks/nextjs#nextjs-font-optimization',
      message: dedent`
        Failed to fetch \`${data.fontFamily}\` from Google Fonts with URL: \`${data.url}\``,
    });
  }
}

export class GoogleFontsLoadingError extends StorybookError {
  constructor(public data: { error: unknown | Error; url: string }) {
    super({
      name: 'GoogleFontsLoadingError',
      category: Category.FRAMEWORK_NEXTJS,
      code: 2,
      documentation:
        'https://forkbook.ljk.dev/docs/get-started/frameworks/nextjs#nextjs-font-optimization',
      message: dedent`
        An error occurred when trying to load Google Fonts with URL \`${data.url}\`.
        
        ${data.error instanceof Error ? data.error.message : ''}`,
    });
  }
}

export class NoStatsForViteDevError extends StorybookError {
  constructor() {
    super({
      name: 'NoStatsForViteDevError',
      category: Category.BUILDER_VITE,
      code: 1,
      message: dedent`
        Unable to write preview stats as the Vite builder does not support stats in dev mode.
        
        Please remove the \`--stats-json\` flag when running in dev mode.`,
    });
  }
}

export class ViteModuleGraphSubscriptionError extends StorybookError {
  constructor() {
    super({
      name: 'ViteModuleGraphSubscriptionError',
      category: Category.BUILDER_VITE,
      code: 2,
      message: 'Vite module graph listeners must be registered before the builder starts.',
    });
  }
}

export class IncompatiblePostCssConfigError extends StorybookError {
  constructor(public data: { error: Error }) {
    super({
      name: 'IncompatiblePostCssConfigError',
      category: Category.FRAMEWORK_NEXTJS,
      code: 3,
      message: dedent`
        Incompatible PostCSS configuration format detected.

        Next.js uses an array-based format for plugins which is not compatible with Vite:
        
        // ❌ Incompatible format (used by Next.js)
        const config = {
          plugins: ["@tailwindcss/postcss"],
        };
        
        Please transform your PostCSS config to use the object-based format, which is compatible with Next.js and Vite:
        
        // ✅ Compatible format (works with Next.js and Vite)
        const config = {
          plugins: {
            "@tailwindcss/postcss": {},
          },
        };
        
        Original error: ${data.error.message}
      `,
    });
  }
}
