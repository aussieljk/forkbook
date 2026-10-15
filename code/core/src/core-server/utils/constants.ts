import { join } from 'pathe';

import { resolvePackageDir } from '../../shared/utils/module.ts';

export const DEBOUNCE = 100;

export const defaultStaticDirs = [
  {
    from: join(resolvePackageDir('@aussieljk/forkbook'), 'assets/browser'),
    to: '/sb-common-assets',
  },
];

export const defaultFavicon = join(
  resolvePackageDir('@aussieljk/forkbook'),
  'assets/browser/favicon.svg'
);
