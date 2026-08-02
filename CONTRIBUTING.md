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

## Releasing

Releases are driven entirely by the `version` field in `package.json`. Bump it, merge to `main`, and [`.github/workflows/publish.yml`](.github/workflows/publish.yml) does the rest:

1. **Check** — validates the version and asks npm and GitHub whether that version still needs publishing. If it is already fully released, the run stops here.
2. **Test & build** — runs the type check and tests, then builds the npm tarball plus standalone binaries for every supported platform.
3. **Publish** — waits for a manual approval on the `release` environment, then tags the commit, attests the binaries, creates the GitHub release, and publishes to npm.

Prereleases (`1.2.3-rc.1`) are marked as such on GitHub and published under npm's `next` tag. Every step is idempotent, so a failed run can simply be re-run.

## Specifying a custom backend server

Set environment variable `TINYDIALOG_CLI_HOST` (defaults to `https://app.tinydialog.com`) when working with a local / preview tinyDialog backend server:

```sh
TINYDIALOG_CLI_HOST=http://localhost:3000 bun index.ts project list
```
