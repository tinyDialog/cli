import type {OutputFormat} from './format.ts';

export type ParsedCommand =
  | {kind: 'help'; topic?: string}
  | {kind: 'version'}
  | {kind: 'auth-login'}
  | {kind: 'auth-status'}
  | {kind: 'auth-logout'}
  | {kind: 'project-list'; format: OutputFormat; limit: number}
  | {
    kind: 'survey-list';
    format: OutputFormat;
    limit: number;
    project?: string;
    projectId?: string;
  }
  | {
    kind: 'response-list';
    format: OutputFormat;
    limit: number;
    project?: string;
    projectId?: string;
    survey?: string;
    surveyId?: string;
  };

type ParsedOptions = {
  help: boolean;
  format?: string;
  limit?: string;
  project?: string;
  projectId?: string;
  survey?: string;
  surveyId?: string;
};

function parseOptions(args: string[], allowed: Set<string>) {
  const options: ParsedOptions = {help: false};
  const positionals: string[] = [];

  for(let index = 0; index < args.length; index++) {
    const argument = args[index]!;
    if(argument === '--help' || argument === '-h') {
      options.help = true;
      continue;
    }
    if(!argument.startsWith('--')) {
      positionals.push(argument);
      continue;
    }

    const equalsIndex = argument.indexOf('=');
    const rawName = equalsIndex === -1 ? argument.slice(2) : argument.slice(2, equalsIndex);
    const name = rawName.replace(/-([a-z])/g, (_, character: string) => character.toUpperCase());
    if(!allowed.has(name)) {
      throw new Error(`Unknown option: --${rawName}`);
    }

    const value = equalsIndex === -1 ? args[++index] : argument.slice(equalsIndex + 1);
    if(value == null || value.startsWith('--')) {
      throw new Error(`Option --${rawName} requires a value.`);
    }
    if(options[name as keyof ParsedOptions] != null) {
      throw new Error(`Option --${rawName} may only be provided once.`);
    }
    (options as Record<string, unknown>)[name] = value;
  }

  return {options, positionals};
}

function normalizeFormat(value?: string): OutputFormat {
  if(value == null || value === 'markdown' || value === 'md') return 'markdown';
  if(value === 'json') return 'json';
  throw new Error('Format must be one of: json, markdown, md.');
}

function normalizeLimit(value: string|undefined, defaultValue: number) {
  if(value == null) return defaultValue;
  if(!/^\d+$/.test(value) || Number(value) < 1 || !Number.isSafeInteger(Number(value))) {
    throw new Error('Limit must be a positive integer.');
  }
  return Number(value);
}

export function parseArgs(args: string[]): ParsedCommand {
  if(args.length === 0) return {kind: 'help'};
  if(args[0] === '--version' || args[0] === '-v') return {kind: 'version'};
  if(args[0] === '--help' || args[0] === '-h') return {kind: 'help'};

  const noun = ({
    projects: 'project',
    surveys: 'survey',
    responses: 'response',
  } as Record<string, string>)[args[0]!] ?? args[0]!;

  if(noun === 'help') return {kind: 'help', topic: args[1]};

  if(noun === 'auth') {
    const action = args[1] ?? 'login';
    if(args.includes('--help') || args.includes('-h')) return {kind: 'help', topic: 'auth'};
    if(args.length > (args[1] ? 2 : 1)) throw new Error('Too many arguments for auth.');
    if(action === 'login') return {kind: 'auth-login'};
    if(action === 'status') return {kind: 'auth-status'};
    if(action === 'logout' || action === 'signout') return {kind: 'auth-logout'};
    throw new Error(`Unknown auth action: ${action}`);
  }

  if(!['project', 'survey', 'response'].includes(noun)) {
    throw new Error(`Unknown command: ${args[0]}`);
  }
  if(args[1] !== 'list') {
    if(args[1] === '--help' || args[1] === '-h') return {kind: 'help', topic: noun};
    throw new Error(`Expected "${noun} list".`);
  }

  const allowed = new Set(['format', 'limit']);
  if(noun === 'survey' || noun === 'response') {
    allowed.add('project');
    allowed.add('projectId');
  }
  if(noun === 'response') {
    allowed.add('survey');
    allowed.add('surveyId');
  }
  const {options, positionals} = parseOptions(args.slice(2), allowed);
  if(positionals.length > 0) throw new Error(`Unexpected argument: ${positionals[0]}`);
  if(options.help) return {kind: 'help', topic: noun};

  const format = normalizeFormat(options.format);
  if(noun === 'project') {
    return {kind: 'project-list', format, limit: normalizeLimit(options.limit, 25)};
  }

  if(options.project && options.projectId) {
    throw new Error('Use --project or --project-id, not both.');
  }

  if(noun === 'survey') {
    if(!options.project && !options.projectId) {
      throw new Error('survey list requires --project <name> or --project-id <id>.');
    }
    return {
      kind: 'survey-list',
      format,
      limit: normalizeLimit(options.limit, 50),
      project: options.project,
      projectId: options.projectId,
    };
  }

  if(options.survey && options.surveyId) {
    throw new Error('Use --survey or --survey-id, not both.');
  }
  return {
    kind: 'response-list',
    format,
    limit: normalizeLimit(options.limit, 10),
    project: options.project,
    projectId: options.projectId,
    survey: options.survey,
    surveyId: options.surveyId,
  };
}
