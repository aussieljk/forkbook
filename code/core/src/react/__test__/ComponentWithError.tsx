import type { ReactNode } from 'react';

export function ComponentWithError(): ReactNode {
  throw new Error('Error in render');
}
