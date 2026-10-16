import { ADDON_ID, PANEL_ID, PARAM_KEY } from '@aussieljk/forkbook/actions';
import { addons, types } from '@aussieljk/forkbook/manager-api';
import ActionLogger from './containers/ActionLogger/index.tsx';

export function register() {
  addons.register(ADDON_ID, (_api) => {
    addons.add(PANEL_ID, {
      type: types.PANEL,
      title: 'Actions',
      render: ({ active }) => <ActionLogger active={active} />,
      paramKey: PARAM_KEY,
    });
  });
}
