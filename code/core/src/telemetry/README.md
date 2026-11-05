# Forkbook Telemetry

Forkbook sends nothing to Storybook. It sends events only to your own OpenTelemetry server (when `OTEL_EXPORTER_OTLP_ENDPOINT` is set) and error reports to the Forkbook Sentry project. `core.disableTelemetry` turns off both.

For more information visit: [forkbook.ljk.dev/docs/configure/telemetry](https://forkbook.ljk.dev/docs/configure/telemetry)
