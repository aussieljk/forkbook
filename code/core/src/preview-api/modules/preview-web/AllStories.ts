import { logger } from '@aussieljk/forkbook/internal/client-logger';
import type {
  PreparedStory,
  RenderContextCallbacks,
  Renderer,
  StoryRenderOptions,
} from '@aussieljk/forkbook/internal/types';

import { groupEntriesByComponent } from '../../../shared/story-grid.ts';
import type { StoryStore } from '../store/index.ts';

/** The preview URL parameter that shows all stories in one page: `iframe.html?allStories=true`. */
export const ALL_STORIES_PARAM = 'allStories';

/** True when the preview URL asks for all stories in one page. */
export const isAllStoriesMode = ({ search }: { search: string }) =>
  new URLSearchParams(search).get(ALL_STORIES_PARAM) === 'true';

type RenderStoryToElement<TRenderer extends Renderer> = (
  story: PreparedStory<TRenderer>,
  element: TRenderer['canvasElement'],
  callbacks: RenderContextCallbacks<TRenderer>,
  options: StoryRenderOptions
) => () => Promise<void>;

const callbacks = {
  showStoryDuringRender: () => {},
  showMain: () => {},
  showError: ({ title }: { title: string }) => logger.error(title),
  showException: (err: Error) => logger.error(err),
};

/**
 * Renders every story of the index into one element, grouped by component. The manager shows this
 * page on `/all` in "one frame" mode, so it needs one preview, not one preview for each story.
 */
export class AllStories<TRenderer extends Renderer> {
  private teardowns: (() => Promise<void>)[] = [];

  constructor(
    private store: StoryStore<TRenderer>,
    private renderStoryToElement: RenderStoryToElement<TRenderer>
  ) {}

  async render(root: HTMLElement) {
    await this.stop();
    root.replaceChildren();
    const doc = root.ownerDocument;
    const components = groupEntriesByComponent(Object.values(this.store.storyIndex.entries));
    for (const component of components) {
      if (component.storyIds.length === 0) {
        continue;
      }
      const section = doc.createElement('section');
      section.className = 'fb-all-stories-component';
      section.style.padding = '16px 24px';
      const heading = doc.createElement('h2');
      heading.textContent = component.title;
      section.appendChild(heading);
      root.appendChild(section);

      for (const storyId of component.storyIds) {
        const entry = this.store.storyIndex.entries[storyId];
        const block = doc.createElement('div');
        block.className = 'fb-all-stories-story';
        block.dataset.storyId = storyId;
        block.style.margin = '12px 0 24px';
        const name = doc.createElement('h3');
        name.textContent = entry?.name ?? storyId;
        const canvas = doc.createElement('div');
        block.append(name, canvas);
        section.appendChild(block);
        try {
          const story = await this.store.loadStory({ storyId });
          this.teardowns.push(
            this.renderStoryToElement(story, canvas as TRenderer['canvasElement'], callbacks, {
              autoplay: true,
              forceInitialArgs: false,
            })
          );
        } catch (err) {
          canvas.textContent = `Could not render this story: ${(err as Error).message}`;
          logger.error(err);
        }
      }
    }
  }

  async stop() {
    await Promise.all(this.teardowns.splice(0).map((teardown) => teardown()));
  }
}
