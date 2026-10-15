import type { PresetProperty } from '@aussieljk/forkbook/internal/types';

export const core: PresetProperty<'core'> = {
  builder: import.meta.resolve('@aussieljk/forkbook/builder-vite'),
  renderer: import.meta.resolve('@aussieljk/forkbook/react/preset'),
};
