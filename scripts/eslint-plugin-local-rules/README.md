## Local oxlint rules

Rules for this repo, loaded as a JS plugin by `code/.oxlintrc.json`:

- `no-uncategorized-errors`: use a categorised Forkbook error class, not `new Error()`.
- `no-duplicated-error-codes`: each error code is unique in its category.
