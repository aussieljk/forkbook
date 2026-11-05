# Forkbook Telemetry

Forkbook sends nothing to Storybook. It sends two kinds of data:

- Error reports go to the Forkbook Sentry project. This is on by default. To stop it, set `FORKBOOK_SENTRY_DSN` to an empty string, or turn off telemetry. To send them to your own Sentry project, set `FORKBOOK_SENTRY_DSN` to its DSN.
- Events go to your own OpenTelemetry server, only when `OTEL_EXPORTER_OTLP_ENDPOINT` is set.

`core.disableTelemetry` (or `--disable-telemetry`, or `FORKBOOK_DISABLE_TELEMETRY=true`) turns off both.

For more information visit: [forkbook.ljk.dev/docs/configure/telemetry](https://forkbook.ljk.dev/docs/configure/telemetry)
