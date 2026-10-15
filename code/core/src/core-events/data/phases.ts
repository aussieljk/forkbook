import type { Report } from '@aussieljk/forkbook/preview-api';

export interface StoryFinishedPayload {
  storyId: string;
  status: 'error' | 'success';
  reporters: Report[];
}
