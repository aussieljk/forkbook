import { addons, types } from '@aussieljk/forkbook/manager-api';
import BackgroundPanel from './BackgroundPanel.tsx';
import { ADDON_ID, PANEL_ID, PARAM_KEY } from './constants.ts';

export function registerBackgroundsAddon() {
  addons.register(ADDON_ID, (api) => {
    const channel = addons.getChannel();
    addons.add(PANEL_ID, {
      type: types.PANEL,
      title: 'Backgrounds',
      render: ({ active }) => <BackgroundPanel channel={channel} api={api} active={active} />,
      paramKey: PARAM_KEY,
    });
  });
}
