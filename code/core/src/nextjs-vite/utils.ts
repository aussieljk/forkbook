import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { resolvePackageDir } from '../shared/utils/module.ts';

export const getNextjsVersion = (): string =>
  JSON.parse(readFileSync(join(resolvePackageDir('next'), 'package.json'), 'utf8')).version;
