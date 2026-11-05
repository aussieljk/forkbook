import type { ForwardRefExoticComponent, RefAttributes } from 'react';
import { forwardRef } from 'react';
import type { ButtonProps, ButtonRef } from './Button.tsx';
import { Button } from './Button.tsx';

export const IconButton: ForwardRefExoticComponent<ButtonProps & RefAttributes<ButtonRef>> =
  forwardRef<ButtonRef, ButtonProps>(({ padding = 'small', variant = 'ghost', ...props }, ref) => {
    return <Button padding={padding} variant={variant} ref={ref} {...props} />;
  });

IconButton.displayName = 'IconButton';
