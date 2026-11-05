import type { ReportNode, Visitor } from 'istanbul-lib-report';
import { ReportBase } from 'istanbul-lib-report';

import type { StoreState } from '../types.ts';
import type { TestManager } from './test-manager.ts';

export type ForkbookCoverageReporterOptions = {
  testManager: TestManager;
};

class ForkbookCoverageReporter extends ReportBase implements Partial<Visitor> {
  #testManager: ForkbookCoverageReporterOptions['testManager'];

  constructor(opts: ForkbookCoverageReporterOptions) {
    super();
    this.#testManager = opts.testManager;
  }

  onSummary(node: ReportNode) {
    if (!node.isRoot()) {
      return;
    }
    const rawCoverageSummary = node.getCoverageSummary(false);

    const percentage = Math.round(rawCoverageSummary.data.statements.pct);

    // Fallback to Vitest's default watermarks https://vitest.dev/config/#coverage-watermarks
    const [lowWatermark = 50, highWatermark = 80] =
      this.#testManager.vitestManager.vitest?.config.coverage.watermarks?.statements ?? [];

    const coverageSummary: StoreState['currentRun']['coverageSummary'] = {
      percentage,
      status:
        percentage < lowWatermark
          ? 'negative'
          : percentage < highWatermark
            ? 'warning'
            : 'positive',
    };
    this.#testManager.onCoverageCollected(coverageSummary);
  }
}

export default ForkbookCoverageReporter;

// Vitest 4 load custom coverage reporters with require(name).
export { ForkbookCoverageReporter as 'module.exports' };
