# 🏁 Getting started with `@mui/material`

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

## 🔤 Import fonts

`@mui/material` requires Google's Roboto and Material Icon fonts to render everything as intended. I'd recommend getting them from [fontsource](https://github.com/fontsource/fontsource) so that they are version locked dependencies that doesn't require a CDN.

These can be imported into your `.forkbook/preview.js` file.

```diff
import { Preview } from '@storybook/your-renderer';

+// Load Material UI fonts
+import '@fontsource/roboto/300.css';
+import '@fontsource/roboto/400.css';
+import '@fontsource/roboto/500.css';
+import '@fontsource/roboto/700.css';
+import '@fontsource/material-icons';

const preview: Preview = {
  parameters: { /* ... */ },
};

export default preview;
```

## 🎨 Provide your theme(s)

While Material UI comes with a default theme that works out of the box. You can create your own theme(s) and provide them to your stories with our `withThemeFromJSXProvider` decorator.

Make the following changes to your `.forkbook/preview.js`:

```diff
-import { Preview } from '@storybook/your-renderer';
+import { Preview, Renderer } from '@storybook/your-renderer';
+import { withThemeFromJSXProvider } from '@aussieljk/forkbook/addon-themes';
+import { CssBaseline, ThemeProvider } from '@mui/material';
+import { lightTheme, darkTheme } from '../src/themes'; // Import your custom theme configs

// Load Roboto fonts
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import '@fontsource/material-icons';

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
+     GlobalStyles: CssBaseline,
+   }),
+ ],
};

export default preview;
```
