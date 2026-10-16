import * as React from 'react';

import type { Addon_StoryContext } from '@aussieljk/forkbook/internal/types';

import { ImageContext } from 'fb-original/image-context';

export const ImageDecorator = (
  Story: React.FC,
  { parameters }: Addon_StoryContext
): React.ReactNode => {
  if (!parameters.nextjs?.image) {
    return <Story />;
  }

  return (
    <ImageContext.Provider value={parameters.nextjs.image}>
      <Story />
    </ImageContext.Provider>
  );
};
