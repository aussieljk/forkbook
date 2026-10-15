// Maps a Storybook renderer package (as reported by `getFrameworkInfo`'s `renderer` field, e.g.
// `@storybook/react`) to the UI framework runtime packages whose installed versions are relevant
// for telemetry. Keying off the detected renderer — rather than matching the project's declared
// dependencies — keeps monorepos from reporting sibling frameworks.
const RENDERER_RUNTIME_PACKAGES: Record<string, string[]> = {
  '@storybook/react': ['react', 'react-dom'],
  '@storybook/react-native': ['react-native', 'react'],
};

/**
 * @param renderer The renderer package name as reported by `getFrameworkInfo` (e.g.
 *   `@storybook/react`)
 * @returns The runtime package names whose installed versions telemetry should resolve; empty when
 *   the renderer has no separate runtime packages or isn't recognized
 */
export function getRendererPackages(renderer: string | undefined): string[] {
  if (!renderer) {
    return [];
  }
  return RENDERER_RUNTIME_PACKAGES[renderer] ?? [];
}
