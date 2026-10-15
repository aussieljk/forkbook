# Storybook Core-server

This package contains common node-side functionality used by the frameworks (React with Vite, Next.js with Vite).

It contains:

- CLI arg parsing
- `storybook dev` dev server
- `storybook build` static builder
- presets handling

The "preview" (aka iframe) side is implemented in `storybook/builder-vite`.
