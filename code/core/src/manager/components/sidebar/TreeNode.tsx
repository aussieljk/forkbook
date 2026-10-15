import type { ComponentProps, CSSProperties, FC } from 'react';
import React from 'react';

import { clsx } from 'clsx';

import { UseSymbol } from './IconSymbols.tsx';
import { CollapseIcon } from './components/CollapseIcon.tsx';
import styles from './TreeNode.module.css';

type IconType = 'component' | 'story' | 'test' | 'group' | 'document' | 'heading';

export const TypeIcon = ({
  type,
  className,
  ...props
}: ComponentProps<'svg'> & { type: IconType }) => (
  <svg className={clsx(styles.typeIcon, className)} data-type={type} {...props} />
);

interface BranchNodeProps extends ComponentProps<'button'> {
  depth?: number;
  isExpandable?: boolean;
  isExpanded?: boolean;
  isSelected?: boolean;
}

interface LeafNodeProps extends ComponentProps<'a'> {
  depth?: number;
}

/** The indentation comes from the depth, through a CSS variable. */
const nodeProps = (depth = 0, className?: string, style?: CSSProperties) => ({
  className: clsx(styles.node, className),
  style: { '--sb-depth': depth, ...style } as CSSProperties,
});

const BranchNode = ({
  depth,
  isExpandable = false,
  className,
  style,
  ...props
}: Omit<BranchNodeProps, 'isExpanded' | 'isSelected'>) => (
  <button
    data-expandable={isExpandable || undefined}
    tabIndex={-1}
    {...nodeProps(depth, className, style)}
    {...props}
  />
);

const LeafNode = ({ depth, className, style, ...props }: LeafNodeProps) => (
  <a tabIndex={-1} rel="canonical" {...nodeProps(depth, className, style)} {...props} />
);

export const RootNode = ({ className, ...props }: ComponentProps<'div'>) => (
  <div className={clsx(styles.rootNode, className)} {...props} />
);

const Icons = ({
  type,
  size,
  isExpandable = false,
  isExpanded = false,
}: {
  type: 'component' | 'story' | 'test' | 'group' | 'document';
  size: string;
  isExpandable?: boolean;
  isExpanded?: boolean;
}) => (
  <div className={styles.wrapper}>
    {isExpandable && <CollapseIcon isExpanded={isExpanded} />}
    <TypeIcon viewBox="0 0 14 14" width={size} height={size} type={type}>
      <UseSymbol type={type} />
    </TypeIcon>
  </div>
);

export const GroupNode: FC<BranchNodeProps> = React.memo(function GroupNode({
  children,
  isExpanded = false,
  isExpandable = false,
  isSelected,
  ...props
}) {
  return (
    <BranchNode isExpandable={isExpandable} {...props}>
      <Icons type="group" size="14" isExpandable={isExpandable} isExpanded={isExpanded} />
      {children}
    </BranchNode>
  );
});

export const ComponentNode: FC<BranchNodeProps> = React.memo(function ComponentNode({
  children,
  isExpanded = false,
  isExpandable = false,
  isSelected,
  ...props
}) {
  return (
    <BranchNode isExpandable={isExpandable} {...props}>
      <Icons type="component" size="12" isExpandable={isExpandable} isExpanded={isExpanded} />
      {children}
    </BranchNode>
  );
});

export const DocumentNode: FC<LeafNodeProps & { docsMode?: boolean }> = React.memo(
  function DocumentNode({ children, docsMode, ...props }) {
    return (
      <LeafNode {...props}>
        <Icons type="document" size="12" />
        {children}
      </LeafNode>
    );
  }
);

export const StoryBranchNode: FC<BranchNodeProps> = React.memo(function StoryNode({
  children,
  isExpandable = false,
  isExpanded = false,
  isSelected,
  ...props
}) {
  return (
    <BranchNode isExpandable={isExpandable} {...props}>
      <Icons type="story" size="12" isExpandable={isExpandable} isExpanded={isExpanded} />
      {children}
    </BranchNode>
  );
});

export const StoryLeafNode: FC<LeafNodeProps> = React.memo(function StoryNode({
  children,
  ...props
}) {
  return (
    <LeafNode {...props}>
      <Icons type="story" size="12" />
      {children}
    </LeafNode>
  );
});

export const TestNode: FC<LeafNodeProps> = React.memo(function TestNode({ children, ...props }) {
  return (
    <LeafNode {...props}>
      <Icons type="test" size="12" />
      {children}
    </LeafNode>
  );
});
