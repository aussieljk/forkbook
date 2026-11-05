// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';

import type { Addon_BaseType } from '@aussieljk/forkbook/internal/types';

import * as api from '@aussieljk/forkbook/manager-api';

import { PANEL_ID } from './constants.ts';
import './manager.tsx';

vi.mock('@aussieljk/forkbook/manager-api');
const mockedApi = vi.mocked(api);
mockedApi.useStorybookApi.mockImplementation(
  () => ({ getSelectedPanel: vi.fn() }) as Partial<api.API> as api.API
);
mockedApi.useAddonState.mockReset();
/** The test passes the mocked module where the manager expects the API object. */
const managerApi = api as unknown as api.API;
const mockedAddons = vi.mocked(api.addons);
const registrationImpl = mockedAddons.register.mock.calls[0][1];

const isPanel = (input: Parameters<typeof mockedAddons.add>[1]): input is Addon_BaseType =>
  input.type === api.types.PANEL;
describe('A11yManager', () => {
  it('should register the panels', () => {
    // when
    registrationImpl(managerApi);

    // then
    expect(mockedAddons.add.mock.calls).toHaveLength(2);
    expect(mockedAddons.add).toHaveBeenCalledWith(PANEL_ID, expect.anything());

    const panel = mockedAddons.add.mock.calls
      .map(([_, def]) => def)
      .find(({ type }) => type === api.types.PANEL);
    const tool = mockedAddons.add.mock.calls
      .map(([_, def]) => def)
      .find(({ type }) => type === api.types.TOOL);
    expect(panel).toBeDefined();
    expect(tool).toBeDefined();
  });

  it('should compute title with no issues', () => {
    // given
    mockedApi.useAddonState.mockImplementation(() => [{ results: undefined }, vi.fn()]);
    registrationImpl(managerApi);
    const title = mockedAddons.add.mock.calls.map(([_, def]) => def).find(isPanel)
      ?.title as () => void;

    // when / then
    expect(title()).toMatchInlineSnapshot(`
      <div
        style={
          {
            "alignItems": "center",
            "display": "flex",
            "gap": 6,
          }
        }
      >
        <span>
          Accessibility
        </span>
      </div>
    `);
  });

  it('should compute title with issues', () => {
    // given
    mockedApi.useAddonState.mockImplementation(() => [
      {
        results: {
          violations: [{}],
          incomplete: [{}, {}],
        },
      },
      vi.fn(),
    ]);
    registrationImpl(managerApi);
    const title = mockedAddons.add.mock.calls.map(([_, def]) => def).find(isPanel)
      ?.title as () => void;

    // when / then
    expect(title()).toMatchInlineSnapshot(`
      <div
        style={
          {
            "alignItems": "center",
            "display": "flex",
            "gap": 6,
          }
        }
      >
        <span>
          Accessibility
        </span>
        <Badge
          compact={true}
          status="neutral"
        >
          3
        </Badge>
      </div>
    `);
  });
});
