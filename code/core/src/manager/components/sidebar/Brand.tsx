import React from 'react';

import { StorybookLogo } from '@aussieljk/forkbook/internal/components';

import { useTheme } from '@aussieljk/forkbook/theming';

import styles from './Brand.module.css';

export const Brand = () => {
  const { title = 'Forkbook', url = './', image, target } = useTheme().brand;
  const targetValue = target || (url === './' ? '' : '_blank');

  // When image is explicitly set to null, enable custom HTML support
  if (image === null) {
    if (title === null) {
      return null;
    }

    if (!url) {
      return <div dangerouslySetInnerHTML={{ __html: title }} />;
    }
    return (
      <a
        className={styles.logoLink}
        href={url}
        target={targetValue}
        dangerouslySetInnerHTML={{ __html: title }}
      />
    );
  }

  const logo = image ? (
    <img className={styles.img} src={image} alt={title} />
  ) : (
    <StorybookLogo className={styles.logo} alt={title} />
  );

  if (url) {
    return (
      <a className={styles.logoLink} title={title} href={url} target={targetValue}>
        {logo}
      </a>
    );
  }

  // The wrapper div serves to prevent image misalignment
  return <div>{logo}</div>;
};
