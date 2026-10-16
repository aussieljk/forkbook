import BottomSheet from '@expo/ui/community/bottom-sheet';
import { useTheme } from '@aussieljk/forkbook/internal/react-native-theming';
import {
  forwardRef,
  memo,
  ReactNode,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import { Keyboard, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelectedNode } from './SelectedNodeProvider.tsx';

interface MobileMenuDrawerProps {
  children: ReactNode | ReactNode[];
}

export interface MobileMenuDrawerRef {
  setMobileMenuOpen: (isOpen: boolean) => void;
}

const snapPoints = ['50%', '75%'];

/** The sidebar of the phone: a native iOS sheet (SwiftUI, through @expo/ui). */
export const MobileMenuDrawer = memo(
  forwardRef<MobileMenuDrawerRef, MobileMenuDrawerProps>(({ children }, ref) => {
    const insets = useSafeAreaInsets();
    const theme = useTheme();
    const menuBottomSheetRef = useRef<BottomSheet>(null);
    const { scrollToSelectedNode, scrollRef } = useSelectedNode();
    const shouldScrollOnOpen = useRef(false);

    const handleSheetChange = useCallback(
      (index: number) => {
        if (index >= 0 && shouldScrollOnOpen.current) {
          shouldScrollOnOpen.current = false;
          scrollToSelectedNode();
        }
      },
      [scrollToSelectedNode]
    );

    useImperativeHandle(ref, () => ({
      setMobileMenuOpen: (open: boolean) => {
        if (open) {
          shouldScrollOnOpen.current = true;
          menuBottomSheetRef.current?.snapToIndex(1);
        } else {
          Keyboard.dismiss();
          menuBottomSheetRef.current?.close();
        }
      },
    }));

    const bgColorStyle = useMemo(() => {
      return { backgroundColor: theme.background.content };
    }, [theme.background.content]);

    const contentContainerStyle = useMemo(() => {
      return { paddingBottom: insets.bottom };
    }, [insets.bottom]);

    return (
      <BottomSheet
        ref={menuBottomSheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backgroundStyle={bgColorStyle}
        onChange={handleSheetChange}
      >
        <ScrollView
          ref={scrollRef}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={contentContainerStyle}
        >
          {children}
        </ScrollView>
      </BottomSheet>
    );
  })
);
