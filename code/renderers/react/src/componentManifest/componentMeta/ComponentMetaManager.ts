/**
 * Owns one tsgo API session (the `typescript-native` package) for React docgen.
 *
 * Tsgo finds the tsconfig project of each file that the manager opens, so the manager does not
 * parse tsconfig files itself. Tsgo keeps the programs between requests. Before each request the
 * manager compares the modified times of the project source files with the times it saw before, and
 * tells tsgo to read the files that changed again.
 */
import { statSync } from 'node:fs';

import { logger } from 'storybook/internal/node-logger';

import { API, type APIOptions, type Snapshot } from 'typescript-native/unstable/sync';

import type { StoryRef } from '../getComponentImports.ts';
import {
  type ComponentDoc,
  extractComponentDocFromFile,
  extractComponentDocFromStory,
} from './componentMetaExtractor.ts';

const getModifiedTime = (fileName: string) =>
  statSync(fileName, { throwIfNoEntry: false })?.mtimeMs;

export class ComponentMetaManager {
  private readonly api: API;
  private snapshot: Snapshot | undefined;
  private readonly openFiles = new Set<string>();
  /** The modified time of each project source file (not in `node_modules`) when tsgo read it. */
  private readonly modifiedTimes = new Map<string, number | undefined>();

  constructor(options: APIOptions = {}) {
    this.api = new API({ cwd: process.cwd(), ...options });
  }

  /** Adds `reactComponentMeta` and the JSDoc tags to the component of each story file. */
  batchExtract(entries: StoryRef[]): void {
    const snapshot = this.update(entries.map((entry) => entry.storyPath));
    for (const { storyPath, component } of entries) {
      const project = snapshot.getDefaultProjectForFile(storyPath);
      if (!project || !component?.path || !component.importName) {
        continue;
      }
      try {
        const doc = extractComponentDocFromStory(project, storyPath, component);
        if (doc) {
          component.reactComponentMeta = doc;
          component.componentJsDocTags = doc.jsDocTags;
          component.importOverride = doc.jsDocTags?.import?.[0]?.trim();
        }
      } catch (error) {
        // One component that fails must not stop the other components.
        logger.debug(`[reactComponentMeta] Extraction failed for ${storyPath}: ${error}`);
      }
    }
  }

  /** Makes the docgen of an export of a component file. */
  extractFromFile(filePath: string, exportName?: string): ComponentDoc | undefined {
    const project = this.update([filePath]).getDefaultProjectForFile(filePath);
    return project && extractComponentDocFromFile(project, filePath, exportName);
  }

  dispose(): void {
    this.snapshot?.dispose();
    this.api.close();
  }

  private update(files: string[]): Snapshot {
    const changed: string[] = [];
    const deleted: string[] = [];
    for (const [fileName, time] of this.modifiedTimes) {
      const currentTime = getModifiedTime(fileName);
      if (currentTime !== time) {
        (currentTime === undefined ? deleted : changed).push(fileName);
        this.modifiedTimes.delete(fileName);
      }
    }
    const newFiles = [...new Set(files)].filter((fileName) => !this.openFiles.has(fileName));
    if (this.snapshot && changed.length + deleted.length + newFiles.length === 0) {
      return this.snapshot;
    }

    deleted.forEach((fileName) => this.openFiles.delete(fileName));
    [...changed, ...newFiles].forEach((fileName) => this.openFiles.add(fileName));
    this.snapshot?.dispose();
    // Tsgo 7.0.2 does not read a file again when `fileChanges` reports it. To close and open the
    // file again does make tsgo read it.
    this.snapshot = this.api.updateSnapshot({
      closeFiles: [...changed, ...deleted],
      openFiles: [...changed, ...newFiles],
      fileChanges: { changed, deleted },
    });

    for (const project of this.snapshot.getProjects()) {
      for (const fileName of project.program.getSourceFileNames()) {
        if (!fileName.includes('/node_modules/') && !this.modifiedTimes.has(fileName)) {
          this.modifiedTimes.set(fileName, getModifiedTime(fileName));
        }
      }
    }
    return this.snapshot;
  }
}
