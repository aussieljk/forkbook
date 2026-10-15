import { typography } from './base.ts';

/** A small CSS reset for Storybook pages. */
export const resetCss = /* css */ `
body {
  font-family: ${typography.fonts.base};
  font-size: ${typography.size.s3}px;
  margin: 0;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  -webkit-tap-highlight-color: rgba(0, 0, 0, 0);
  -webkit-overflow-scrolling: touch;
}

* {
  box-sizing: border-box;
}

h1, h2, h3, h4, h5, h6 {
  font-weight: ${typography.weight.regular};
  margin: 0;
  padding: 0;
}

button, input, textarea, select {
  font-family: inherit;
  font-size: inherit;
  box-sizing: border-box;
}

sub {
  font-size: 0.8em;
  bottom: -0.2em;
}

sup {
  font-size: 0.8em;
  top: -0.2em;
}

b, strong {
  font-weight: ${typography.weight.bold};
}

hr {
  border: none;
  border-top: 1px solid silver;
  clear: both;
  margin-bottom: 1.25rem;
}

code {
  font-family: ${typography.fonts.mono};
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  display: inline-block;
  padding-left: 2px;
  padding-right: 2px;
  vertical-align: baseline;
  color: inherit;
}

pre {
  font-family: ${typography.fonts.mono};
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  line-height: 18px;
  padding: 11px 1rem;
  white-space: pre-wrap;
  color: inherit;
  border-radius: 3px;
  margin: 1rem 0;
}
`;

/**
 * The reset plus the page styles of the Storybook manager. It reads the theme from CSS variables, so
 * the variables must be set on `:root` (see `themeToCssVars`).
 */
export const globalCss = /* css */ `
${resetCss}

body {
  font-family: var(--sb-font-base);
  position: fixed;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  color: var(--sb-color-default-text);
  background: var(--sb-background-app);
}

code, pre {
  font-family: var(--sb-font-mono);
}

hr {
  border-top: 1px solid var(--sb-color-border);
}

.sb-sr-only, .sb-hidden-until-focus:not(:focus) {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  white-space: nowrap;
  clip: rect(0, 0, 0, 0);
  clip-path: inset(50%);
  border: 0;
}

.sb-hidden-until-focus {
  opacity: 0;
  transition: opacity 150ms ease-out;
}

.sb-hidden-until-focus:focus {
  opacity: 1;
}

[data-sb-landmark] {
  position: relative;
}

[data-sb-landmark]:focus-visible {
  outline: none;
}

[data-sb-landmark]:focus-visible::after {
  outline: 2px solid var(--sb-color-primary);
  outline-offset: -2px;
}

[data-sb-landmark]::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
}
`;
