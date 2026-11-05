/* eslint-disable jsx-a11y/anchor-is-valid */
import React from 'react';

import { expect, within } from '@aussieljk/forkbook/test';

import { ArgsTable, Source } from './index.ts';
import { Markdown as MarkdownComponent } from '../blocks/Markdown.tsx';
import * as markdown from '../blocks/Markdown.stories.tsx';
import { Unstyled } from '../blocks/Unstyled.tsx';
import * as argsTable from './ArgsTable/ArgsTable.stories.tsx';
import { DocsPageWrapper, Subtitle, Title } from './DocsPage.tsx';
import * as Preview from './Preview.stories.tsx';
import * as source from './Source.stories.tsx';

export default {
  component: DocsPageWrapper,
  // The goal of this decorator is to mimic some CSS reset.
  // Like Tailwind CSS or Bulma do, for example.
  decorators: [
    (storyFn: any) => (
      <>
        <style>{'ul, ol { list-style: none; }'}</style>
        {storyFn()}
      </>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
  },
};

export const Loading = () => (
  <DocsPageWrapper>
    <Title>DocsPage</Title>
    <Subtitle>
      What the DocsPage looks like. Meant to be QAed in Canvas tab not in Docs tab.
    </Subtitle>
    <MarkdownComponent {...markdown.Text.args} />
    <Preview.Loading />
    <Source {...source.Loading.args} />
  </DocsPageWrapper>
);

export const WithSubtitle = () => (
  <DocsPageWrapper>
    <Title>DocsPage</Title>
    <Subtitle>
      What the DocsPage looks like. Meant to be QAed in Canvas tab not in Docs tab.
    </Subtitle>
    <MarkdownComponent {...markdown.Text.args} />
    <Preview.Single />
    <ArgsTable {...argsTable.Normal.args} />
    <Source {...source.JSX.args} />
  </DocsPageWrapper>
);

export const NoText = () => (
  <DocsPageWrapper>
    <Title>no text</Title>
    <Preview.Single />
    <ArgsTable {...argsTable.Normal.args} />
    <Source {...source.JSX.args} />
  </DocsPageWrapper>
);

export const Text = () => (
  <DocsPageWrapper>
    <Title>Sensorium</Title>
    <MarkdownComponent {...markdown.Text.args} />
    <Preview.Single />
    <ArgsTable {...argsTable.Normal.args} />
    <Source {...source.JSX.args} />
  </DocsPageWrapper>
);

export const Markdown = () => (
  <DocsPageWrapper>
    <Title>markdown</Title>
    <MarkdownComponent {...markdown.Markdown.args} />
    <Preview.Single />
    <ArgsTable {...argsTable.Normal.args} />
    <Source {...source.JSX.args} />
  </DocsPageWrapper>
);

export const ForwardsLang = {
  name: 'Forwards lang',
  render: () => (
    <DocsPageWrapper lang="de">
      <Title>Sprache</Title>
      <MarkdownComponent {...markdown.Text.args} />
    </DocsPageWrapper>
  ),
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const content = within(canvasElement).getByText('Sprache').closest('.sbdocs-content');
    await expect(content).toHaveAttribute('lang', 'de');
  },
};

export const Html = {
  name: 'HTML',
  render: () => (
    <DocsPageWrapper>
      <h1>Heading 1</h1>
      <h2>Heading 2</h2>
      <a>A tag</a>
      <pre>pre tag</pre>
      <div>
        <div>Div</div>
        <a>Nested A tag</a>
      </div>
      <div style={{ border: '2px solid red' }}>
        <Unstyled>
          <h1>Unstyled content</h1>
          <h2>Heading 2</h2>
          <a>A tag</a>
          <div>
            <div>Div</div>
            <a>Nested A tag</a>
          </div>
        </Unstyled>
      </div>
    </DocsPageWrapper>
  ),
};
