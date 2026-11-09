import { withForkbook } from '@aussieljk/forkbook/next';

export default withForkbook(
  { reactStrictMode: true, turbopack: { root: import.meta.dirname } },
  {
    enablePreviewRoute: true,
    // The story graph gets the mock. The app pages keep the real module.
    previewMocks: { resolveAlias: { 'fixture-greeting': './mocks/greeting.js' } },
  }
);
