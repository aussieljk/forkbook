import React from 'react';

export const Link = ({
  href: input = '',
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
  // A Forkbook path such as `/story/<id>` opens that story in the manager. The `_story` URL works
  // when only the story ID is known.
  const isStorybookPath = /^\//.test(input);
  const href = isStorybookPath ? `.${input.replace(/^\/(story|docs)\//, '/_$1/')}` : input;

  const isAnchorUrl = /^#.*/.test(input);
  const target = isAnchorUrl ? '_self' : '_top';

  // eslint-disable-next-line jsx-a11y/anchor-has-content
  return <a href={href} target={target} {...props} />;
};
