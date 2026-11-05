import type { SerializedError } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TestCase, TestModule, Vitest } from 'vitest/node';

import { AgentTelemetryReporter } from './agent-telemetry-reporter.ts';

vi.mock('@aussieljk/forkbook/internal/telemetry', () => ({
  telemetry: vi.fn(),
  isExampleStoryId: vi.fn(
    (id: string) =>
      id.startsWith('example-button--') ||
      id.startsWith('example-header--') ||
      id.startsWith('example-page--')
  ),
}));

vi.mock('./agent-story-history-cache.ts', () => ({
  mergeAndWriteStoryHistory: vi.fn(async (results) => results),
}));

const { telemetry } = await import('@aussieljk/forkbook/internal/telemetry');
const { mergeAndWriteStoryHistory } = await import('./agent-story-history-cache.ts');

function createMockTestCase({
  storyId,
  status,
  reports = [],
  errors = [],
}: {
  storyId?: string;
  status: 'passed' | 'failed' | 'pending';
  reports?: Array<{ type: string; result?: Record<string, unknown> }>;
  errors?: Array<{ message: string; stack?: string }>;
}) {
  const testCase = {
    meta: () => ({ storyId, reports }),
    result: () => ({
      state: status,
      errors: status === 'failed' ? errors : [],
    }),
  };
  // A test case with only the methods that the reporter reads.
  return testCase as unknown as TestCase;
}

function createMockTestModules(testCounts: { passed: number; failed: number }) {
  const tests: Array<{ result: () => { state: string } }> = [];
  for (let i = 0; i < testCounts.passed; i++) {
    tests.push({ result: () => ({ state: 'passed' }) });
  }
  for (let i = 0; i < testCounts.failed; i++) {
    tests.push({ result: () => ({ state: 'failed' }) });
  }
  return [
    {
      children: {
        allTests: function* (filter?: string) {
          for (const t of tests) {
            if (!filter || t.result().state === filter) {
              yield t;
            }
          }
        },
      },
      errors: () => [],
    },
  ] as unknown as TestModule[];
}

/** The Vitest context with only the config that the reporter reads. */
const mockVitest = (config: { watch: boolean }) => ({ config }) as unknown as Vitest;

describe('AgentTelemetryReporter', () => {
  let reporter: AgentTelemetryReporter;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(mergeAndWriteStoryHistory).mockImplementation(async (results) => results);
    reporter = new AgentTelemetryReporter({
      configDir: '.forkbook',
      agent: { name: 'claude' },
    });
  });

  describe('onTestCaseResult', () => {
    it('should collect story test results', () => {
      const testCase = createMockTestCase({
        storyId: 'my-story--primary',
        status: 'passed',
      });
      reporter.onTestCaseResult(testCase);
    });

    it('should skip tests without storyId', () => {
      const testCase = createMockTestCase({
        storyId: undefined,
        status: 'passed',
      });
      reporter.onTestCaseResult(testCase);
    });

    it('should skip example story IDs', () => {
      const testCase = createMockTestCase({
        storyId: 'example-button--primary',
        status: 'passed',
      });
      reporter.onTestCaseResult(testCase);
    });
  });

  describe('onTestRunEnd', () => {
    it('should send telemetry with run analysis of collected results', async () => {
      reporter.onInit(mockVitest({ watch: false }));

      reporter.onTestCaseResult(createMockTestCase({ storyId: 's1', status: 'passed' }));
      reporter.onTestCaseResult(
        createMockTestCase({
          storyId: 's2',
          status: 'failed',
          errors: [{ message: 'Error: Module not found: foo' }],
        })
      );
      reporter.onTestCaseResult(
        createMockTestCase({
          storyId: 's3',
          status: 'passed',
          reports: [{ type: 'render-analysis', result: { emptyRender: true } }],
        })
      );

      await reporter.onTestRunEnd(createMockTestModules({ passed: 2, failed: 1 }), []);

      expect(telemetry).toHaveBeenCalledWith(
        'ai-setup-self-healing-scoring',
        expect.objectContaining({
          agent: { name: 'claude' },
          analysis: expect.objectContaining({
            total: 3,
            passed: 2,
            passedButEmptyRender: 1,
            successRate: 0.67,
            successRateWithoutEmptyRender: 0.33,
            uniqueErrorCount: 1,
          }),
          unhandledErrorCount: 0,
          watch: false,
        })
      );
    });

    it('should include cumulative stats merged from cache history', async () => {
      reporter.onInit(mockVitest({ watch: false }));

      // Current run: 1 failed story
      reporter.onTestCaseResult(
        createMockTestCase({
          storyId: 'current-run',
          status: 'failed',
          errors: [{ message: 'boom' }],
        })
      );

      // Cumulative cache returns history with previously-passing stories on top
      vi.mocked(mergeAndWriteStoryHistory).mockResolvedValueOnce([
        { storyId: 'current-run', status: 'FAIL', error: 'boom', stack: undefined },
        { storyId: 'previous-1', status: 'PASS' },
        { storyId: 'previous-2', status: 'PASS' },
      ]);

      await reporter.onTestRunEnd(createMockTestModules({ passed: 0, failed: 1 }), []);

      expect(telemetry).toHaveBeenCalledWith(
        'ai-setup-self-healing-scoring',
        expect.objectContaining({
          analysis: expect.objectContaining({
            total: 1,
            passed: 0,
            cumulativeTotal: 3,
            cumulativePassed: 2,
          }),
        })
      );
    });

    it('should pass collected results to mergeAndWriteStoryHistory', async () => {
      reporter.onInit(mockVitest({ watch: false }));

      reporter.onTestCaseResult(createMockTestCase({ storyId: 's1', status: 'passed' }));

      await reporter.onTestRunEnd(createMockTestModules({ passed: 1, failed: 0 }), []);

      expect(mergeAndWriteStoryHistory).toHaveBeenCalledWith([
        expect.objectContaining({ storyId: 's1', status: 'PASS' }),
      ]);
    });

    it('should not include storyId in the telemetry payload', async () => {
      reporter.onInit(mockVitest({ watch: false }));

      reporter.onTestCaseResult(
        createMockTestCase({ storyId: 'my-secret-story-id', status: 'passed' })
      );

      await reporter.onTestRunEnd(createMockTestModules({ passed: 1, failed: 0 }), []);

      const payload = JSON.stringify(vi.mocked(telemetry).mock.calls[0][1]);
      expect(payload).not.toContain('my-secret-story-id');
    });

    it('should filter out example stories from analysis', async () => {
      reporter.onInit(mockVitest({ watch: false }));

      reporter.onTestCaseResult(
        createMockTestCase({ storyId: 'my-story--primary', status: 'passed' })
      );
      reporter.onTestCaseResult(
        createMockTestCase({ storyId: 'example-button--primary', status: 'passed' })
      );

      await reporter.onTestRunEnd(createMockTestModules({ passed: 2, failed: 0 }), []);

      expect(telemetry).toHaveBeenCalledWith(
        'ai-setup-self-healing-scoring',
        expect.objectContaining({
          analysis: expect.objectContaining({
            total: 1,
            passed: 1,
          }),
        })
      );
    });

    it('should count unhandled errors', async () => {
      reporter.onInit(mockVitest({ watch: false }));

      await reporter.onTestRunEnd(createMockTestModules({ passed: 0, failed: 0 }), [
        { message: 'unhandled' },
        { message: 'another' },
      ] as SerializedError[]);

      expect(telemetry).toHaveBeenCalledWith(
        'ai-setup-self-healing-scoring',
        expect.objectContaining({
          unhandledErrorCount: 2,
        })
      );
    });

    it('should reset collected results after each run', async () => {
      reporter.onInit(mockVitest({ watch: false }));

      reporter.onTestCaseResult(createMockTestCase({ storyId: 's1', status: 'passed' }));
      await reporter.onTestRunEnd(createMockTestModules({ passed: 1, failed: 0 }), []);

      reporter.onTestCaseResult(
        createMockTestCase({
          storyId: 's2',
          status: 'failed',
          errors: [{ message: 'err' }],
        })
      );
      await reporter.onTestRunEnd(createMockTestModules({ passed: 0, failed: 1 }), []);

      const secondCall = vi.mocked(telemetry).mock.calls[1];
      expect(secondCall[1]).toEqual(
        expect.objectContaining({
          analysis: expect.objectContaining({
            total: 1,
            passed: 0,
          }),
        })
      );
    });
  });
});
