// React Native has `window` as an alias of the global object.
(globalThis as { window?: unknown }).window ??= globalThis;
