/**
 * Vitest reporter that sends test data to OpenTelemetry (SigNoz):
 *
 * - one span for each test file, with its duration and result;
 * - one log record for each failed or flaky test, to track the flake rate;
 * - one `vitest.run` event with the totals.
 *
 * vitest.config.ts and verify.ts add it when OTEL_EXPORTER_OTLP_ENDPOINT is set.
 */
import { relative } from 'node:path';

import { trace } from '@opentelemetry/api';
import type { Reporter, TestCase, TestModule } from 'vitest/node';

import { ROOT_DIRECTORY } from './utils/constants.ts';
import { emitEvent, flushOtel, initOtel } from './utils/otel.ts';

const file = (moduleId: string) => relative(ROOT_DIRECTORY, moduleId);

export default class OtelReporter implements Reporter {
  private totals = { passed: 0, failed: 0, skipped: 0, flaky: 0 };
  private startedAt = Date.now();

  onInit() {
    initOtel('forkbook-tests');
    this.startedAt = Date.now();
  }

  onTestCaseResult(testCase: TestCase) {
    const { state, errors } = testCase.result();
    const { duration, flaky, retryCount } = testCase.diagnostic() ?? {};
    if (state === 'passed') this.totals.passed++;
    if (state === 'failed') this.totals.failed++;
    if (state === 'skipped') this.totals.skipped++;
    if (flaky) this.totals.flaky++;

    if (state === 'failed' || flaky) {
      emitEvent(
        state === 'failed' ? 'test.failed' : 'test.flaky',
        {
          'test.name': testCase.fullName,
          'test.file': file(testCase.module.moduleId),
          'test.project': testCase.project.name,
          'test.duration_ms': Math.round(duration ?? 0),
          'test.retries': retryCount ?? 0,
          ...(errors?.[0] ? { 'test.error': String(errors[0].message).slice(0, 500) } : {}),
        },
        state === 'failed' ? 'ERROR' : 'WARN'
      );
    }
  }

  onTestModuleEnd(testModule: TestModule) {
    const { duration } = testModule.diagnostic();
    const end = Date.now();
    trace
      .getTracer('forkbook-tests')
      .startSpan('test.file', {
        startTime: end - duration,
        attributes: {
          'test.file': file(testModule.moduleId),
          'test.project': testModule.project.name,
          'test.state': testModule.state(),
          'test.duration_ms': Math.round(duration),
        },
      })
      .end(end);
  }

  async onTestRunEnd() {
    emitEvent('vitest.run', {
      'tests.passed': this.totals.passed,
      'tests.failed': this.totals.failed,
      'tests.skipped': this.totals.skipped,
      'tests.flaky': this.totals.flaky,
      'tests.seconds': Math.round((Date.now() - this.startedAt) / 1000),
    });
    await flushOtel();
  }
}
