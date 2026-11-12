import type { Report } from '@aussieljk/forkbook/internal/core-events';

export type { Report };

export class ReporterAPI {
  reports: Report[] = [];

  async addReport(report: Report) {
    this.reports.push(report);
  }
}
