import { logger } from '@aussieljk/forkbook/internal/node-logger';

interface Options {
  hasTSDependency: boolean;
}

export const warn = async ({ hasTSDependency }: Options) => {
  if (!hasTSDependency) {
    // Dynamically import globby because it is a pure ESM module
    // eslint-disable-next-line depend/ban-dependencies
    const { glob } = await import('tinyglobby');

    const files = await glob(['**/*.@(ts|tsx)'], {
      expandDirectories: false,
      ignore: ['**/node_modules/**', '**/*.d.ts'],
    });

    const hasTSFiles = !!files.length;

    if (hasTSFiles) {
      logger.warn(
        'We have detected TypeScript files in your project directory, however TypeScript is not listed as a project dependency.'
      );
      logger.warn('Forkbook will continue as though this is a JavaScript project.');
      logger.info(
        'For more information, see: https://forkbook.ljk.dev/docs/configure/integration/typescript'
      );
    }
  }
};
