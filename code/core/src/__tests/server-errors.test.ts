import { describe, expect, it } from 'vitest';

import {
  OpenServiceRemoteCommandConfigDriftError,
  OpenServiceRemoteCommandUnhandledError,
} from '../server-errors.ts';

describe('OpenServiceRemoteCommandConfigDriftError', () => {
  it('reports the missing handler and scopes the restart guidance to the attached instance', () => {
    const error = new OpenServiceRemoteCommandConfigDriftError({
      serviceId: 'core/docgen',
      commandName: 'extractAllDocgen',
    });

    expect(error.message).toBe(
      'The Forkbook this runtime is attached to reported it has no handler for remote command "core/docgen.extractAllDocgen". The two processes are running different configurations (for example a feature flag enabled in one but not the other). Restart the attached Forkbook with a configuration matching this process.'
    );
  });
});

describe('OpenServiceRemoteCommandUnhandledError', () => {
  it('describes an unacknowledged delegated command without blaming configuration', () => {
    const error = new OpenServiceRemoteCommandUnhandledError({
      serviceId: 'core/docgen',
      commandName: 'extractAllDocgen',
      delegated: true,
    });

    expect(error.message).toBe(
      'The Forkbook this runtime is attached to did not acknowledge remote command "core/docgen.extractAllDocgen" in time — it may be busy or unreachable. Retry; note the command may still have executed on that instance.'
    );
    expect(error.message).not.toMatch(/configuration|restart/i);
  });

  it('describes an unimplemented command when not delegated', () => {
    const error = new OpenServiceRemoteCommandUnhandledError({
      serviceId: 'core/docgen',
      commandName: 'extractAllDocgen',
    });

    expect(error.message).toBe(
      'No runtime acknowledged remote command "core/docgen.extractAllDocgen"; its handler is not implemented in any connected runtime.'
    );
  });
});
