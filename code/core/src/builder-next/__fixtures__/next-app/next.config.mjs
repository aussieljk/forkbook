import { withForkbook } from '@aussieljk/forkbook/next';

export default withForkbook(
  { reactStrictMode: true, turbopack: { root: import.meta.dirname } },
  { enablePreviewRoute: true }
);
