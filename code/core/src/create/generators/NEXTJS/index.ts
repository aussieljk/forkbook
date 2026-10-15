import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { ProjectType } from '@aussieljk/forkbook/internal/cli';
import {
  SupportedBuilder,
  SupportedFramework,
  SupportedRenderer,
} from '@aussieljk/forkbook/internal/types';

import { defineGeneratorModule } from '../modules/GeneratorModule.ts';

export default defineGeneratorModule({
  metadata: {
    projectType: ProjectType.NEXTJS,
    renderer: SupportedRenderer.REACT,
    framework: SupportedFramework.NEXTJS_VITE,
    builderOverride: SupportedBuilder.VITE,
  },
  configure: async () => {
    let staticDir;

    if (existsSync(join(process.cwd(), 'public'))) {
      staticDir = 'public';
    }

    return {
      staticDir,
      extraPackages: ['vite'],
    };
  },
});
