/**
 * A report that an addon adds for a story. preview-api re-exports it. It is here because
 * core-events is below preview-api.
 */
export interface Report<T = unknown> {
  type: string;
  version?: number;
  result: T;
  status: 'failed' | 'passed' | 'warning';
}

export interface StoryFinishedPayload {
  storyId: string;
  status: 'error' | 'success';
  reporters: Report[];
}
