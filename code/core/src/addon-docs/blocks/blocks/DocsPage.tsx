import type { FC } from 'react';
import React from 'react';

import { Controls } from './Controls.tsx';
import { Description } from './Description.tsx';
import { Primary } from './Primary.tsx';
import { Stories } from './Stories.tsx';
import { Subtitle } from './Subtitle.tsx';
import { Title } from './Title.tsx';
import { useOf } from './useOf.ts';

export const DocsPage: FC = () => {
  const resolvedOf = useOf('meta', ['meta']);
  const { stories } = resolvedOf.csfFile;
  const isSingleStory = Object.keys(stories).length === 1;

  return (
    <>
      <Title />
      <Subtitle />
      <Description of="meta" />
      {isSingleStory ? <Description of="story" /> : null}
      <Primary />
      <Controls />
      {isSingleStory ? null : <Stories />}
    </>
  );
};
