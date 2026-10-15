# 🏁 Getting started with `tailwind.css`

## 📦 Install addon

To get started, **install the package** as a dev dependency.

yarn:

```zsh
yarn add -D @aussieljk/forkbook/addon-themes
```

npm:

```zsh
npm install -D @aussieljk/forkbook/addon-themes
```

pnpm:

```zsh
pnpm add -D @aussieljk/forkbook/addon-themes
```

## 🧩 Register Addon

Now, **include the addon** in your `.forkbook/main.js` file.

```diff
export default {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: [
    '@storybook/addon-essentials',
+   '@aussieljk/forkbook/addon-themes',
  ],
};
```

## 🥾 Import your CSS

To give your stories access to Tailwind styles, import them into your `.forkbook/preview.js` file.

```diff
import { Preview } from '@storybook/your-renderer';

+import '../src/index.css';

const preview: Preview = {
  parameters: { /* ... */ },
};

export default preview;
```

## 🎨 Provide your theme(s)

Tailwind supports light and dark color modes out of the box. These modes can be activated by setting a `.dark` class on a parent element.

To enable switching between these modes in a click for your stories, use our `withThemeByClassName` decorator by adding the following code to your `.forkbook/preview.js` file.

```diff
-import { Preview } from '@storybook/your-renderer';
+import { Preview, Renderer } from '@storybook/your-renderer';
+import { withThemeByClassName } from '@aussieljk/forkbook/addon-themes';

import '../src/index.css';


const preview: Preview = {
  parameters: { /* ... */ },
+ decorators: [
+  withThemeByClassName<Renderer>({
+    themes: {
+      light: '',
+      dark: 'dark',
+    },
+    defaultTheme: 'light',
+  }),
+ ]
};

export default preview;
```

## 🏷️ Using a data-attribute for theme?

If you've configured Tailwind to toggle themes with a data attribute, use our `withThemeByDataAttribute` decorator by adding the following code to your `.forkbook/preview.js` file.

```diff
-import { Preview } from '@storybook/your-renderer';
+import { Preview, Renderer } from '@storybook/your-renderer';
+import { withThemeByDataAttribute } from '@aussieljk/forkbook/addon-themes';

import '../src/index.css';


const preview: Preview = {
  parameters: { /* ... */ },
+ decorators: [
+  withThemeByDataAttribute<Renderer>({
+    themes: {
+      light: 'light',
+      dark: 'dark',
+    },
+    defaultTheme: 'light',
+    attributeName: 'data-theme',
+  }),
+ ]
};

export default preview;
```
