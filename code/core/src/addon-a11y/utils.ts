/** `import.meta.env` exists only when Vite or Vitest runs this file. */
type ViteImportMeta = ImportMeta & { env?: Record<string, string | undefined> };

export function getIsVitestStandaloneRun() {
  return (import.meta as ViteImportMeta).env?.VITEST_STORYBOOK === 'false';
}

export function getIsVitestRunning() {
  return (import.meta as ViteImportMeta).env?.MODE === 'test';
}
