import { typography } from './base.ts';

/** A small CSS reset for Forkbook pages. */
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

/* 1px neutral scrollbars everywhere (panels, docs, code blocks).
   Chrome ignores the ::-webkit-scrollbar rules when scrollbar-width is set,
   so only Firefox gets scrollbar-width. */
@supports (-moz-appearance: none) {
  * {
    scrollbar-width: thin;
    scrollbar-color: rgb(120 120 128 / 0.45) transparent;
  }
}

::-webkit-scrollbar {
  width: 1px;
  height: 1px;
}

::-webkit-scrollbar-track,
::-webkit-scrollbar-corner {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: rgb(120 120 128 / 0.6);
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
 * The reset plus the page styles of the Forkbook manager. It reads the theme from CSS variables, so
 * the variables must be set on `:root` (see `themeToCssVars`).
 */
export const globalCss = /* css */ `
${resetCss}

body {
  font-family: var(--fb-font-base);
  position: fixed;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  color: var(--fb-color-default-text);
  background: var(--fb-background-app);
}

code, pre {
  font-family: var(--fb-font-mono);
}

hr {
  border-top: 1px solid var(--fb-color-border);
}

.fb-sr-only, .fb-hidden-until-focus:not(:focus) {
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

.fb-hidden-until-focus {
  opacity: 0;
  transition: opacity 150ms ease-out;
}

.fb-hidden-until-focus:focus {
  opacity: 1;
}

[data-fb-landmark] {
  position: relative;
}

[data-fb-landmark]:focus-visible {
  outline: none;
}

[data-fb-landmark]:focus-visible::after {
  outline: 2px solid var(--fb-color-primary);
  outline-offset: -2px;
}

[data-fb-landmark]::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
}
`;
