import type { ComponentRef } from 'react';
import { forwardRef } from 'react';
import type { View } from 'react-native';
import type { ButtonProps } from './Button.tsx';
import { Button } from './Button.tsx';

export const IconButton = forwardRef<ComponentRef<typeof View>, ButtonProps>(
  ({ padding = 'small', variant = 'ghost', ...props }, ref) => {
    return <Button padding={padding} variant={variant} ref={ref} {...props} />;
  }
);

IconButton.displayName = 'IconButton';
