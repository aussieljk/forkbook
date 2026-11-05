import { NoMatchingExportError } from '@aussieljk/forkbook/internal/server-errors';

export async function buildOrThrow<T>(callback: () => Promise<T>): Promise<T> {
  try {
    return await callback();
  } catch (err) {
    const builderErrors = (err as { errors?: { text?: string }[] }).errors;
    if (builderErrors) {
      const inconsistentVersionsError = builderErrors.find((er) =>
        er.text?.includes('No matching export')
      );

      if (inconsistentVersionsError) {
        throw new NoMatchingExportError({ error: err });
      }
    }

    throw err;
  }
}
