import type { Channel } from '@aussieljk/forkbook/internal/channels';
import { DOCS_PAGE_IN_VIEW } from '@aussieljk/forkbook/internal/core-events';
import type {
  IndexEntry,
  RenderContextCallbacks,
  Renderer,
  StoryId,
} from '@aussieljk/forkbook/internal/types';

import { isMdxEntry } from '../../../shared/utils/story-index-filters.ts';
import type { StoryStore } from '../store/index.ts';
import type { DocsContextProps } from './docs-context/DocsContextProps.ts';
import { CsfDocsRender } from './render/CsfDocsRender.ts';
import { MdxDocsRender } from './render/MdxDocsRender.ts';

const { document, IntersectionObserver } = globalThis;

type DocsRender<TRenderer extends Renderer> = MdxDocsRender<TRenderer> | CsfDocsRender<TRenderer>;

/**
 * The docs entries in sidebar order: the sidebar shows top-level entries (a title with no `/`)
 * first, then the groups, each in index order.
 */
export const docsEntriesInOrder = (entries: Record<string, IndexEntry>) => {
  const docs = Object.values(entries).filter((entry) => entry.type === 'docs');
  const isTopLevel = (entry: IndexEntry) => !entry.title.includes('/');
  return [...docs.filter(isTopLevel), ...docs.filter((entry) => !isTopLevel(entry))];
};

/** The docs entry after `id` in index order, or undefined at the end. */
export const nextDocsEntry = (entries: Record<string, IndexEntry>, id: StoryId) => {
  const docs = docsEntriesInOrder(entries);
  const index = docs.findIndex((entry) => entry.id === id);
  return index === -1 ? undefined : docs[index + 1];
};

/**
 * Infinite scroll for docs pages. When the reader gets near the end of a docs page, the next docs
 * entry (in sidebar order) renders below it. The page at the top of the view is sent to the
 * manager with `DOCS_PAGE_IN_VIEW`, so the sidebar and the URL follow it without a new render.
 *
 * On by default. The `docs.infiniteScroll: false` parameter turns it off.
 */
export class InfiniteDocs<TRenderer extends Renderer> {
  private renders: DocsRender<TRenderer>[] = [];

  private container?: HTMLElement;

  private sentinelObserver?: IntersectionObserver;

  private pageObserver?: IntersectionObserver;

  private lastId?: StoryId;

  private inViewId?: StoryId;

  private loading = false;

  constructor(
    private channel: Channel,
    private store: StoryStore<TRenderer>,
    private renderStoryToElement: DocsContextProps<TRenderer>['renderStoryToElement'],
    private callbacks: (id: StoryId) => RenderContextCallbacks<TRenderer>
  ) {}

  /** Starts after the main docs page `entry` rendered into `docsRoot`. */
  start(entry: IndexEntry, docsRoot: HTMLElement) {
    this.stop();
    // Tests and non-browser renders have no IntersectionObserver or a docs root that is not an element.
    if (
      typeof IntersectionObserver === 'undefined' ||
      typeof document === 'undefined' ||
      !docsRoot?.dataset
    ) {
      return;
    }
    if (this.store.projectAnnotations?.parameters?.docs?.infiniteScroll === false) {
      return;
    }

    this.lastId = entry.id;
    this.inViewId = entry.id;
    docsRoot.dataset.docsId = entry.id;

    const container = document.createElement('div');
    container.className = 'fb-infinite-docs';
    const sentinel = document.createElement('div');
    sentinel.className = 'fb-infinite-docs-sentinel';
    sentinel.style.height = '1px';
    container.appendChild(sentinel);
    docsRoot.after(container);
    this.container = container;

    // The page whose top part is in the top half of the view is the page in view.
    this.pageObserver = new IntersectionObserver(
      (records) => {
        for (const record of records) {
          const id = (record.target as HTMLElement).dataset.docsId;
          if (record.isIntersecting && id && id !== this.inViewId) {
            this.inViewId = id;
            this.channel.emit(DOCS_PAGE_IN_VIEW, { storyId: id });
          }
        }
      },
      { rootMargin: '-10% 0px -60% 0px' }
    );
    this.pageObserver.observe(docsRoot);

    // Load the next page when the end of the last page is near.
    this.sentinelObserver = new IntersectionObserver(
      (records) => {
        if (records.some((record) => record.isIntersecting)) {
          this.loadNext();
        }
      },
      { rootMargin: '0px 0px 600px 0px' }
    );
    this.sentinelObserver.observe(sentinel);
  }

  private async loadNext() {
    const { container, lastId } = this;
    if (this.loading || !container || !lastId) {
      return;
    }
    const entry = nextDocsEntry(this.store.storyIndex.entries, lastId);
    if (!entry) {
      this.sentinelObserver?.disconnect();
      return;
    }

    this.loading = true;
    this.lastId = entry.id;
    const element = document.createElement('div');
    element.className = 'fb-infinite-docs-page';
    element.dataset.docsId = entry.id;
    container.insertBefore(element, container.lastChild);

    const render = isMdxEntry(entry)
      ? new MdxDocsRender<TRenderer>(this.channel, this.store, entry, this.callbacks(entry.id))
      : new CsfDocsRender<TRenderer>(this.channel, this.store, entry, this.callbacks(entry.id));
    this.renders.push(render);

    try {
      await render.prepare();
      if (this.container !== container) {
        return;
      }
      await render.renderToElement(
        element as TRenderer['canvasElement'],
        this.renderStoryToElement
      );
      this.pageObserver?.observe(element);
    } catch (err) {
      // A page that does not render ends the scroll; the main page stays.
      this.sentinelObserver?.disconnect();
    } finally {
      this.loading = false;
    }

    // A short page may leave the sentinel in view: load one more.
    const sentinel = container.lastElementChild;
    if (sentinel && sentinel.getBoundingClientRect().top < globalThis.innerHeight + 600) {
      this.loadNext();
    }
  }

  /** Removes the pages below the main page. */
  stop() {
    this.sentinelObserver?.disconnect();
    this.pageObserver?.disconnect();
    this.sentinelObserver = undefined;
    this.pageObserver = undefined;
    for (const render of this.renders) {
      render.teardown({ viewModeChanged: true });
    }
    this.renders = [];
    this.container?.remove();
    this.container = undefined;
    this.lastId = undefined;
    this.inViewId = undefined;
    this.loading = false;
  }
}
