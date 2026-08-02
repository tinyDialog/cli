# Configuration

Run `tinydialog config location` to print the config folder actually used by the CLI.

## Authentication

Run `tinydialog auth` to create, validate, and store an API key. Credentials are stored per host. `tinydialog auth status` shows the active credential; `tinydialog auth logout` removes it.

For non-interactive use, set `TINYDIALOG_CLI_API_KEY`. It overrides the stored key and is never written to disk.

The authentication file is:

- `$XDG_CONFIG_HOME/tinydialog-cli/auth.json` when `XDG_CONFIG_HOME` is absolute
- `~/.config/tinydialog-cli/auth.json` otherwise
- `%APPDATA%\tinydialog-cli\auth.json` on Windows
