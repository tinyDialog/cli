# Contributing

The CLI requires Bun. Install dependencies, run tests and type checks, then build both targets:

```sh
bun install
bun test
bun run typecheck
bun run build
bun run build:standalone -- --outfile ./dist/bin/tinydialog
```

`build:standalone` takes the output path (and optionally `--target=bun-<platform>`) as an argument, so one script can cross-compile every release binary.

## Specifying a custom backend server

Set environment variable `TINYDIALOG_CLI_HOST` (defaults to `https://app.tinydialog.com`) when working with a local / preview tinyDialog backend server:

```sh
TINYDIALOG_CLI_HOST=http://localhost:3000 bun index.ts project list
```
