import { vi } from 'vitest';

// Global mock for @aussieljk/forkbook/internal/node-logger
// This mock must be hoisted to run before any imports
vi.mock('@aussieljk/forkbook/internal/node-logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    log: vi.fn(),
    verbose: vi.fn(),
  },
}));

// Global mock for @aussieljk/forkbook/internal/telemetry
vi.mock('@aussieljk/forkbook/internal/telemetry', () => ({
  telemetry: vi.fn(),
}));
