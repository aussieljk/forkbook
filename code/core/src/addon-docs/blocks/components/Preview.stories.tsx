import type { ReactNode } from 'react';
import React from 'react';

import { Button } from '@aussieljk/forkbook/internal/components';
import type { Args, DocsContextProps, ModuleExport } from '@aussieljk/forkbook/internal/types';

import * as ButtonStories from '../examples/Button.stories.tsx';
import { Preview, PreviewSkeleton } from './Preview.tsx';
import * as sourceStories from './Source.stories.tsx';
import { Story } from './Story.tsx';

export default {
  component: Preview,
  parameters: {
    relativeCsfPaths: ['../examples/Button.stories'],
  },
};

// The preview sets this global before stories run.
const preview = globalThis.__FORKBOOK_PREVIEW__;
if (!preview) {
  throw new Error('The Forkbook preview is not set up.');
}
const renderStoryToElement = preview.renderStoryToElement.bind(preview);

const getPreparedStory = (docsContext: DocsContextProps, moduleExport: ModuleExport) => {
  return docsContext.resolveOf(moduleExport, ['story']).story;
};

export const Loading = () => <PreviewSkeleton />;

export const CodeCollapsed = () => (
  <Preview inline isExpanded={false} withSource={sourceStories.JSX.args}>
    <Button ariaLabel={false} variant="outline">
      Button 1
    </Button>
  </Preview>
);

export const CodeExpanded = () => (
  <Preview inline isExpanded withSource={sourceStories.JSX.args}>
    <Button ariaLabel={false} variant="outline">
      Button 1
    </Button>
  </Preview>
);

export const CodeError = () => (
  <Preview inline isExpanded withSource={sourceStories.SourceUnavailable.args}>
    <Button ariaLabel={false} variant="outline">
      Button 1
    </Button>
  </Preview>
);

export const IncompleteSnippet = () => (
  <Preview inline isExpanded withSource={sourceStories.IncompleteSnippet.args}>
    <Button ariaLabel={false} variant="outline">
      Button 1
    </Button>
  </Preview>
);

export const ActionBarWrapping = {
  render: () => (
    <Preview inline isExpanded withSource={sourceStories.JSX.args}>
      <Button ariaLabel={false} variant="outline">
        Button with long text
      </Button>
    </Preview>
  ),
  globals: {
    viewport: { value: 'mobile1' },
  },
};

export const Single = () => (
  <Preview inline>
    <Button ariaLabel={false} variant="outline">
      Button 1
    </Button>
  </Preview>
);

export const Row = () => (
  <Preview inline>
    <Button ariaLabel={false} variant="outline">
      Button 1
    </Button>
    <Button ariaLabel={false} variant="outline">
      Button 2
    </Button>
    <Button ariaLabel={false} variant="outline">
      Button 3
    </Button>
    <Button ariaLabel={false} variant="outline">
      Button 4
    </Button>
    <Button ariaLabel={false} variant="outline">
      Button 5
    </Button>
    <Button ariaLabel={false} variant="outline">
      Button 6
    </Button>
    <Button ariaLabel={false} variant="outline">
      Button 7
    </Button>
  </Preview>
);

export const Column = () => (
  <Preview inline isColumn>
    <Button ariaLabel={false} variant="outline">
      Button 1
    </Button>
    <Button ariaLabel={false} variant="outline">
      Button 2
    </Button>
    <Button ariaLabel={false} variant="outline">
      Button 3
    </Button>
  </Preview>
);

export const GridWith3Columns = () => (
  <Preview inline columns={3}>
    <Button ariaLabel={false} variant="outline">
      Button 1
    </Button>
    <Button ariaLabel={false} variant="outline">
      Button 2
    </Button>
    <Button ariaLabel={false} variant="outline">
      Button 3
    </Button>
    <Button ariaLabel={false} variant="outline">
      Button 4
    </Button>
    <Button ariaLabel={false} variant="outline">
      Button 5
    </Button>
    <Button ariaLabel={false} variant="outline">
      Button 6
    </Button>
    <Button ariaLabel={false} variant="outline">
      Button 7 long long long long long{' '}
    </Button>
    <Button ariaLabel={false} variant="outline">
      Button 8
    </Button>
    <Button ariaLabel={false} variant="outline">
      Button 9
    </Button>
    <Button ariaLabel={false} variant="outline">
      Button 10
    </Button>
    <Button ariaLabel={false} variant="outline">
      Button 11
    </Button>
    <Button ariaLabel={false} variant="outline">
      Button 12
    </Button>
    <Button ariaLabel={false} variant="outline">
      Button 13
    </Button>
    <Button ariaLabel={false} variant="outline">
      Button 14
    </Button>
    <Button ariaLabel={false} variant="outline">
      Button 15
    </Button>
    <Button ariaLabel={false} variant="outline">
      Button 16
    </Button>
    <Button ariaLabel={false} variant="outline">
      Button 17
    </Button>
    <Button ariaLabel={false} variant="outline">
      Button 18
    </Button>
    <Button ariaLabel={false} variant="outline">
      Button 19
    </Button>
    <Button ariaLabel={false} variant="outline">
      Button 20
    </Button>
  </Preview>
);

export const WithToolbar = (
  _args: Args,
  { loaded: { docsContext } }: { loaded: { docsContext: DocsContextProps } }
) => (
  <Preview inline withToolbar>
    <Story
      inline
      story={getPreparedStory(docsContext, ButtonStories.Primary)}
      renderStoryToElement={renderStoryToElement}
      autoplay={false}
      forceInitialArgs={false}
      primary={false}
      height="36px"
    />
  </Preview>
);

const Horizontal = ({ children }: { children: ReactNode }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '100px calc(100vw + 100px) 100px' }}>
    {children}
  </div>
);

export const Wide = () => (
  <Preview inline withToolbar>
    <Horizontal>
      <div>START</div>
      <div>middle</div>
      <div>END</div>
    </Horizontal>
  </Preview>
);

export const WithToolbarMulti = (
  _args: Args,
  { loaded: { docsContext } }: { loaded: { docsContext: DocsContextProps } }
) => (
  <Preview inline withToolbar>
    <Story
      inline
      story={getPreparedStory(docsContext, ButtonStories.Primary)}
      renderStoryToElement={renderStoryToElement}
      autoplay={false}
      forceInitialArgs={false}
      primary={false}
      height="36px"
    />
    <Story
      inline
      story={getPreparedStory(docsContext, ButtonStories.Primary)}
      renderStoryToElement={renderStoryToElement}
      autoplay={false}
      forceInitialArgs={false}
      primary={false}
      height="36px"
    />
  </Preview>
);

export const WithFullscreenSingle = (
  _args: Args,
  { loaded: { docsContext } }: { loaded: { docsContext: DocsContextProps } }
) => (
  <Preview inline withToolbar layout="fullscreen">
    <Story
      inline
      story={getPreparedStory(docsContext, ButtonStories.Primary)}
      renderStoryToElement={renderStoryToElement}
      autoplay={false}
      forceInitialArgs={false}
      primary={false}
      height="36px"
    />
  </Preview>
);

export const WithFullscreenMulti = (
  _args: Args,
  { loaded: { docsContext } }: { loaded: { docsContext: DocsContextProps } }
) => (
  <Preview inline withToolbar layout="fullscreen">
    <Story
      inline
      story={getPreparedStory(docsContext, ButtonStories.Primary)}
      renderStoryToElement={renderStoryToElement}
      autoplay={false}
      forceInitialArgs={false}
      primary={false}
      height="36px"
    />
    <Story
      inline
      story={getPreparedStory(docsContext, ButtonStories.Primary)}
      renderStoryToElement={renderStoryToElement}
      autoplay={false}
      forceInitialArgs={false}
      primary={false}
      height="36px"
    />
  </Preview>
);

export const WithCenteredSingle = (
  _args: Args,
  { loaded: { docsContext } }: { loaded: { docsContext: DocsContextProps } }
) => (
  <Preview inline withToolbar layout="centered">
    <Story
      inline
      story={getPreparedStory(docsContext, ButtonStories.Centered)}
      renderStoryToElement={renderStoryToElement}
      autoplay={false}
      forceInitialArgs={false}
      primary={false}
      height="36px"
    />
  </Preview>
);

export const WithCenteredIframe = (
  _args: Args,
  { loaded: { docsContext } }: { loaded: { docsContext: DocsContextProps } }
) => (
  <Preview inline={false} withToolbar layout="centered">
    <Story
      inline={false}
      story={getPreparedStory(docsContext, ButtonStories.Centered)}
      primary={false}
      height="100px"
    />
  </Preview>
);

export const WithCenteredMulti = (
  _args: Args,
  { loaded: { docsContext } }: { loaded: { docsContext: DocsContextProps } }
) => (
  <Preview inline withToolbar layout="centered">
    <Story
      inline
      story={getPreparedStory(docsContext, ButtonStories.Centered)}
      renderStoryToElement={renderStoryToElement}
      autoplay={false}
      forceInitialArgs={false}
      primary={false}
      height="36px"
    />
    <Story
      inline
      story={getPreparedStory(docsContext, ButtonStories.Centered)}
      renderStoryToElement={renderStoryToElement}
      autoplay={false}
      forceInitialArgs={false}
      primary={false}
      height="36px"
    />
  </Preview>
);

export const WithAdditionalActions = () => (
  <Preview
    inline
    additionalActions={[
      {
        title: 'Open on GitHub',
        onClick: () => {
          globalThis.location.href =
            'https://github.com/storybookjs/storybook/blob/next/code/lib/blocks/src/components/Preview.stories.tsx#L165-L186';
        },
      },
    ]}
  >
    <Button ariaLabel={false} variant="outline">
      Button 1
    </Button>
  </Preview>
);

export const SingleSmallViewport = () => (
  <div style={{ width: 320 }}>
    <Preview inline>
      <Button ariaLabel={false} variant="outline">
        Button 1
      </Button>
    </Preview>
  </div>
);
SingleSmallViewport.parameters = {
  chromatic: { viewports: [320] },
};

export const CodeExpandedSmallViewport = () => (
  <div style={{ width: 320 }}>
    <Preview inline isExpanded withSource={sourceStories.JSX.args}>
      <Button ariaLabel={false} variant="outline">
        Button 1
      </Button>
    </Preview>
  </div>
);
CodeExpandedSmallViewport.parameters = {
  chromatic: { viewports: [320] },
};
