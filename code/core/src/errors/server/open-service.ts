import { dedent } from 'ts-dedent';
import type { ValidationMeta } from '../../shared/open-service/errors.ts';
import { formatIssues } from '../../shared/open-service/errors.ts';
import type { ServiceId } from '../../shared/open-service/types.ts';
import { StorybookError } from '../../storybook-error.ts';
import { Category } from './category.ts';

export class OpenServiceValidationError extends StorybookError {
  constructor(public data: ValidationMeta) {
    super({
      name: 'OpenServiceValidationError',
      category: Category.CORE_COMMON,
      code: 5,
      message: `Invalid ${data.phase} for ${data.kind} "${data.serviceId}.${data.name}":\n${formatIssues(
        data.issues
      )}`,
    });
  }
}

export class OpenServiceDuplicateRegistrationError extends StorybookError {
  constructor(public data: { serviceId: ServiceId }) {
    super({
      name: 'OpenServiceDuplicateRegistrationError',
      category: Category.CORE_COMMON,
      code: 6,
      message: `A service with id "${data.serviceId}" is already registered.`,
    });
  }
}

export class OpenServiceMissingServiceError extends StorybookError {
  constructor(public data: { serviceId: ServiceId }) {
    super({
      name: 'OpenServiceMissingServiceError',
      category: Category.CORE_COMMON,
      code: 7,
      message: `No registered service with id "${data.serviceId}" exists in this environment.`,
    });
  }
}

export class OpenServiceInternalServiceError extends StorybookError {
  constructor(public data: { serviceId: ServiceId }) {
    super({
      name: 'OpenServiceInternalServiceError',
      category: Category.CORE_COMMON,
      code: 19,
      message: `Service "${data.serviceId}" is internal. Pass { internal: true } to getService() only if you intentionally depend on an unstable OSA surface. Internal services may change without notice.`,
    });
  }
}

export class OpenServiceUnimplementedOperationError extends StorybookError {
  constructor(public data: { serviceId: ServiceId; name: string; kind: 'query' | 'command' }) {
    super({
      name: 'OpenServiceUnimplementedOperationError',
      category: Category.CORE_COMMON,
      code: 8,
      message: `${data.kind[0].toUpperCase()}${data.kind.slice(1)} "${data.serviceId}.${data.name}" is not implemented for this environment.`,
    });
  }
}

export class OpenServiceInvalidStaticPathError extends StorybookError {
  constructor(public data: { serviceId: ServiceId; name: string; path: string }) {
    super({
      name: 'OpenServiceInvalidStaticPathError',
      category: Category.CORE_COMMON,
      code: 10,
      message: `Invalid static path "${data.path}" for query "${data.serviceId}.${data.name}": use a relative path with forward slashes and no ".." segments.`,
    });
  }
}

export class OpenServiceAsyncSchemaError extends StorybookError {
  constructor(
    public data: {
      serviceId: ServiceId;
      name: string;
      kind: 'query' | 'command';
      phase: 'input' | 'output';
    }
  ) {
    super({
      name: 'OpenServiceAsyncSchemaError',
      category: Category.CORE_COMMON,
      code: 9,
      message: `Async schema for ${data.kind} "${data.serviceId}.${data.name}" (${data.phase}): query input and output schemas must validate synchronously.`,
    });
  }
}

export class OpenServiceLoadedDrainExceededError extends StorybookError {
  constructor(public data: { serviceId: ServiceId; name: string; iterations: number }) {
    super({
      name: 'OpenServiceLoadedDrainExceededError',
      category: Category.CORE_COMMON,
      code: 11,
      message: `Query "${data.serviceId}.${data.name}".loaded(...) did not settle after ${data.iterations} drain iterations. Check for handlers that keep discovering new dependencies after every state change.`,
    });
  }
}

export class OpenServiceDocgenMissingComponentError extends StorybookError {
  constructor(public data: { id: string }) {
    super({
      name: 'OpenServiceDocgenMissingComponentError',
      category: Category.CORE_COMMON,
      code: 12,
      message: `No story or attached docs entry was found for component id "${data.id}". The docgen service can only return docs for components that are present in the story index.`,
    });
  }
}

export class OpenServiceMissingChannelError extends StorybookError {
  constructor(public data: { serviceId?: ServiceId } = {}) {
    super({
      name: 'OpenServiceMissingChannelError',
      category: Category.CORE_COMMON,
      code: 13,
      message: data.serviceId
        ? `Cannot register service "${data.serviceId}": the Forkbook addons channel is not installed in this runtime.`
        : 'The Forkbook addons channel is not installed in this runtime.',
    });
  }
}

export class OpenServiceRemoteCommandDisconnectedError extends StorybookError {
  constructor(public data: { serviceId: ServiceId }) {
    super({
      name: 'OpenServiceRemoteCommandDisconnectedError',
      category: Category.CORE_COMMON,
      code: 14,
      message: `Service "${data.serviceId}" was unregistered before a remote command resolved.`,
    });
  }
}

export class OpenServiceRemoteCommandUnhandledError extends StorybookError {
  constructor(public data: { serviceId: ServiceId; commandName: string; delegated?: boolean }) {
    super({
      name: 'OpenServiceRemoteCommandUnhandledError',
      category: Category.CORE_COMMON,
      code: 15,
      message: data.delegated
        ? `The Forkbook this runtime is attached to did not acknowledge remote command "${data.serviceId}.${data.commandName}" in time — it may be busy or unreachable. Retry; note the command may still have executed on that instance.`
        : `No runtime acknowledged remote command "${data.serviceId}.${data.commandName}"; its handler is not implemented in any connected runtime.`,
    });
  }
}

export class OpenServiceRemoteCommandConfigDriftError extends StorybookError {
  constructor(public data: { serviceId: ServiceId; commandName: string }) {
    super({
      name: 'OpenServiceRemoteCommandConfigDriftError',
      category: Category.CORE_COMMON,
      code: 30,
      message: `The Forkbook this runtime is attached to reported it has no handler for remote command "${data.serviceId}.${data.commandName}". The two processes are running different configurations (for example a feature flag enabled in one but not the other). Restart the attached Forkbook with a configuration matching this process.`,
    });
  }
}

export class OpenServiceAsyncRecipeError extends StorybookError {
  constructor() {
    super({
      name: 'OpenServiceAsyncRecipeError',
      category: Category.CORE_COMMON,
      code: 31,
      message:
        'setState recipes must be synchronous. A write after an await would change state without authoring a sync entry. Split the command into one setState per synchronous step.',
    });
  }
}

export class OpenServiceCyclicStateError extends StorybookError {
  constructor() {
    super({
      name: 'OpenServiceCyclicStateError',
      category: Category.CORE_COMMON,
      code: 32,
      message:
        'Service state must be JSON-serializable, but the value is cyclic or nested more than 256 levels deep. Store an id and look the value up in a query instead of a reference.',
    });
  }
}

export class OpenServiceOperationNameCollisionError extends StorybookError {
  constructor(public data: { serviceId: ServiceId; operationName: string }) {
    super({
      name: 'OpenServiceOperationNameCollisionError',
      category: Category.CORE_COMMON,
      code: 16,
      message: `Service "${data.serviceId}" cannot register "${data.operationName}" as both a query and a command.`,
    });
  }
}

export class OpenServiceMissingOriginError extends StorybookError {
  constructor(public data: { toolsetId: string; methodName: string }) {
    super({
      name: 'OpenServiceMissingOriginError',
      category: Category.CORE_COMMON,
      code: 17,
      message: `Method "${data.toolsetId}.${data.methodName}" requires a Forkbook server origin. Run it against a live Forkbook so the adapter can provide ctx.origin.`,
    });
  }
}

/**
 * Why a review was refused. The toolset renders this as the opening of a longer, coaching message,
 * so it lives here rather than in both places — the two copies had already drifted apart once.
 */
export function describeUnknownStoryIds(unknownIds: string[]): string {
  const plural = unknownIds.length === 1 ? 'ID is' : 'IDs are';
  return `Refusing to publish review: ${unknownIds.length} story ${plural} not backed by a story entry in the live Forkbook index (docs entries cannot be review slots):`;
}

export class OpenServiceUnknownStoryIdsError extends StorybookError {
  constructor(public data: { unknownIds: string[] }) {
    const list = data.unknownIds.map((id) => `- ${id}`).join('\n');
    super({
      name: 'OpenServiceUnknownStoryIdsError',
      category: Category.CORE_COMMON,
      code: 18,
      message: `${describeUnknownStoryIds(data.unknownIds)}\n${list}`,
    });
  }
}

// CORE_COMMON error code 20 was retired with the stateless core/docs OSA facade.
export class OpenServiceTestRunTimeoutError extends StorybookError {
  constructor(public data: { timeoutMs: number; requestId: string }) {
    super({
      name: 'OpenServiceTestRunTimeoutError',
      category: Category.CORE_COMMON,
      code: 21,
      message: `Timed out after ${data.timeoutMs}ms waiting for addon-vitest response to test run "${data.requestId}". Ensure @aussieljk/forkbook/addon-vitest is installed and responding.`,
    });
  }
}

export class OpenServiceServicesAppliedTwiceError extends StorybookError {
  constructor() {
    super({
      name: 'OpenServiceServicesAppliedTwiceError',
      category: Category.CORE_COMMON,
      code: 22,
      message: dedent`The "services" preset property was applied twice, but should only be applied once.
        Multiple code paths applying it will cause service and toolset registration to fail.`,
    });
  }
}

export class OpenServiceMissingToolsetError extends StorybookError {
  constructor(public data: { toolsetId: string }) {
    super({
      name: 'OpenServiceMissingToolsetError',
      category: Category.CORE_COMMON,
      code: 23,
      message: `No registered toolset with id "${data.toolsetId}" exists in this environment.`,
    });
  }
}

export class OpenServiceDuplicateToolsetError extends StorybookError {
  constructor(public data: { toolsetId: string }) {
    super({
      name: 'OpenServiceDuplicateToolsetError',
      category: Category.CORE_COMMON,
      code: 24,
      message: `A toolset with id "${data.toolsetId}" is already registered. Each public toolset must be registered exactly once.`,
    });
  }
}

/**
 * The story module graph cannot answer a query right now (still building, unsupported builder, or
 * a build failure).
 *
 * Its `message` is written for the agent that triggered the lookup and names the recovery, which
 * is what `agentFacing` declares: adapters surface it verbatim rather than wrapping it as an
 * unexpected failure.
 */
export class OpenServiceModuleGraphUnavailableError extends StorybookError {
  constructor(public data: { reason: string }) {
    super({
      name: 'OpenServiceModuleGraphUnavailableError',
      category: Category.CORE_COMMON,
      code: 25,
      message: data.reason,
      agentFacing: true,
    });
  }
}

/**
 * A toolset method returned data its own published `outputSchema` rejects.
 *
 * Always a bug in the method: the schema is the contract adapters publish to their clients, so the
 * mismatch is raised instead of quietly shipping unvalidated data.
 */
export class OpenServiceToolsetOutputMismatchError extends StorybookError {
  constructor(public data: { issues: readonly unknown[] }) {
    // Validation issues embed the rejected input, which can be large or circular — the diagnostic
    // must never throw or balloon while reporting the real bug.
    let serialized: string;
    try {
      serialized = JSON.stringify(data.issues)?.slice(0, 2000) ?? String(data.issues);
    } catch {
      serialized = `${data.issues.length} issue(s) that could not be serialized`;
    }
    super({
      name: 'OpenServiceToolsetOutputMismatchError',
      category: Category.CORE_COMMON,
      code: 26,
      message: `Toolset output did not match its published output schema: ${serialized}`,
    });
  }
}

/** A toolset method id is not exactly `toolsetId.methodName` with non-empty parts. */
export class OpenServiceInvalidToolsetMethodIdError extends StorybookError {
  constructor(public data: { methodId: string }) {
    super({
      name: 'OpenServiceInvalidToolsetMethodIdError',
      category: Category.CORE_COMMON,
      code: 28,
      message: `Invalid toolset method id "${data.methodId}". Expected exactly one separator: toolsetId.methodName.`,
    });
  }
}

/**
 * Two toolset methods derive the same MCP tool name (or two methods in one toolset derive the same
 * CLI method name).
 */
export class OpenServiceDuplicateToolNameError extends StorybookError {
  constructor(
    public data: {
      derivedName: string;
      first: string;
      second: string;
      transport: 'mcp' | 'cli';
    }
  ) {
    super({
      name: 'OpenServiceDuplicateToolNameError',
      category: Category.CORE_COMMON,
      code: 29,
      message:
        data.transport === 'mcp'
          ? `Derived MCP tool name "${data.derivedName}" collides between "${data.first}" and "${data.second}". Rename one toolset id or method key.`
          : `Derived CLI method name "${data.derivedName}" collides between "${data.first}" and "${data.second}" in the same toolset. Rename one method key.`,
    });
  }
}
