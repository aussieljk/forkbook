<center>
  <img src="../docs/media/docspage-hero.png" width="100%" />
</center>

<h1>Storybook Docs for React</h1>

> migration guide: This page documents the method to configure storybook introduced recently in 5.3.0, consult the [migration guide](https://github.com/storybookjs/storybook/blob/next/MIGRATION.md) if you want to migrate to this format of configuring storybook.

Storybook Docs transforms your Storybook stories into world-class component documentation. Storybook Docs for React supports [DocsPage](../docs/docspage.md) for auto-generated docs, and [MDX](../docs/mdx.md) for rich long-form docs.

To learn more about Storybook Docs, read the [general documentation](../README.md). To learn the React specifics, read on!

- [Installation](#installation)
- [DocsPage](#docspage)
- [Props tables](#props-tables)
- [MDX](#mdx)
- [Inline stories](#inline-stories)
- [TypeScript props](#typescript-props)
- [More resources](#more-resources)

## Installation

First add the package. Make sure that the versions for your `@storybook/*` packages match:

```sh
yarn add -D @storybook/addon-docs
```

Then add the following to your `.storybook/main.js` list of `addons`:

```js
export default {
  // other settings
  addons: ['@storybook/addon-docs'];
}
```

## DocsPage

When you [install docs](#installation) you should get basic [DocsPage](../docs/docspage.md) documentation automatically for all your stories, available in the `Docs` tab of the Storybook UI.

## Props tables

Storybook Docs automatically generates [Props tables](../docs/props-tables.md) for your components based on either `PropTypes` or `TypeScript` types. To show the props table for your component, be sure to fill in the `component` field in your story metadata:

```ts
import { Button } from './Button';

export default {
  title: 'Button',
  component: Button,
};
```

## MDX

[MDX](../docs/mdx.md) is a convenient way to document your components in Markdown and embed documentation components, such as stories and props tables, inline.

Then update your `.storybook/main.js` to make sure you load MDX files:

```js
export default {
  stories: ['../src/stories/**/*.stories.@(js|mdx)'],
};
```

Finally, you can create MDX files like this:

```md
import { Meta, Story, ArgsTable } from '@storybook/addon-docs';
import { Button } from './Button';

<Meta title='Button' component={Button} />

# Button

Some **markdown** description, or whatever you want.

<Story name='basic' height='400px'>
  <Button>Label</Button>
</Story>

## ArgsTable

<ArgsTable of={Button} />
```

## Inline stories

Storybook Docs renders all React stories inline by default.

However, you can render stories in an iframe, with a default height of `60px` (configurable using the `docs.story.iframeHeight` story parameter), by using the `docs.stories.inline` parameter.

To do so for all stories, update `.storybook/preview.js`:

```js
export const parameters = { docs: { story: { inline: false } } };
```

## TypeScript props

Storybook reads the props of your components with the TypeScript 7 native compiler (`tsgo`). It reads the prop types, default values and JSDoc comments. You do not need to configure it.

## More resources

Want to learn more? Here are some more articles on Storybook Docs:

- References: [DocsPage](../docs/docspage.md) / [MDX](../docs/mdx.md) / [FAQ](../docs/faq.md) / [Recipes](../docs/recipes.md) / [Theming](../docs/theming.md) / [Props](../docs/props-tables.md)
- Announcements: [Vision](https://medium.com/storybookjs/storybook-docs-sneak-peak-5be78445094a) / [DocsPage](https://medium.com/storybookjs/storybook-docspage-e185bc3622bf) / [MDX](https://medium.com/storybookjs/rich-docs-with-storybook-mdx-61bc145ae7bc) / [Framework support](https://medium.com/storybookjs/storybook-docs-for-new-frameworks-b1f6090ee0ea)
- Example: [Storybook Design System](https://github.com/storybookjs/design-system)
