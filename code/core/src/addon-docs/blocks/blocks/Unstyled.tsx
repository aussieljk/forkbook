import React from 'react';

import { withMdxComponentOverride } from './with-mdx-component-override';

const UnstyledImpl: React.FC<
  React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>
> = (props) => <div {...props} className="fb-unstyled" />;

export const Unstyled = withMdxComponentOverride('Unstyled', UnstyledImpl);
