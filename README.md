# tinyDialog.com CLI

Query [tinyDialog.com](https://tinydialog.com/) projects, surveys, and submitted feedback from your terminal or agent.

```sh
# install CLI system-wide
npm install --global @tinydialog/cli

# create a tinyDialog.com api-key and authenticate
tinydialog auth

# list the latest responses in project "My Website"
tinydialog response list --project "My Website"

# list the latest responses for survey "Feedback Widget" in project "My Website"
tinydialog response list --survey "My Website/Feedback Widget"
```

Run `tinydialog help` for all commands or `tinydialog <command> --help` for one command.

## Configuring a default project

If you add a "tinydialog" config-key to your project's `package.json` file, the CLI will automatically use the configured project as default-project when running `tinydialog response list` without an explicit `--project` parameter. 

e.g. in your `package.json`:
```json
{
  "name": "my project",
  "dependencies": {...},
  ...
  "tinydialog": {
    "project": "My Project"
  }
}
```
Then you can just run `tinydialog response list` inside your project directory, and it will default to the project "My Project".

You can still override the configured default-project by explicitly passing a different `--project <projectName>` parameter. 

## Additional Docs

See [configuration docs](docs/CONFIG.md), [implementation details](docs/IMPLEMENTATION.md), and [contributing.md](CONTRIBUTING.md).
