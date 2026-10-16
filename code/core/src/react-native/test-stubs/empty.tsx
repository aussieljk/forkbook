// Stands in for native modules (safe area, the on-device UI) in the Node tests.
import type { ReactNode } from 'react';

export const SafeAreaProvider = ({ children }: { children?: ReactNode }) => children;
export const useSafeAreaInsets = () => ({ top: 0, bottom: 0, left: 0, right: 0 });
export const FullUI = undefined;
