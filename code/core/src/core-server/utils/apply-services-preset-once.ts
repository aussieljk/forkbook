import type { Presets } from '@aussieljk/forkbook/internal/types';

declare global {
  var FORKBOOK_SERVICES_PRESET_PROMISE: Promise<void> | undefined;
}

globalThis.FORKBOOK_SERVICES_PRESET_PROMISE = undefined;

/**
 * Applies the 'services' preset, but only once, as the services must not be registered multiple times.
 *
 * This is to ensure that we don't apply the preset multiple times in dev mode, which can lead to issues with the telemetry service and other services that are meant to be singletons.
 */
export async function applyServicesPresetOnce(presets: Presets): Promise<void> {
  return (globalThis.FORKBOOK_SERVICES_PRESET_PROMISE ??= presets.apply('services'));
}

/** Clears the one-shot so a later configuration load can apply the `services` preset again. */
export function resetServicesPresetOnce(): void {
  globalThis.FORKBOOK_SERVICES_PRESET_PROMISE = undefined;
}
