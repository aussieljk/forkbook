import type { Meta, StoryObj } from '@aussieljk/forkbook/react-vite';

const Box = ({ label }: { label: string }) => <div>{label}</div>;

const meta = { component: Box, args: { label: 'Box' } } satisfies Meta<typeof Box>;
export default meta;

export const Default: StoryObj<typeof meta> = {};
