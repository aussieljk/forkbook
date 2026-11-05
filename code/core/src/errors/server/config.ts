import picocolors from 'picocolors';
import { dedent } from 'ts-dedent';
import { StorybookError } from '../../storybook-error.ts';
import { Category } from './category.ts';

export class NxProjectDetectedError extends StorybookError {
  constructor() {
    super({
      name: 'NxProjectDetectedError',
      category: Category.CLI_INIT,
      code: 1,
      documentation: 'https://nx.dev/nx-api/storybook#generating-storybook-configuration',
      message: dedent`
        We have detected Nx in your project. Nx has its own Forkbook initializer, so please use it instead.
        Run "nx g @nx/storybook:configuration <your-project-name>" to add Forkbook to a given Nx app or lib.`,
    });
  }
}

export class MissingFrameworkFieldError extends StorybookError {
  constructor() {
    super({
      name: 'MissingFrameworkFieldError',
      category: Category.CORE_COMMON,
      code: 1,
      documentation: 'https://forkbook.ljk.dev/docs/migration#new-framework-api',
      message: dedent`
        Could not find a 'framework' field in Forkbook config.
        
        Set it to '@aussieljk/forkbook/react-vite' or '@aussieljk/forkbook/nextjs-vite'.`,
    });
  }
}

export class InvalidFrameworkNameError extends StorybookError {
  constructor(public data: { frameworkName: string }) {
    super({
      name: 'InvalidFrameworkNameError',
      category: Category.CORE_COMMON,
      code: 2,
      documentation: 'https://forkbook.ljk.dev/docs/migration#new-framework-api',
      message: dedent`
        Invalid value of '${data.frameworkName}' in the 'framework' field of Forkbook config.
        
        Set it to '@aussieljk/forkbook/react-vite' or '@aussieljk/forkbook/nextjs-vite'.
      `,
    });
  }
}

export class CouldNotEvaluateFrameworkError extends StorybookError {
  constructor(public data: { frameworkName: string }) {
    super({
      name: 'CouldNotEvaluateFrameworkError',
      category: Category.CORE_COMMON,
      code: 3,
      documentation: '',
      message: dedent`
        Could not evaluate the '${data.frameworkName}' package from the 'framework' field of Forkbook config.
        
        Are you sure it's a valid package and is installed?`,
    });
  }
}

// this error is not used anymore, but we keep it to maintain unique its error code
// which is used for telemetry
export class ConflictingStaticDirConfigError extends StorybookError {
  constructor() {
    super({
      name: 'ConflictingStaticDirConfigError',
      category: Category.CORE_SERVER,
      code: 1,
      documentation:
        'https://forkbook.ljk.dev/docs/configure/integration/images-and-assets#serving-static-files-via-storybook-configuration',
      message: dedent`
        Forkbook encountered a conflict when trying to serve statics. You have configured both:
        * Forkbook's option in the config file: 'staticDirs'
        * Forkbook's (deprecated) CLI flag: '--staticDir' or '-s'
        
        Please remove the CLI flag from your storybook script and use only the 'staticDirs' option instead.`,
    });
  }
}

export class InvalidStoriesEntryError extends StorybookError {
  constructor() {
    super({
      name: 'InvalidStoriesEntryError',
      category: Category.CORE_COMMON,
      code: 4,
      documentation:
        'https://forkbook.ljk.dev/docs/faq#can-i-have-a-storybook-with-no-local-stories',
      message: dedent`
        Forkbook could not index your stories.
        Your main configuration does not contain a 'stories' field, or it resolved to an empty array.
        
        Please check your main configuration file and make sure it exports a 'stories' field that is not an empty array.`,
    });
  }
}

export class CriticalPresetLoadError extends StorybookError {
  constructor(
    public data: {
      error: Error;
      presetName: string;
    }
  ) {
    super({
      name: 'CriticalPresetLoadError',
      category: Category.CORE_SERVER,
      code: 2,
      documentation: '',
      message: dedent`
        Forkbook failed to load the following preset: ${data.presetName}.
        
        Please check whether your setup is correct, the Forkbook dependencies (and their peer dependencies) are installed correctly and there are no package version clashes.
        
        If you believe this is a bug, please open an issue on Github.
        
        ${data.error.stack || data.error.message}`,
    });
  }
}

export class MissingBuilderError extends StorybookError {
  constructor() {
    super({
      name: 'MissingBuilderError',
      category: Category.CORE_SERVER,
      code: 3,
      documentation: 'https://github.com/storybookjs/storybook/issues/24071',
      message: dedent`
        Forkbook could not find a builder configuration for your project. 
        Builders normally come from a framework package e.g. '@aussieljk/forkbook/react-vite', or from builder packages e.g. '@aussieljk/forkbook/builder-vite'.
        
        - Does your main config file contain a 'framework' field configured correctly?
        - Is the Forkbook framework package installed correctly?
        - If you don't use a framework, does your main config contain a 'core.builder' configured correctly?
        - Are you in a monorepo and perhaps the framework package is hoisted incorrectly?
        
        If you believe this is a bug, please describe your issue in detail on Github.`,
    });
  }
}

export class NoMatchingExportError extends StorybookError {
  constructor(public data: { error: unknown | Error }) {
    super({
      name: 'NoMatchingExportError',
      category: Category.CORE_SERVER,
      code: 4,
      documentation: '',
      message: dedent`
        There was an exports mismatch error when trying to build Forkbook.
        Please check whether the versions of your Forkbook packages match whenever possible, as this might be the cause.
        
        Problematic example:
        { "@aussieljk/forkbook/react": "7.5.3", "@aussieljk/forkbook/react-vite": "7.4.5", "@aussieljk/forkbook": "7.3.0" }
        
        Correct example:
        { "@aussieljk/forkbook/react": "7.5.3", "@aussieljk/forkbook/react-vite": "7.5.3", "@aussieljk/forkbook": "7.5.3" }`,
    });
  }
}

export class MainFileMissingError extends StorybookError {
  constructor(public data: { location: string; source?: 'storybook' | 'vitest' }) {
    const map = {
      storybook: {
        helperMessage:
          'You can pass a --config-dir flag to tell Forkbook, where your main.js|ts file is located at.',
        documentation: 'https://forkbook.ljk.dev/docs/configure',
      },
      vitest: {
        helperMessage:
          'You can pass a configDir plugin option to tell where your main.js|ts file is located at.',
        // TODO: add proper docs once available
        documentation: 'https://forkbook.ljk.dev/docs/configure',
      },
    };
    const { documentation, helperMessage } = map[data.source || 'storybook'];
    super({
      name: 'MainFileMissingError',
      category: Category.CORE_SERVER,
      code: 6,
      documentation,
      message: dedent`
        No configuration files have been found in your configDir: ${picocolors.yellow(data.location)}.
        Forkbook needs a "main.js|ts" file, please add it.
        
        ${helperMessage}`,
    });
  }
}

export class MainFileEvaluationError extends StorybookError {
  constructor(public data: { location: string; error: Error }) {
    const errorText = picocolors.white(
      (data.error.stack || data.error.message).replaceAll(process.cwd(), '')
    );

    super({
      name: 'MainFileEvaluationError',
      category: Category.CORE_SERVER,
      code: 7,
      message: dedent`
        Forkbook couldn't evaluate your ${picocolors.yellow(data.location)} file.
        
        Original error:
        ${errorText}`,
    });
  }
}
