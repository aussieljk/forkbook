import { describe, expect, it, vi } from 'vitest';

import {
  PREVIEW_INITIALIZED,
  SIDEBAR_FILTER_CHANGED,
} from '@aussieljk/forkbook/internal/core-events';

import { REVIEW_EVENTS } from '../../shared/review/events.ts';
import { initTelemetryChannel } from './telemetry-channel.ts';

vi.mock('@aussieljk/forkbook/internal/telemetry', () => ({
  telemetry: vi.fn(),
}));

const { telemetry } = await import('@aussieljk/forkbook/internal/telemetry');

describe('telemetry-channel', () => {
  it('sends preview-first-load only once', () => {
    const listeners: Record<string, Function> = {};
    const channel = {
      on: (event: string, listener: Function) => {
        listeners[event] = listener;
      },
    } as any;

    initTelemetryChannel(channel);
    listeners[PREVIEW_INITIALIZED]({ userAgent: 'Mozilla/5.0' });
    listeners[PREVIEW_INITIALIZED]({ userAgent: 'Mozilla/5.0' });

    expect(telemetry).toHaveBeenCalledTimes(1);
    expect(telemetry).toHaveBeenCalledWith('preview-first-load', { userAgent: 'Mozilla/5.0' });
  });

  describe('SIDEBAR_FILTER_CHANGED', () => {
    it('forwards sidebar-filter event to telemetry', () => {
      const listeners: Record<string, Function> = {};
      const channel = {
        on: (event: string, listener: Function) => {
          listeners[event] = listener;
        },
      } as any;

      initTelemetryChannel(channel);

      const payload = {
        trigger: 'interaction' as const,
        changed: {
          filterType: 'status' as const,
          filterId: 'status-value:new',
          action: 'include' as const,
        },
        activeTagFilters: { included: [], excluded: [] },
        activeStatusFilters: { included: ['status-value:new'], excluded: [] },
        storyCounts: { 'status-value:new': 3 },
      };

      listeners[SIDEBAR_FILTER_CHANGED](payload);
      expect(telemetry).toHaveBeenCalledWith('sidebar-filter', payload);
    });
  });

  describe('REVIEW_EVENTS.PAGEVIEW', () => {
    it('forwards review summary pageview to telemetry', () => {
      const listeners: Record<string, Function> = {};
      const channel = {
        on: (event: string, listener: Function) => {
          listeners[event] = listener;
        },
      } as any;

      initTelemetryChannel(channel);

      listeners[REVIEW_EVENTS.PAGEVIEW]({ page: 'summary', reviewCreatedAt: 1700000000000 });
      expect(telemetry).toHaveBeenCalledWith('review', {
        action: 'pageview',
        source: 'mcp-review',
        page: 'summary',
        reviewCreatedAt: 1700000000000,
      });
    });

    it('forwards review detail pageview to telemetry', () => {
      const listeners: Record<string, Function> = {};
      const channel = {
        on: (event: string, listener: Function) => {
          listeners[event] = listener;
        },
      } as any;

      initTelemetryChannel(channel);

      listeners[REVIEW_EVENTS.PAGEVIEW]({ page: 'detail', reviewCreatedAt: 1700000000000 });
      expect(telemetry).toHaveBeenCalledWith('review', {
        action: 'pageview',
        source: 'mcp-review',
        page: 'detail',
        reviewCreatedAt: 1700000000000,
      });
    });
  });
});
