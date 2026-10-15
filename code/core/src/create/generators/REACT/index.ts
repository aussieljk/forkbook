import { ProjectType } from '@aussieljk/forkbook/internal/cli';
import { SupportedLanguage, SupportedRenderer } from '@aussieljk/forkbook/internal/types';

import { defineGeneratorModule } from '../modules/GeneratorModule.ts';

// Export as module
export default defineGeneratorModule({
  metadata: {
    projectType: ProjectType.REACT,
    renderer: SupportedRenderer.REACT,
  },
  configure: async (packageManager, { language }) => {
    const extraPackages = language === SupportedLanguage.JAVASCRIPT ? ['prop-types'] : [];

    return {
      extraPackages,
    };
  },
});
