# 🏁 Getting started with `styled-components`

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

## 🎨 Provide your theme(s)

Finally, provide your theme(s) and global styles component to your stories with our `withThemeFromJSXProvider` decorator.

Make the following changes to your `.forkbook/preview.js`:

```diff
-import { Preview } from '@storybook/your-renderer';
+import { Preview, Renderer } from '@storybook/your-renderer';
+import { withThemeFromJSXProvider } from '@aussieljk/forkbook/addon-themes';
+import { ThemeProvider } from 'styled-components';
+import { GlobalStyles, lightTheme, darkTheme } from '../src/themes'; // Import your custom theme configs

const preview: Preview = {
  parameters: { /* ... */ },
+ decorators: [
+   withThemeFromJSXProvider<Renderer>({
+     themes: {
+       light: lightTheme,
+       dark: darkTheme,
+     },
+     defaultTheme: 'light',
+     Provider: ThemeProvider,
+     GlobalStyles: GlobalStyles,
+   }),
+ ],
};

export default preview;
```
