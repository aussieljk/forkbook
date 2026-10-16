# Forkbook Viewport Addon

Forkbook Viewport Addon allows your stories to be displayed in different sizes and layouts in [Forkbook](https://forkbook.ljk.dev). This helps build responsive components inside of Forkbook.

[Framework Support](https://forkbook.ljk.dev/docs/configure/integration/frameworks-feature-support)

![Screenshot](https://raw.githubusercontent.com/storybookjs/storybook/next/code/addons/viewport/docs/viewport.png)

## Installation

Viewport is part of [essentials](https://forkbook.ljk.dev/docs/essentials) and so is installed in all new Storybooks by default. If you need to add it to your Forkbook, you can run:

```sh
npm i -D @aussieljk/forkbook/viewport
```

Then, add following content to [`.forkbook/main.js`](https://forkbook.ljk.dev/docs/configure#configure-your-storybook-project):

```js
export default {
  addons: ['@aussieljk/forkbook/viewport'],
};
```

You should now be able to see the viewport addon icon in the toolbar at the top of the screen.

## Usage

The usage is documented in the [documentation](https://forkbook.ljk.dev/docs/essentials/viewport).
