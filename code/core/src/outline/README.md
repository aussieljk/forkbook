# Forkbook Addon Outline

Forkbook Addon Outline can be used for visually debugging CSS layout and alignment inside the preview in [Forkbook](https://forkbook.ljk.dev). Based on [Pesticide](https://github.com/mrmrs/pesticide), it draws outlines around every single element in the preview pane.

![React Forkbook Screenshot](https://user-images.githubusercontent.com/42671/98158421-dada2300-1ea8-11eb-8619-af1e7018e1ec.png)

## Usage

Requires Forkbook 6.1 or later. Outline is part of [essentials](https://forkbook.ljk.dev/docs/essentials) and so is installed in all new Storybooks by default. If you need to add it to your Forkbook, you can run:

```sh
npm i -D @storybook/addon-outline
```

Then, add following content to [`.forkbook/main.js`](https://forkbook.ljk.dev/docs/configure#configure-your-storybook-project):

```js
export default {
  addons: ['@storybook/addon-outline'],
};
```

You can now click on the outline button or press the <kbd>o</kbd> key in the toolbar to toggle the outlines.
