import { expectTypeOf, test } from 'vitest';

import { DEFAULT_BACKGROUNDS } from '@aussieljk/forkbook/backgrounds';
import type { Background, BackgroundMap } from '@aussieljk/forkbook/backgrounds';

test('accepts built-in and custom background maps', () => {
  expectTypeOf<BackgroundMap>().toEqualTypeOf<Record<string, Background>>();

  expectTypeOf(DEFAULT_BACKGROUNDS).toEqualTypeOf<BackgroundMap>();

  const customBackgrounds = {
    light: { name: 'Light', value: '#ffffff' },
    dark: { name: 'Dark', value: '#1a1a1a' },
  } satisfies BackgroundMap;

  expectTypeOf(customBackgrounds.light).toExtend<Background>();
});
