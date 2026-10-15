import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  ProjectType,
  detectIncompatiblePackageVersions,
  detectLanguage,
} from '@aussieljk/forkbook/internal/cli';
import { HandledError, getProjectRoot } from '@aussieljk/forkbook/internal/common';
import type {
  JsPackageManager,
  PackageJsonWithMaybeDeps,
} from '@aussieljk/forkbook/internal/common';
import { logger } from '@aussieljk/forkbook/internal/node-logger';
import { NxProjectDetectedError } from '@aussieljk/forkbook/internal/server-errors';
import type { SupportedLanguage } from '@aussieljk/forkbook/internal/types';

import * as find from 'empathic/find';
import { dedent } from 'ts-dedent';

type TemplateMatcher = {
  files?: boolean[];
  dependencies?: boolean[];
  peerDependencies?: boolean[];
};

type TemplateConfiguration = {
  preset: ProjectType;
  /** Will be checked both against dependencies and devDependencies */
  dependencies?: string[] | { [dependency: string]: (version: string) => boolean };
  peerDependencies?: string[] | { [dependency: string]: (version: string) => boolean };
  files?: string[];
  matcherFunction: (matcher: TemplateMatcher) => boolean;
};

/** Service encapsulating helpers for ProjectType usage */
export class ProjectTypeService {
  constructor(private readonly jsPackageManager: JsPackageManager) {}

  /** Sorted configuration to match a Forkbook preset template */
  getSupportedTemplates(): TemplateConfiguration[] {
    return [
      {
        preset: ProjectType.NEXTJS,
        dependencies: ['next'],
        matcherFunction: ({ dependencies }) => {
          return dependencies?.every(Boolean) ?? true;
        },
      },
      {
        preset: ProjectType.REACT_NATIVE,
        dependencies: ['react-native', 'react-native-scripts', 'expo'],
        peerDependencies: ['react-native', 'react-native-scripts', 'expo'],
        matcherFunction: ({ dependencies, peerDependencies }) => {
          return (dependencies?.some(Boolean) || peerDependencies?.some(Boolean)) ?? false;
        },
      },
      // DO NOT MOVE ANY TEMPLATES BELOW THIS LINE
      // React is part of every Template, after Forkbook is initialized once
      {
        preset: ProjectType.REACT,
        dependencies: ['react'],
        peerDependencies: ['react'],
        matcherFunction: ({ dependencies, peerDependencies }) => {
          return (dependencies?.some(Boolean) || peerDependencies?.some(Boolean)) ?? false;
        },
      },
    ];
  }

  isStorybookInstantiated(configDir = resolve(process.cwd(), '.forkbook')) {
    return existsSync(configDir);
  }

  async validateProvidedType(projectTypeProvided: ProjectType): Promise<ProjectType> {
    // Allow only installable types according to core list
    const installable = Object.values(ProjectType).filter(
      (t) => !['undetected', 'unsupported', 'nx'].includes(String(t))
    );
    if (installable.includes(projectTypeProvided)) {
      return projectTypeProvided;
    }
    logger.error(`The provided project type ${projectTypeProvided} was not recognized by Forkbook`);
    throw new HandledError(`Unknown project type supplied: ${projectTypeProvided}`);
  }

  async autoDetectProjectType(): Promise<ProjectType> {
    try {
      const detectedType = await this.detectProjectType();

      // prompting handled by command layer

      if (detectedType === ProjectType.UNDETECTED || detectedType === null) {
        logger.error(dedent`
          Unable to initialize Forkbook in this directory.

          Forkbook couldn't detect a supported framework or configuration for your project. Make sure you're inside a React, Next.js or React Native project and that its dependencies are installed.

          Tips:
          - Run init in an empty directory or create a new framework app first.
          - If this directory contains unrelated files, try a new directory for Forkbook.
        `);
        throw new HandledError('Forkbook failed to detect your project type');
      }

      if (detectedType === ProjectType.NX) {
        throw new NxProjectDetectedError();
      }

      return detectedType;
    } catch (err) {
      if (err instanceof HandledError || err instanceof NxProjectDetectedError) {
        throw err;
      }
      logger.error(String(err));
      throw new HandledError(err instanceof Error ? err.message : String(err));
    }
  }

  async detectLanguage(): Promise<SupportedLanguage> {
    return detectLanguage(this.jsPackageManager);
  }

  /** Check installed tooling versions for TypeScript compatibility constraints */
  async detectIncompatiblePackageVersions(): Promise<string[]> {
    return detectIncompatiblePackageVersions(this.jsPackageManager);
  }

  private async detectProjectType(): Promise<ProjectType | null> {
    try {
      if (this.isNxProject()) {
        return ProjectType.NX;
      }
      const { packageJson } = this.jsPackageManager.primaryPackageJson;
      return this.detectFrameworkPreset(packageJson);
    } catch {
      return ProjectType.UNDETECTED;
    }
  }

  private detectFrameworkPreset(packageJson: PackageJsonWithMaybeDeps): ProjectType | null {
    const result = [...this.getSupportedTemplates(), this.getUnsupportedTemplate()].find(
      (framework) => {
        return this.getProjectType(packageJson, framework) !== null;
      }
    );
    return result ? result.preset : ProjectType.UNDETECTED;
  }

  /** Template that matches unsupported frameworks */
  private getUnsupportedTemplate(): TemplateConfiguration {
    return {
      preset: ProjectType.UNSUPPORTED,
      dependencies: {},
      matcherFunction: ({ dependencies }) => {
        return dependencies?.some(Boolean) ?? false;
      },
    };
  }

  private getProjectType(
    packageJson: PackageJsonWithMaybeDeps,
    framework: TemplateConfiguration
  ): ProjectType | null {
    const matcher: TemplateMatcher = {
      dependencies: [false],
      peerDependencies: [false],
      files: [false],
    };
    const { preset, files, dependencies, peerDependencies, matcherFunction } = framework;

    let dependencySearches: [string, ((version: string) => boolean) | undefined][] = [];

    if (Array.isArray(dependencies)) {
      dependencySearches = dependencies.map((name) => [name, undefined]);
    } else if (typeof dependencies === 'object') {
      dependencySearches = Object.entries(dependencies);
    }

    if (dependencySearches.length > 0) {
      matcher.dependencies = dependencySearches.map(([name, matchFn]) =>
        this.hasDependency(packageJson, name, matchFn)
      );
    }

    let peerDependencySearches: [string, ((version: string) => boolean) | undefined][] = [];

    if (Array.isArray(peerDependencies)) {
      peerDependencySearches = peerDependencies.map((name) => [name, undefined]);
    } else if (typeof peerDependencies === 'object') {
      peerDependencySearches = Object.entries(peerDependencies);
    }

    if (peerDependencySearches.length > 0) {
      matcher.peerDependencies = peerDependencySearches.map(([name, matchFn]) =>
        this.hasPeerDependency(packageJson, name, matchFn)
      );
    }

    if (Array.isArray(files) && files.length > 0) {
      matcher.files = files.map((name) => existsSync(name));
    }

    return matcherFunction(matcher) ? preset : null;
  }

  private hasDependency(
    packageJson: PackageJsonWithMaybeDeps,
    name: string,
    matcher?: (version: string) => boolean
  ) {
    const version = packageJson.dependencies?.[name] || packageJson.devDependencies?.[name];
    if (version && typeof matcher === 'function') {
      return matcher(version);
    }
    return !!version;
  }

  private hasPeerDependency(
    packageJson: PackageJsonWithMaybeDeps,
    name: string,
    matcher?: (version: string) => boolean
  ) {
    const version = packageJson.peerDependencies?.[name];
    if (version && typeof matcher === 'function') {
      return matcher(version);
    }
    return !!version;
  }

  private isNxProject() {
    return find.up('nx.json', { last: getProjectRoot() });
  }
}
