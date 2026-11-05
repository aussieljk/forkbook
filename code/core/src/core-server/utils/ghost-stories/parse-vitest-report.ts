import { analyzeTestResults } from '../../../shared/utils/analyze-test-results.ts';
import type { StoryTestResult } from '../../../shared/utils/test-result-types.ts';
import {
  toStoryTestResult,
  type VitestLikeInput,
} from '../../../shared/utils/to-story-test-result.ts';
import type { TestRunSummary } from './types.ts';

/** The parts of the Vitest JSON reporter output that are read here. */
export interface VitestJsonReport {
  testResults: {
    assertionResults: {
      fullName: string;
      status?: string;
      failureMessages?: string[];
      meta?: { storyId?: string; reports?: VitestLikeInput['reports'] };
    }[];
  }[];
}

/** Transform the Vitest JSON reporter output to our expected format and return a TestRunSummary */
export function parseVitestResults(report: VitestJsonReport): TestRunSummary {
  const storyTestResults: StoryTestResult[] = [];

  for (const testSuite of report.testResults) {
    for (const assertion of testSuite.assertionResults) {
      const result = toStoryTestResult({
        storyId: assertion.meta?.storyId ?? assertion.fullName,
        statusRaw: assertion.status,
        reports: assertion.meta?.reports,
        errors: assertion.failureMessages?.map((message) => ({ stack: message })),
      });

      if (result) {
        storyTestResults.push(result);
      }
    }
  }

  return {
    summary: analyzeTestResults(storyTestResults),
  };
}
