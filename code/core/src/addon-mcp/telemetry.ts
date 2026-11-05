import { logger } from '@aussieljk/forkbook/internal/node-logger';
import { telemetry } from '@aussieljk/forkbook/internal/telemetry';
import type { AddonContext, AddonMcpServer } from './types.ts';

export async function collectTelemetry({
  event,
  server,
  ...payload
}: {
  event: string;
  server: AddonMcpServer;
  [key: string]: unknown;
}) {
  try {
    return await telemetry('addon-mcp', {
      event,
      mcpSessionId: server.ctx.sessionId,
      clientInfo: server.ctx.sessionInfo?.clientInfo,
      clientCapabilities: server.ctx.sessionInfo?.clientCapabilities,
      transport: 'mcp',
      ...payload,
    });
  } catch (error) {
    logger.debug(`Error collecting telemetry: ${String(error)}`);
  }
}
