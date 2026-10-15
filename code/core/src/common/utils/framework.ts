import { SupportedBuilder, SupportedFramework, SupportedRenderer } from 'storybook/internal/types';

export const frameworkToRenderer: Record<
  SupportedFramework | SupportedRenderer,
  SupportedRenderer
> = {
  // frameworks
  [SupportedFramework.NEXTJS_VITE]: SupportedRenderer.REACT,
  [SupportedFramework.REACT_VITE]: SupportedRenderer.REACT,

  // renderers
  [SupportedRenderer.REACT_NATIVE]: SupportedRenderer.REACT_NATIVE,
  [SupportedRenderer.REACT]: SupportedRenderer.REACT,
};

export const frameworkToBuilder: Record<SupportedFramework, SupportedBuilder> = {
  // frameworks
  [SupportedFramework.NEXTJS_VITE]: SupportedBuilder.VITE,
  [SupportedFramework.REACT_VITE]: SupportedBuilder.VITE,
};
