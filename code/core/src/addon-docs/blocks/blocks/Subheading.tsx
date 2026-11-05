import type { FC, PropsWithChildren } from 'react';
import React from 'react';

import { H3 } from '@aussieljk/forkbook/internal/components';

import type { HeadingProps } from './Heading.tsx';
import { slugs } from './Heading.tsx';
import { DocsSluggerContext } from './DocsSluggerContext.ts';
import { HeaderMdx } from './mdx.tsx';
import { withMdxComponentOverride } from './with-mdx-component-override.tsx';

const SubheadingImpl: FC<PropsWithChildren<HeadingProps>> = ({ children, disableAnchor }) => {
  if (disableAnchor || typeof children !== 'string') {
    return <H3>{children}</H3>;
  }
  const slugger = React.useContext(DocsSluggerContext) ?? slugs;
  const tagID = slugger.slug(children.toLowerCase());
  return (
    <HeaderMdx as="h3" id={tagID}>
      {children}
    </HeaderMdx>
  );
};

export const Subheading = withMdxComponentOverride('Subheading', SubheadingImpl);
