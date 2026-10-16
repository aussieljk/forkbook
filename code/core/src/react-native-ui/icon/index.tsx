import { styled, useTheme, type Theme } from '@aussieljk/forkbook/internal/react-native-theming';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import type { FC } from 'react';

export interface IconProps {
  color?: string;
  width?: number | string;
  height?: number | string;
}

/** An icon of the UI: an SF Symbol, in the colour that the caller gives or in the default colour. */
function symbolIcon(name: SFSymbol, size: number, defaultColor: (theme: Theme) => string) {
  const Icon = ({ color, width }: IconProps) => {
    const theme = useTheme();
    return (
      <SymbolView
        name={name}
        size={Number(width ?? size)}
        tintColor={color === 'currentColor' || !color ? defaultColor(theme) : color}
      />
    );
  };
  return Icon;
}

const text = (theme: Theme) => theme.color.defaultText;

export const SearchIcon = symbolIcon('magnifyingglass', 14, (theme) => theme.color.dark);
export const CloseIcon = symbolIcon('xmark.circle', 14, text);
export const MenuIcon = symbolIcon('line.3.horizontal', 14, text);
export const FullscreenIcon = symbolIcon('arrow.up.left.and.arrow.down.right', 14, text);
export const CloseFullscreenIcon = symbolIcon('arrow.down.right.and.arrow.up.left', 14, text);
export const BottomBarToggleIcon = symbolIcon('rectangle.bottomthird.inset.filled', 14, text);
export const ExpandAllIcon = symbolIcon('rectangle.expand.vertical', 14, text);
export const CollapseAllIcon = symbolIcon('rectangle.compress.vertical', 14, text);
export const ComponentIcon = symbolIcon('square.grid.2x2', 12, () => '#029CFD');
export const GroupIcon = symbolIcon('folder', 14, () => '#6F2CAC');
export const StoryIcon = symbolIcon('bookmark', 12, () => '#37D5D3');

const Chevron = symbolIcon('chevron.right', 8, (theme) => theme.textMutedColor);

const CollapseIconWrapper = styled.View<{ isExpanded: boolean }>(({ isExpanded }) => ({
  width: 8,
  height: 8,
  justifyContent: 'center',
  alignItems: 'center',
  transform: isExpanded ? 'rotateZ(90deg)' : 'none',
}));

/** The chevron of a tree node. It points down when the node is open. */
export const CollapseIcon: FC<{ isExpanded: boolean }> = ({ isExpanded }) => (
  <CollapseIconWrapper isExpanded={isExpanded}>
    <Chevron />
  </CollapseIconWrapper>
);
