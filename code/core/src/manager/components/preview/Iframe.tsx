import type { IframeHTMLAttributes } from 'react';
import React from 'react';

import { Zoom } from 'storybook/internal/components';

import { clsx } from 'clsx';

import styles from './Iframe.module.css';

export interface IFrameProps {
  id: string;
  title: string;
  src: string;
  allowFullScreen: boolean;
  scale: number;
  active: boolean;
}

export function IFrame(props: IFrameProps & IframeHTMLAttributes<HTMLIFrameElement>) {
  const { active, id, title, src, allowFullScreen, scale, className, ...rest } = props;
  const iFrameRef = React.useRef<HTMLIFrameElement>(null);
  return (
    <Zoom.IFrame scale={scale} active={active} iFrameRef={iFrameRef}>
      <iframe
        className={clsx(styles.iframe, className)}
        data-is-storybook={active ? 'true' : 'false'}
        onLoad={(e) => e.currentTarget.setAttribute('data-is-loaded', 'true')}
        id={id}
        title={title}
        src={src}
        allow="clipboard-write;"
        allowFullScreen={allowFullScreen}
        ref={iFrameRef}
        {...rest}
      />
    </Zoom.IFrame>
  );
}
