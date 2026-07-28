# tinyDialog CLI

Read tinyDialog projects, surveys, and submitted user feedback from a terminal or an agent.

```sh
npm install --global @tinydialog/cli
tinydialog auth
tinydialog project list
tinydialog survey list --project "My Project"
tinydialog response list --format json
```

Run `tinydialog help` for the full, agent-friendly command reference.

Every API request includes `X-Compatibility-Date: 2026-07-28`. The server currently ignores this header; it is reserved for future compatibility behavior.

## Authentication

`tinydialog auth` opens the tinyDialog API-key management settings, validates the pasted key, and stores it per host in:

- `$XDG_CONFIG_HOME/tinydialog-cli/auth.json`, or
- `~/.config/tinydialog-cli/auth.json`, or
- `%APPDATA%\tinydialog-cli\auth.json` on Windows.

For non-interactive environments, set `TINYDIALOG_CLI_API_KEY`. Set `TINYDIALOG_CLI_HOST` to use a local or preview app host.

## Project context

When `response list` has no explicit project selector, the CLI searches the current directory and its parents for:

```json
{
  "tinydialog": {
    "project": "My Project"
  }
}
```

## Development

```sh
bun install
bun test
bun run typecheck
bun run build
bun run build:standalone
```
