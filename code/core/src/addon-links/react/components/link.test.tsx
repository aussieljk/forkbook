// @vitest-environment happy-dom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import React from 'react';

import type { Channel } from '@aussieljk/forkbook/internal/channels';
import { SELECT_STORY } from '@aussieljk/forkbook/internal/core-events';

import { addons } from '@aussieljk/forkbook/preview-api';

import LinkTo from './link.tsx';

vi.mock('@aussieljk/forkbook/preview-api');
vi.mock('../../../shared/global.ts', () => ({
  global: {
    document: {
      location: {
        origin: 'origin',
        pathname: 'pathname',
        search: 'search',
      },
    },
  },
}));

const mockChannel = () => {
  return {
    emit: vi.fn(),
    on: vi.fn(),
    once: vi.fn(),
  };
};
const mockAddons = vi.mocked(addons);

describe('LinkTo', () => {
  describe('render', () => {
    afterEach(() => {
      cleanup();
    });
    it('should render a link', async () => {
      const channel = mockChannel() as Partial<Channel> as Channel;
      mockAddons.getChannel.mockReturnValue(channel as Partial<Channel> as Channel);

      const { container } = render(
        <LinkTo title="foo" name="bar">
          link
        </LinkTo>
      );

      await waitFor(() => {
        expect(screen.getByText('link')).toHaveAttribute('href', 'originpathnamefoo/bar');
      });
      expect(container.firstChild).toMatchInlineSnapshot(`
        <a
          href="originpathnamefoo/bar"
        >
          link
        </a>
      `);
    });
  });

  describe('events', () => {
    it('should select the kind and story on click', async () => {
      const channel = {
        emit: vi.fn(),
        on: vi.fn(),
      };
      mockAddons.getChannel.mockReturnValue(channel as Partial<Channel> as Channel);

      await act(async () => {
        await render(
          <LinkTo title="foo" name="bar">
            link
          </LinkTo>
        );
      });

      expect(screen.getByText('link')).toHaveAttribute('href', 'originpathnamefoo/bar');

      await userEvent.click(screen.getByText('link'));

      expect(channel.emit).toHaveBeenLastCalledWith(
        SELECT_STORY,
        expect.objectContaining({
          title: 'foo',
          name: 'bar',
        })
      );
    });
  });
});
