import { createRequire } from 'node:module';
import { addAliases } from 'module-alias';
import { getAlias as getNextImageAlias } from '../plugins/next-image/alias/index.tsx';
import { getAlias as getNextMocksAlias } from '../plugins/next-mocks/plugin.ts';

const require = createRequire(import.meta.url);

addAliases({
  react: 'next/dist/compiled/react',
  'react-dom/server': 'next/dist/compiled/react-dom/server.js',
  'react-dom/test-utils':
    require.resolve('next/dist/compiled/react-dom/cjs/react-dom-test-utils.production.js'),
  'react-dom': 'next/dist/compiled/react-dom',
  ...getNextMocksAlias('node'),
  ...getNextImageAlias('node'),
});
