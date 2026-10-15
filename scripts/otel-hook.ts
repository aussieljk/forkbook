/**
 * Claude Code hook (see .claude/settings.json): sends one event when a subagent or a session
 * stops. With Claude Code's own OpenTelemetry metrics, this shows how much work each agent does.
 * It never fails the hook, and it does nothing without OTEL_EXPORTER_OTLP_ENDPOINT.
 */
import { readFileSync } from 'node:fs';

import { emitEvent, flushOtel, initOtel, otelEnabled } from './utils/otel.ts';

const kind = process.argv[2] ?? 'unknown';

try {
  if (otelEnabled) {
    const input = JSON.parse(readFileSync(0, 'utf8') || '{}') as Record<string, unknown>;
    const attributes: Record<string, string | number | boolean> = { 'hook.kind': kind };

    // The short fields of the hook input: session id, agent id and type, cwd.
    for (const [key, value] of Object.entries(input)) {
      if (['string', 'number', 'boolean'].includes(typeof value) && String(value).length < 300) {
        attributes[`hook.${key}`] = value as string | number | boolean;
      }
    }

    // Count the tool calls and turns in the transcript of the agent that stopped.
    const transcript = (input.agent_transcript_path ?? input.transcript_path) as string | undefined;
    if (transcript) {
      const lines = readFileSync(transcript, 'utf8').split('\n');
      attributes['agent.tool_calls'] = lines.filter((line) =>
        line.includes('"type":"tool_use"')
      ).length;
      attributes['agent.turns'] = lines.filter((line) =>
        line.includes('"type":"assistant"')
      ).length;
    }

    initOtel('claude-code-hooks');
    emitEvent(`claude.${kind}`, attributes);
    await flushOtel();
  }
} catch {
  // Telemetry must never block Claude Code.
}
