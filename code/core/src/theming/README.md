# Storybook Theming

Storybook Theming holds the Storybook themes: light (normal) and dark, plus `create` to make your own.

`ThemeProvider` gives the theme to `useTheme` and writes it as CSS variables (`--sb-*`, see
`themeToCssVars`) on a wrapper element. Storybook's own components are styled with CSS modules that
read these variables.
