import path from 'node:path';

import type {
  DocsManifestEntry,
  ReactComponentMetaDoc,
  ComponentManifestLikeWithDocgen,
  ComponentManifestStory,
  ComponentManifestStories,
  ComponentManifestWithDocs,
} from './components-manifest-types.ts';

function storyEntries(stories?: ComponentManifestStories): ComponentManifestStory[] {
  return Array.isArray(stories) ? stories : Object.values(stories ?? {});
}

export const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? c;
  });
export const plural = (n: number, one: string, many = `${one}s`) => (n === 1 ? one : many);

export function analyzeComponent(c: ComponentManifestWithDocs) {
  const api = resolveComponentApi(c);
  const hasApiError = api.kind === 'error';
  const warns: string[] = [];

  if (!c.description?.trim()) {
    warns.push('No description found. Write a jsdoc comment such as /** Component description */.');
  }

  if (!c.import?.trim()) {
    warns.push(
      `Specify an @import jsdoc tag on your component or your stories meta such as @import import { ${c.name} } from 'my-design-system';`
    );
  }

  const allStories = storyEntries(c.stories);
  const totalStories = allStories.length;
  const storyErrors = allStories.filter((e) => !!e?.error).length;
  const storyWarnings = allStories.filter((e) => !!e?.warning).length;
  const storyOk = totalStories - storyErrors;

  // Analyze attached docs
  const docsEntries = c.docs ? Object.values(c.docs) : [];
  const totalDocs = docsEntries.length;
  const docsErrors = docsEntries.filter((d) => !!d?.error).length;
  const docsOk = totalDocs - docsErrors;

  const hasAnyError = hasApiError || storyErrors > 0 || docsErrors > 0; // for status dot (red if any errors)

  return {
    api,
    hasApiError,
    hasAnyError,
    hasWarns: warns.length > 0,
    warns,
    totalStories,
    storyErrors,
    storyWarnings,
    storyOk,
    totalDocs,
    docsErrors,
    docsOk,
  };
}

export function analyzeDoc(d: DocsManifestEntry) {
  return {
    hasError: !!d.error,
  };
}

function note(title: string, bodyHTML: string, kind: 'info' | 'err') {
  return `
    <div class="note ${kind}">
      <div class="note-title">${esc(title)}</div>
      <div class="note-body">${bodyHTML}</div>
    </div>`;
}

export function renderDocCard(key: string, d: DocsManifestEntry, id: string) {
  const a = analyzeDoc(d);
  const statusDot = a.hasError ? 'dot-err' : 'dot-ok';

  const slug = `${id}-${(d.id || key)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')}`;

  const errorBadge = a.hasError
    ? `<label for="${slug}-err" class="badge err as-toggle">error</label>`
    : '';

  const contentBadge = d.content
    ? `<label for="${slug}-content" class="badge ok as-toggle">view content</label>`
    : '';

  return `
<article
  class="card is-doc ${a.hasError ? 'has-doc-error' : 'no-doc-error'}"
  role="listitem"
  aria-label="${esc(d.name || key)}">
  <div class="head">
    <div class="title">
      <h2><span class="status-dot ${statusDot}"></span> ${esc(d.title || d.name || key)}</h2>
      <div class="badges">
        ${errorBadge}
        ${contentBadge}
      </div>
    </div>
    <div class="meta" title="${esc(d.path ?? d.id)}">${d.path ? `${esc(d.id)} · ${esc(d.path)}` : esc(d.id)}</div>
    ${d.summary ? `<div>${esc(d.summary)}</div>` : ''}
  </div>

  <!-- Hidden toggles must be siblings BEFORE .panels -->
  ${a.hasError ? `<input id="${slug}-err" class="tg tg-err" type="checkbox" hidden />` : ''}
  ${d.content ? `<input id="${slug}-content" class="tg tg-content" type="checkbox" hidden />` : ''}

  <div class="panels">
    ${
      a.hasError
        ? `
        <div class="panel panel-err">
          <div class="note err">
            <div class="note-title">${esc(d.error?.name || 'Error')}</div>
            <div class="note-body"><pre><code>${esc(d.error?.message || 'Unknown error')}</code></pre></div>
          </div>
        </div>`
        : ''
    }
    ${
      d.content
        ? `
        <div class="panel panel-content">
          <div class="mdx-content">
            <pre><code>${esc(d.content)}</code></pre>
          </div>
        </div>`
        : ''
    }
  </div>
</article>`;
}

// `anchorId`, when set, renders a stable `id` on the card so `components.html#<anchorId>` deep-links
// resolve. Only the primary grid passes it; the error-group section re-renders the same components,
// so anchoring those too would create duplicate DOM ids.
export function renderComponentCard(
  key: string,
  c: ComponentManifestWithDocs,
  id: string,
  anchorId?: string
) {
  const a = analyzeComponent(c);
  const statusDot = a.hasAnyError ? 'dot-err' : 'dot-ok';
  const allStories = storyEntries(c.stories);
  const errorStories = allStories.filter((ex) => !!ex?.error);
  const okStories = allStories.filter((ex) => !ex?.error);
  const subcomponentEntries = Object.entries(c.subcomponents ?? {});

  // Get attached docs entries
  const allDocs = c.docs ? Object.values(c.docs) : [];
  const errorDocs = allDocs.filter((d) => !!d?.error);
  const okDocs = allDocs.filter((d) => !d?.error);

  const slug = `c-${id}-${(c.id || key)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')}`;

  const { api } = a;
  const primaryBadge =
    api.kind === 'error'
      ? `<label for="${slug}-err" class="badge err as-toggle">API error</label>`
      : api.kind === 'markdown'
        ? `<label for="${slug}-props" class="badge ok as-toggle">API description</label>`
        : api.kind === 'props'
          ? `<label for="${slug}-props" class="badge ok as-toggle">${api.entries.length} ${plural(api.entries.length, 'prop type')}</label>`
          : `<span class="badge">no API description</span>`;

  const infosBadge = a.hasWarns
    ? `<label for="${slug}-info" class="badge info as-toggle">${a.warns.length} ${plural(a.warns.length, 'info', 'infos')}</label>`
    : '';

  const storiesBadge =
    a.totalStories > 0
      ? `<label for="${slug}-stories" class="badge ${a.storyErrors > 0 ? 'err' : 'ok'} as-toggle">${a.storyErrors > 0 ? `${a.storyErrors}/${a.totalStories} story errors` : `${a.totalStories} ${plural(a.totalStories, 'story', 'stories')}`}${a.storyWarnings > 0 ? ` · ${a.storyWarnings} incomplete` : ''}</label>`
      : '';

  const docsBadge =
    a.totalDocs > 0
      ? `<label for="${slug}-docs" class="badge ${a.docsErrors > 0 ? 'err' : 'ok'} as-toggle">${a.docsErrors > 0 ? `${a.docsErrors}/${a.totalDocs} doc errors` : `${a.totalDocs} ${plural(a.totalDocs, 'doc')}`}</label>`
      : '';

  const subcomponentsBadge =
    subcomponentEntries.length > 0
      ? `<label for="${slug}-subcomponents" class="badge ok as-toggle">${subcomponentEntries.length} ${plural(subcomponentEntries.length, 'subcomponent')}</label>`
      : '';

  const apiPanel =
    api.kind === 'markdown'
      ? `
        <div class="panel panel-props">
          <div class="note ok">
            <div class="row">
              <span class="ex-name">API description</span>
              ${c.renderer ? `<span class="badge ok">${esc(c.renderer)}</span>` : ''}
            </div>
            <pre><code>${esc(api.markdown)}</code></pre>
          </div>
        </div>`
      : api.kind === 'props'
        ? `
        <div class="panel panel-props">
          <div class="note ok">
            <div class="row">
              <span class="ex-name">Prop types <small>(${api.engine})</small></span>
              <span class="badge ok">${api.entries.length} ${plural(api.entries.length, 'prop type')}</span>
            </div>
            <pre><code>Component: ${api.filePath ? esc(path.relative(process.cwd(), api.filePath)) : ''}${api.exportName ? '::' + esc(api.exportName) : ''}</code></pre>
            <pre><code>Props:</code></pre>
            <pre><code>${esc(renderPropsCode(api.entries))}</code></pre>
          </div>
        </div>`
        : '';

  const tags =
    c.jsDocTags && typeof c.jsDocTags === 'object'
      ? Object.entries(c.jsDocTags)
          .flatMap(([k, v]) =>
            (Array.isArray(v) ? v : [v]).map(
              (val) => `<span class="chip">${esc(k)}: ${esc(val)}</span>`
            )
          )
          .join('')
      : '';

  return `
<article
  ${anchorId ? `id="${esc(anchorId)}"` : ''}
  class="card 
  ${a.hasApiError ? 'has-error' : 'no-error'}
  ${a.hasWarns ? 'has-info' : 'no-info'}
  ${a.storyErrors ? 'has-story-error' : 'no-story-error'}
  ${a.storyWarnings ? 'has-story-warning' : 'no-story-warning'}
  ${api.kind === 'none' ? 'missing-api' : ''}
  ${a.docsErrors ? 'has-doc-error' : 'no-doc-error'}"
  role="listitem"
  aria-label="${esc(c.name || key)}">
  <div class="head">
    <div class="title">
      <h2><span class="status-dot ${statusDot}"></span> ${esc(c.name || key)}</h2>
      <div class="badges">
        ${primaryBadge}
        ${infosBadge}
        ${storiesBadge}
        ${docsBadge}
        ${subcomponentsBadge}
      </div>
    </div>
    <div class="meta" title="${esc(c.path)}">${esc(c.id)} · ${esc(c.path)}</div>
    ${c.summary ? `<div>${esc(c.summary)}</div>` : ''}
    ${c.description ? `<div class="hint">${esc(c.description)}</div>` : ''}
    ${tags ? `<div class="kv">${tags}</div>` : ''}
  </div>

  <!-- ⬇️ Hidden toggles must be siblings BEFORE .panels -->
  ${api.kind === 'error' ? `<input id="${slug}-err" class="tg tg-err" type="checkbox" hidden />` : ''}
  ${a.hasWarns ? `<input id="${slug}-info" class="tg tg-info" type="checkbox" hidden />` : ''}
  ${a.totalStories > 0 ? `<input id="${slug}-stories" class="tg tg-stories" type="checkbox" hidden />` : ''}
  ${a.totalDocs > 0 ? `<input id="${slug}-docs" class="tg tg-docs" type="checkbox" hidden />` : ''}
  ${subcomponentEntries.length > 0 ? `<input id="${slug}-subcomponents" class="tg tg-subcomponents" type="checkbox" hidden />` : ''}
  ${apiPanel ? `<input id="${slug}-props" class="tg tg-props" type="checkbox" hidden />` : ''}

  <div class="panels">
    ${
      api.kind === 'error'
        ? `
        <div class="panel panel-err">
          ${note('API error', `<pre><code>${esc(api.message)}</code></pre>`, 'err')}
        </div>`
        : ''
    }
    ${
      a.hasWarns
        ? `
        <div class="panel panel-info">
          ${a.warns.map((w) => note('Info', esc(w), 'info')).join('')}
        </div>`
        : ''
    }
    ${apiPanel}
    ${
      a.totalStories > 0
        ? `
        <div class="panel panel-stories">
          ${errorStories
            .map(
              (ex) => `
            <div class="note err">
              <div class="row">
                <span class="ex-name">${esc(ex.name)}</span>
                <span class="badge err">story error</span>
                ${ex?.warning ? `<span class="badge info">incomplete example</span>` : ''}
              </div>
              ${ex?.summary ? `<div class=\"hint\">Summary: ${esc(ex.summary)}</div>` : ''}
              ${ex?.description ? `<div class=\"hint\">${esc(ex.description)}</div>` : ''}
              ${ex?.snippet ? `<pre><code>${esc(ex.snippet)}</code></pre>` : ''}
              ${ex?.warning ? `<div class="snippet-warning">${esc(ex.warning)}</div>` : ''}
              ${ex?.error?.message ? `<pre><code>${esc(ex.error.message)}</code></pre>` : ''}
            </div>`
            )
            .join('')}
          
          
          ${
            c.import
              ? `<div class="note ok">
                <div class="row">
                  <span class="ex-name">Imports</span>
                </div>
                <pre><code>${c.import}</code></pre>
              </div>`
              : ''
          }
          
          ${okStories
            .map(
              (ex) => `
            <div class="note ok">
              <div class="row">
                <span class="ex-name">${esc(ex.name)}</span>
                <span class="badge ${ex?.warning ? 'info' : 'ok'}">${ex?.warning ? 'incomplete example' : 'story ok'}</span>
              </div>
              ${ex?.summary ? `<div>${esc(ex.summary)}</div>` : ''}
              ${ex?.description ? `<div class=\"hint\">${esc(ex.description)}</div>` : ''}
              ${ex?.snippet ? `<pre><code>${esc(ex.snippet)}</code></pre>` : ''}
              ${ex?.warning ? `<div class="snippet-warning">${esc(ex.warning)}</div>` : ''}
            </div>`
            )
            .join('')}
        </div>`
        : ''
    }
    ${
      a.totalDocs > 0
        ? `
        <div class="panel panel-docs">
          ${errorDocs
            .map(
              (doc) => `
            <div class="note err">
              <div class="row">
                <span class="ex-name">${esc(doc.name)}</span>
                <span class="badge err">doc error</span>
              </div>
              ${doc.path ? `<div class="hint">${esc(doc.path)}</div>` : ''}
              ${doc?.summary ? `<div>${esc(doc.summary)}</div>` : ''}
              ${doc?.error?.message ? `<pre><code>${esc(doc.error.message)}</code></pre>` : ''}
            </div>`
            )
            .join('')}
          ${okDocs
            .map(
              (doc) => `
            <div class="note ok">
              <div class="row">
                <span class="ex-name">${esc(doc.name)}</span>
                <span class="badge ok">doc ok</span>
              </div>
              ${doc.path ? `<div class="hint">${esc(doc.path)}</div>` : ''}
              ${doc?.summary ? `<div>${esc(doc.summary)}</div>` : ''}
              ${doc?.content ? `<div class="mdx-content"><pre><code>${esc(doc.content)}</code></pre></div>` : ''}
            </div>`
            )
            .join('')}
        </div>`
        : ''
    }
    ${
      subcomponentEntries.length > 0
        ? `
        <div class="panel panel-subcomponents">
          ${subcomponentEntries
            .map(([subcomponentName, subcomponent]) =>
              renderSubcomponentNote(subcomponentName, subcomponent)
            )
            .join('')}
        </div>`
        : ''
    }
  </div>
</article>`;
}

type ParsedProp = {
  description?: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
};

type ParsedDocgen = {
  props: Record<string, ParsedProp>;
};

type DocgenRenderData = {
  parsed?: ParsedDocgen;
  engine?: 'react-component-meta';
  filePath?: string;
  exportName?: string;
};

const docgenRenderData = (component: ComponentManifestLikeWithDocgen): DocgenRenderData => {
  if (component.reactComponentMeta) {
    return {
      parsed: parseReactComponentMeta(component.reactComponentMeta),
      engine: 'react-component-meta',
      filePath: component.reactComponentMeta.filePath,
      exportName: component.reactComponentMeta.exportName,
    };
  }

  return {};
};

type ComponentApi =
  | { kind: 'error'; message: string }
  | { kind: 'markdown'; markdown: string }
  | ({ kind: 'props'; entries: [string, ParsedProp][] } & Omit<DocgenRenderData, 'parsed'>)
  | { kind: 'none' };

/**
 * The component's API surface, as the one question this page exists to answer: is there an API
 * description, and if not, did extraction fail or did the component simply bind nothing?
 */
function resolveComponentApi(component: ComponentManifestLikeWithDocgen): ComponentApi {
  if (component.error) {
    return { kind: 'error', message: component.error.message || 'Unknown error' };
  }

  const markdown = component.apiDescription?.trim();
  if (markdown) {
    return { kind: 'markdown', markdown };
  }

  const { parsed, ...source } = docgenRenderData(component);
  const entries = Object.entries(parsed?.props ?? {}).sort(([a], [b]) => a.localeCompare(b));
  return entries.length > 0 ? { kind: 'props', entries, ...source } : { kind: 'none' };
}

/** Renders the parsed React props as the pseudo-TypeScript block shown in the API panel. */
function renderPropsCode(entries: [string, ParsedProp][]) {
  return entries
    .map(([propName, info]) => {
      const description = (info?.description ?? '').trim();
      const type = (info?.type ?? 'any').trim();
      const optional = info?.required ? '' : '?';
      const defaultValue = (info?.defaultValue ?? '').trim();
      const fallback = defaultValue ? ` = ${defaultValue}` : '';
      const doc =
        ['/**', ...description.split('\n').map((line) => ` * ${line}`), ' */'].join('\n') + '\n';

      return `${description ? doc : ''}${propName}${optional}: ${type}${fallback}`;
    })
    .join('\n\n');
}

function renderSubcomponentNote(
  subcomponentName: string,
  subcomponent: ComponentManifestLikeWithDocgen
) {
  const api = resolveComponentApi(subcomponent);
  const tags =
    subcomponent.jsDocTags && typeof subcomponent.jsDocTags === 'object'
      ? Object.entries(subcomponent.jsDocTags)
          .flatMap(([key, value]) =>
            (Array.isArray(value) ? value : [value]).map(
              (tagValue) => `<span class="chip">${esc(key)}: ${esc(tagValue)}</span>`
            )
          )
          .join('')
      : '';

  const badgeLabel =
    api.kind === 'error'
      ? 'API error'
      : api.kind === 'markdown'
        ? 'API description'
        : api.kind === 'props'
          ? `${api.entries.length} ${plural(api.entries.length, 'prop type')}`
          : 'no API description';

  return `
    <div class="note ${api.kind === 'error' ? 'err' : 'ok'}">
      <div class="row">
        <span class="ex-name">${esc(subcomponentName)}</span>
        <span class="badge ${api.kind === 'error' ? 'err' : api.kind === 'none' ? '' : 'ok'}">
          ${badgeLabel}
        </span>
      </div>
      <div class="hint">${esc(subcomponent.path)}</div>
      ${subcomponent.summary ? `<div>${esc(subcomponent.summary)}</div>` : ''}
      ${subcomponent.description ? `<div class="hint">${esc(subcomponent.description)}</div>` : ''}
      ${tags ? `<div class="kv">${tags}</div>` : ''}
      ${subcomponent.import ? `<pre><code>${esc(subcomponent.import)}</code></pre>` : ''}
      ${api.kind === 'error' ? `<pre><code>${esc(api.message)}</code></pre>` : ''}
      ${api.kind === 'markdown' ? `<pre><code>${esc(api.markdown)}</code></pre>` : ''}
      ${
        api.kind === 'props'
          ? `
          <pre><code>Component: ${api.filePath ? esc(path.relative(process.cwd(), api.filePath)) : ''}${api.exportName ? '::' + esc(api.exportName) : ''}${api.engine ? ` (${esc(api.engine)})` : ''}</code></pre>
          <pre><code>${esc(renderPropsCode(api.entries))}</code></pre>`
          : ''
      }
    </div>
  `;
}

const parseReactComponentMeta = (reactComponentMeta: ReactComponentMetaDoc): ParsedDocgen => {
  const props = reactComponentMeta.props ?? {};
  return {
    props: Object.fromEntries(
      Object.entries(props).map(([propName, prop]) => [
        propName,
        {
          description: prop.description,
          type: prop.type?.raw ?? prop.type?.name,
          defaultValue: prop.defaultValue?.value,
          required: prop.required,
        },
      ])
    ),
  };
};
