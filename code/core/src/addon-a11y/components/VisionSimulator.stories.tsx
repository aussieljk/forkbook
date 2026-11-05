import type { ComponentProps, ComponentType } from 'react';
import type { PlayFunction, PlayFunctionContext } from '@aussieljk/forkbook/internal/types';

import { ManagerContext } from '@aussieljk/forkbook/manager-api';
import { expect, fn, screen } from '@aussieljk/forkbook/test';

import preview from '../../../../.forkbook/preview.tsx';
import { VisionSimulator } from './VisionSimulator.tsx';

/** A manager context with only the state and API that the component uses. */
const asManagerContext = (value: object) =>
  value as ComponentProps<typeof ManagerContext.Provider>['value'];

const managerContext = asManagerContext({
  state: {},
  api: {
    getGlobals: fn(() => ({ vision: undefined })),
    updateGlobals: fn(),
    getStoryGlobals: fn(() => ({ vision: undefined })),
    getUserGlobals: fn(() => ({ vision: undefined })),
  },
});

const meta = preview.meta({
  title: 'Vision Simulator',
  component: VisionSimulator,
  decorators: [
    (Story: ComponentType) => (
      <ManagerContext.Provider value={managerContext}>
        <Story />
      </ManagerContext.Provider>
    ),
  ],
});

export default meta;

const openMenu: PlayFunction = async ({ canvas, userEvent }) => {
  await userEvent.click(canvas.getByRole('button', { name: 'Vision filter' }));
};

export const Default = meta.story({
  play: openMenu,
});

export const WithFilter = meta.story({
  play: openMenu,
  globals: {
    vision: 'achromatopsia',
  },
});

export const Selection = meta.story({
  play: async (context) => {
    await openMenu(context);
    await context.userEvent.click(await screen.findByText('Blurred vision'));
    await expect(managerContext.api.updateGlobals).toHaveBeenCalledWith({ vision: 'blurred' });
    await expect(
      context.canvas.getByRole('button', { name: 'Vision filter Blurred vision' })
    ).toBeVisible();
  },
});
