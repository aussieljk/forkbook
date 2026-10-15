export type Framework = (typeof supportedFrameworks)[number];

// TODO: sync this/pull this from core
export const supportedFrameworks = ['nextjs-vite', 'react-vite', 'react-native'] as const;

export const supportedFrameworksPackages = {
  'react-vite': '@aussieljk/forkbook/react-vite',
  'nextjs-vite': '@aussieljk/forkbook/nextjs-vite',
  'react-native': '@storybook/react-native',
} satisfies Record<Framework, string>;

export const supportedFrameworksNames = {
  'react-vite': 'React with Vite',
  'nextjs-vite': 'NextJS with Vite',
  'react-native': 'React Native',
} satisfies Record<Framework, string>;
