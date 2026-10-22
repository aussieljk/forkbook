/**
 * ESM replacement for `use-sync-external-store/shim`.
 *
 * Forkbook needs React 18 or later, so React has `useSyncExternalStore`. The package from npm is
 * CommonJS. The manager bundler in a user project reads our dist files as ESM and cannot get named
 * exports from it. The build aliases the shim to this file (see
 * `scripts/build/utils/generate-bundle.ts`).
 */
export { useSyncExternalStore } from 'react';
