declare module 'fb-original/image-context' {
  import type { StaticImport } from 'next/dist/shared/lib/get-img-props';
  import type { Context } from 'next/dist/compiled/react';
  import type { ImageProps } from 'next/image';
  import type { ImageProps as LegacyImageProps } from 'next/legacy/image';

  export const ImageContext: Context<
    Partial<
      Omit<ImageProps, 'src'> & {
        src: string | StaticImport;
      }
    > &
      Omit<LegacyImageProps, 'src'>
  >;
}

declare module 'fb-original/default-loader' {
  import type { ImageLoaderProps } from 'next/image';

  export const defaultLoader: (props: ImageLoaderProps) => string;
}

declare module 'next/dist/compiled/react' {
  import * as React from 'react';
  export default React;
  export type Context<T> = React.Context<T>;
  export function createContext<T>(
    // If you thought this should be optional, see
    // https://github.com/DefinitelyTyped/DefinitelyTyped/pull/24509#issuecomment-382213106
    defaultValue: T
  ): Context<T>;
}

// The sync entry avoids loading the HTTP code of the main entry.
declare module 'probe-image-size/sync.js' {
  const sync: typeof import('probe-image-size').sync;
  export default sync;
}

// The modules below are only in some Next.js versions, not in the installed one, so they are
// declared here with the types of their replacements.

// Next.js < 15.4.0. Later versions moved it to `next/dist/build/define-env.js`.
declare module 'next/dist/build/webpack/plugins/define-env-plugin.js' {
  export { getDefineEnv } from 'next/dist/build/define-env.js';
}

// Next.js >= 16.2. Earlier versions have it in `next/dist/build/utils.js`.
declare module 'next/dist/build/get-supported-browsers.js' {
  export { getSupportedBrowsers } from 'next/dist/build/utils.js';
}

// Next.js 14. Later versions moved it to `next/dist/server/request/draft-mode.js`.
declare module 'next/dist/client/components/headers' {
  export { draftMode } from 'next/dist/server/request/draft-mode.js';
}

// Next.js ships this compiled module without types.
declare module 'next/dist/compiled/loader-utils3/index.js' {
  const loaderUtils: {
    getHashDigest(
      buffer: string | Buffer,
      hashType: string,
      digestType: string,
      maxLength: number
    ): string;
  };
  export default loaderUtils;
}
