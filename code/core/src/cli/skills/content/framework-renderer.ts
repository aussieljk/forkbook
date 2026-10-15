// TODO: this is a stupid map to maintain and it's not complete, but we can't easily get the current renderer name
export const frameworkToRendererMap: Record<string, string> = {
  '@storybook/react-vite': '@storybook/react',
  '@storybook/nextjs-vite': '@storybook/react',
};
