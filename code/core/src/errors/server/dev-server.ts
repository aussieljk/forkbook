import { dedent } from 'ts-dedent';
import type { Status, StatusTypeId } from '../../shared/status-store/index.ts';
import { StorybookError } from '../../storybook-error.ts';
import { Category } from './category.ts';

export class StatusTypeIdMismatchError extends StorybookError {
  constructor(
    public data: {
      status: Status;
      typeId: StatusTypeId;
    }
  ) {
    super({
      name: 'StatusTypeIdMismatchError',
      category: Category.CORE_SERVER,
      code: 16,
      message: `Status has typeId "${data.status.typeId}" but was added to store with typeId "${data.typeId}". Full status: ${JSON.stringify(
        data.status,
        null,
        2
      )}`,
    });
  }
}

export class NoFreePortError extends StorybookError {
  constructor(public data: { requestedPort?: number }) {
    super({
      name: 'NoFreePortError',
      category: Category.CORE_SERVER,
      // Note: 17 is taken by OxcParseError in ../oxc-parser/errors.ts
      code: 18,
      message: dedent`
        Unable to find a free port for Forkbook's dev server${data.requestedPort ? ` (requested port: ${data.requestedPort})` : ''}.
        Your environment appears to block Forkbook from listening on network ports.
        If you are running Forkbook in a sandboxed or restricted shell, allow binding to localhost ports and try again.`,
    });
  }
}

export class StorybookDevServerDisconnectedError extends StorybookError {
  constructor(public data: { code?: number; reason?: string } = {}) {
    super({
      name: 'StorybookDevServerDisconnectedError',
      category: Category.CORE_SERVER,
      code: 19,
      message: dedent`
        Forkbook dev server disconnected${data.code ? ` (close code ${data.code}${data.reason ? `: ${data.reason}` : ''})` : ''}.
        Any request that was still in flight has been abandoned.
        Make sure the dev server is still running, then try again.`,
    });
  }
}

export class SavingGlobalSettingsFileError extends StorybookError {
  constructor(public data: { filePath: string; error: Error | unknown }) {
    super({
      name: 'SavingGlobalSettingsFileError',
      category: Category.CORE_SERVER,
      code: 1,
      message: dedent`
        Unable to save global settings file to ${data.filePath}
        ${data.error && `Reason: ${data.error}`}`,
    });
  }
}
