import type { Meta, StoryObj } from '../index.ts';
import { ComponentWithError } from './ComponentWithError.tsx';

const meta = {
  title: 'Example/ComponentWithError',
  component: ComponentWithError,
} satisfies Meta<typeof ComponentWithError>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ThrowsError: Story = {};
