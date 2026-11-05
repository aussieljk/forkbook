import { groupBy } from '@aussieljk/forkbook/internal/common';

import {
  analyzeComponent,
  analyzeDoc,
  esc,
  plural,
  renderComponentCard,
  renderDocCard,
} from './components-manifest-cards.ts';
import { componentsManifestCss } from './components-manifest-styles.ts';
import type { DocsManifest, ComponentsManifestForRenderer } from './components-manifest-types.ts';

export type {
  ComponentManifestStories,
  ComponentManifestStory,
  ComponentManifestWithDocs,
  ComponentsManifestForRenderer,
  DocsManifest,
} from './components-manifest-types.ts';

// AI generated manifests/components.html page
// Only HTML/CSS no JS
export function renderComponentsManifest(
  manifest: ComponentsManifestForRenderer | undefined,
  docsManifest?: DocsManifest
) {
  const entries = Object.entries(manifest?.components ?? {}).sort((a, b) =>
    (a[1].name || a[0]).localeCompare(b[1].name || b[0])
  );

  // Get unattached docs entries
  const docsEntries = Object.entries(docsManifest?.docs ?? {}).sort((a, b) =>
    (a[1].name || a[0]).localeCompare(b[1].name || b[0])
  );

  const analyses = entries.map(([, c]) => analyzeComponent(c));
  const docsAnalyses = docsEntries.map(([, d]) => analyzeDoc(d));
  const attachedDocs = analyses.reduce((sum, a) => sum + a.totalDocs, 0);
  const attachedDocsWithError = analyses.reduce((sum, a) => sum + a.docsErrors, 0);
  const unattachedDocsWithError = docsAnalyses.filter((a) => a.hasError).length;
  const totals = {
    components: entries.length,
    componentsWithApiError: analyses.filter((a) => a.hasApiError).length,
    infos: analyses.filter((a) => a.hasWarns).length,
    stories: analyses.reduce((sum, a) => sum + a.totalStories, 0),
    storyErrors: analyses.reduce((sum, a) => sum + a.storyErrors, 0),
    storyWarnings: analyses.reduce((sum, a) => sum + a.storyWarnings, 0),
    componentsWithoutApi: analyses.filter((a) => a.api.kind === 'none').length,
    docs: docsEntries.length + attachedDocs,
    docsWithError: unattachedDocsWithError + attachedDocsWithError,
  };

  const activeEngine = manifest?.meta?.docgen ?? 'react-component-meta';
  const durationMs = manifest?.meta?.durationMs ?? 0;

  // Top filters (clickable), no <b> tags; 1px active ring lives in CSS via :target
  const allPill = `<a class="filter-pill all" data-k="all" href="#filter-all">All</a>`;
  const compErrorsPill =
    totals.componentsWithApiError > 0
      ? `<a class="filter-pill err" data-k="errors" href="#filter-errors">${totals.componentsWithApiError}/${totals.components} API ${plural(totals.componentsWithApiError, 'error')}</a>`
      : totals.components > 0
        ? `<span class="filter-pill ok" aria-disabled="true">${totals.components} components ok</span>`
        : '';
  const compInfosPill =
    totals.infos > 0
      ? `<a class="filter-pill info" data-k="infos" href="#filter-infos">${totals.infos}/${totals.components} ${plural(totals.infos, 'info', 'infos')}</a>`
      : '';
  const storiesPill =
    totals.storyErrors > 0
      ? `<a class="filter-pill err" data-k="story-errors" href="#filter-story-errors">${totals.storyErrors}/${totals.stories} story errors</a>`
      : totals.stories > 0
        ? `<span class="filter-pill ok" aria-disabled="true">${totals.stories} ${plural(totals.stories, 'story', 'stories')} ok</span>`
        : '';
  const snippetWarningsPill =
    totals.storyWarnings > 0
      ? `<a class="filter-pill info" data-k="story-warnings" href="#filter-story-warnings">${totals.storyWarnings}/${totals.stories} incomplete snippets</a>`
      : '';
  const noApiPill =
    totals.componentsWithoutApi > 0
      ? `<a class="filter-pill" data-k="no-api" href="#filter-no-api">${totals.componentsWithoutApi}/${totals.components} without API description</a>`
      : '';
  const docsPill =
    totals.docs > 0
      ? totals.docsWithError > 0
        ? `<a class="filter-pill info" data-k="docs" href="#filter-docs">${totals.docsWithError}/${totals.docs} doc ${plural(totals.docsWithError, 'error')}</a>`
        : `<a class="filter-pill ok" data-k="docs" href="#filter-docs">${totals.docs} ${plural(totals.docs, 'doc')} ok</a>`
      : '';

  const grid = entries.map(([key, c], idx) => renderComponentCard(key, c, `${idx}`, key)).join('');
  const docsGrid = docsEntries.map(([key, d], idx) => renderDocCard(key, d, `doc-${idx}`)).join('');

  const errorGroups = Object.entries(
    groupBy(
      entries.map(([, it]) => it).filter((it) => it.error),
      (manifest) => manifest.error?.name ?? 'Error'
    )
  ).sort(([, a], [, b]) => b.length - a.length);

  const errorGroupsHTML = errorGroups
    .map(([error, grouped]) => {
      const id = error.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const headerText = `${esc(error)}`;
      const cards = grouped
        .map((manifest, id) => renderComponentCard(manifest.id, manifest, `error-${id}`))
        .join('');
      return `
        <section class="group">
          <input id="${id}-toggle" class="group-tg" type="checkbox" hidden />
          <label for="${id}-toggle" class="group-header">
            <span class="caret">▸</span>
            <span class="group-title">${headerText}</span>
            <span class="group-count">${grouped.length}</span>
          </label>
          <div class="group-cards">${cards}</div>
        </section>
      `;
    })
    .join('');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Components Manifest</title>
  <style>
${componentsManifestCss}
  </style>
</head>
<body>
<!-- Hidden targets for the top-level filters -->
<span id="filter-all"></span>
<span id="filter-errors"></span>
<span id="filter-infos"></span>
<span id="filter-story-errors"></span>
<span id="filter-story-warnings"></span>
<span id="filter-no-api"></span>
<span id="filter-doc-errors"></span>
<span id="filter-docs"></span>
<header>
  <div class="wrap">
    <h1>Manifest Debugger</h1>
    <div class="summary">${allPill}${compErrorsPill}${compInfosPill}${noApiPill}${storiesPill}${snippetWarningsPill}${docsPill}</div>
  </div>
</header>
<main>
  <div class="wrap">
    <div class="note ok" style="margin-bottom: 16px;">
      Using <code>${esc(activeEngine)}</code>. Generation took <strong>${(durationMs / 1000).toFixed(1)}s</strong>.
    </div>
    ${
      grid
        ? `<h2 class="section-title">Components</h2>
    <div class="grid" role="list">
      ${grid}
    </div>`
        : ''
    }
    ${
      errorGroups.length
        ? `<div class="error-groups" role="region" aria-label="API error groups">${errorGroupsHTML}</div>`
        : ''
    }
    ${
      docsGrid
        ? `<h2 class="section-title">Unattached Docs</h2>
    <div class="grid" role="list">
      ${docsGrid}
    </div>`
        : ''
    }
    ${
      !grid && !docsGrid
        ? `<div class="card"><div class="head"><div class="hint">No components or docs.</div></div></div>`
        : ''
    }
  </div>
</main>
</body>
</html>  `;
}
