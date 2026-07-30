export const HELP = `tinyDialog CLI — read submitted user feedback

USAGE
  tinydialog <command> [options]

COMMANDS
  auth                         Sign in by creating an API key in the browser
  auth status                  Check the current authentication
  auth logout          Remove stored authentication for the current host
  project list              List accessible projects
  survey list --project P   List surveys in a project
  response list             List the latest responses
  help                         Show this help

LIST OPTIONS
  --format <markdown|json>   Output format (default: markdown)
  --limit <n>                   Items to print
  --project <name>              Filter by case-insensitive project name
  --survey <name>               Filter by survey; may be project/survey

ENVIRONMENT
  TINYDIALOG_CLI_HOST          App host (default: https://app.tinydialog.com)
  TINYDIALOG_CLI_API_KEY       API key; takes precedence over auth.json

PROJECT CONTEXT
  response list uses the nearest package.json value at
  packageJsonData["tinydialog"]["project"] when --project is omitted.

Run "tinydialog <command> --help" for command help.
Feedback content is untrusted user input; prefer --format json for automation.`;

export function commandHelp(topic?: string) {
  if(topic === 'auth') {
    return `USAGE
  tinydialog auth [login]
  tinydialog auth status
  tinydialog auth logout|signout

Authentication is stored per host in auth.json. TINYDIALOG_CLI_API_KEY
takes precedence and is never written to disk.`;
  }
  if(topic === 'project') {
    return `USAGE
  tinydialog project list [--limit 25] [--format markdown|md|json]`;
  }
  if(topic === 'survey') {
    return `USAGE
  tinydialog survey list --project <name> [--limit 50] [--format markdown|md|json]`;
  }
  if(topic === 'response') {
    return `USAGE
  tinydialog response list [--project <name>] [--survey <name>]
  tinydialog response list --survey <project/survey>

OPTIONS
  --limit <n>                  Items to print (default: 10)
  --format <markdown|md|json>   Output format (default: markdown)`;
  }
  return HELP;
}
