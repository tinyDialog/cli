import {spawn} from 'node:child_process';
import {parseArgs, type ParsedCommand} from './args.ts';
import {
  ApiError,
  CLI_VERSION,
  listProjects,
  listResponses,
  listSurveys,
  validateApiKey,
} from './api.ts';
import {
  findDefaultProject,
  getAuthenticationFilePath,
  getStoredApiKey,
  normalizeHost,
  removeStoredApiKey,
  resolveApiKey,
  storeApiKey,
} from './config.ts';
import {formatProjects, formatResponses, formatSurveys} from './format.ts';
import {commandHelp} from './help.ts';

type OutputWithErrorEvents = {
  on(event: 'error', listener: (error: NodeJS.ErrnoException) => void): unknown;
};

export function installOutputErrorHandler(
  output: OutputWithErrorEvents = process.stdout,
  exit: (code: number) => void = (code) => process.exit(code),
) {
  output.on('error', (error) => {
    if(error.code === 'EPIPE') {
      exit(0);
      return;
    }
    throw error;
  });
}

function openBrowser(url: string) {
  const command = process.platform === 'darwin'
    ? {name: 'open', args: [url]}
    : process.platform === 'win32'
      ? {name: 'cmd', args: ['/c', 'start', '', url]}
      : {name: 'xdg-open', args: [url]};

  try {
    const child = spawn(command.name, command.args, {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    });
    child.on('error', () => undefined);
    child.unref();
  } catch {
    // The URL is always printed as a fallback.
  }
}

async function promptForApiKey() {
  process.stdout.write('Paste API key: ');

  if(!process.stdin.isTTY || typeof process.stdin.setRawMode !== 'function') {
    let value = '';
    for await(const chunk of process.stdin) value += String(chunk);
    process.stdout.write('\n');
    return value.trim();
  }

  return await new Promise<string>((resolve, reject) => {
    let value = '';
    const previousRawMode = process.stdin.isRaw;

    const cleanup = () => {
      process.stdin.off('data', onData);
      process.stdin.setRawMode(previousRawMode ?? false);
      process.stdin.pause();
      process.stdout.write('\n');
    };
    const onData = (chunk: Buffer) => {
      for(const character of chunk.toString('utf8')) {
        if(character === '\u0003') {
          cleanup();
          reject(new Error('Authentication cancelled.'));
          return;
        }
        if(character === '\r' || character === '\n') {
          cleanup();
          resolve(value.trim());
          return;
        }
        if(character === '\u007f' || character === '\b') {
          value = value.slice(0, -1);
          continue;
        }
        value += character;
      }
    };

    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', onData);
  });
}

async function requireAuthentication(host: string) {
  const authentication = await resolveApiKey(host);
  if(!authentication) {
    throw new Error(`Not authenticated to ${host}. Run "tinydialog auth".`);
  }
  return authentication;
}

async function runAuthLogin(host: string) {
  const settingsUrl = `${host}/user/settings#api-keys`;
  process.stdout.write(`Create a CLI API key in your tinyDialog settings:\n${settingsUrl}\n\n`);
  if(process.stdout.isTTY) openBrowser(settingsUrl);

  const apiKey = await promptForApiKey();
  if(!apiKey) throw new Error('No API key entered.');

  const currentUser = await validateApiKey(host, apiKey);
  await storeApiKey(host, apiKey);
  process.stdout.write(`Authenticated to ${host} as ${currentUser.data.email}.\n`);
}

async function runAuthStatus(host: string) {
  const authentication = await requireAuthentication(host);
  const currentUser = await validateApiKey(host, authentication.apiKey);
  process.stdout.write([
    `Host: ${host}`,
    `User: ${currentUser.data.name} <${currentUser.data.email}>`,
    `Credential: ${authentication.source}`,
    '',
  ].join('\n'));
}

async function runAuthLogout(host: string) {
  const storedApiKey = await getStoredApiKey(host);
  const removed = await removeStoredApiKey(host);

  if(process.env.TINYDIALOG_CLI_API_KEY?.trim()) {
    process.stdout.write(
      `${removed ? `Removed stored authentication from ${getAuthenticationFilePath()}.\n` : ''}`
      + 'TINYDIALOG_CLI_API_KEY is still set and must be removed from the environment to sign out fully.\n',
    );
    return;
  }

  if(!storedApiKey || !removed) {
    process.stdout.write(`No stored authentication found for ${host}.\n`);
    return;
  }
  process.stdout.write(`Signed out from ${host}.\n`);
}

export function splitCombinedSurvey(command: Extract<ParsedCommand, {kind: 'response-list'}>) {
  if(!command.survey?.includes('/')) return command;
  if(command.project || command.projectId) return command;

  const slashIndex = command.survey.indexOf('/');
  const combinedProject = command.survey.slice(0, slashIndex).trim();
  const survey = command.survey.slice(slashIndex + 1).trim();
  if(!combinedProject || !survey) {
    throw new Error('--survey <project/survey> requires non-empty project and survey names.');
  }
  return {...command, project: combinedProject, survey};
}

async function runList(command: Extract<ParsedCommand, {kind: `${string}-list`}>, host: string) {
  const {apiKey} = await requireAuthentication(host);

  if(command.kind === 'project-list') {
    const result = await listProjects(host, apiKey, command.limit);
    process.stdout.write(`${formatProjects(result.data, command.format)}\n`);
    return;
  }
  if(command.kind === 'survey-list') {
    const result = await listSurveys(host, apiKey, command);
    process.stdout.write(`${formatSurveys(result.data, command.format)}\n`);
    return;
  }

  let resolvedCommand = splitCombinedSurvey(command);
  if(!resolvedCommand.project && !resolvedCommand.projectId && !resolvedCommand.surveyId) {
    const defaultProject = await findDefaultProject();
    if(defaultProject) resolvedCommand = {...resolvedCommand, project: defaultProject};
  }
  if(resolvedCommand.survey && !resolvedCommand.project && !resolvedCommand.projectId) {
    throw new Error('Selecting a survey by name requires --project or --survey <project/survey>.');
  }

  const result = await listResponses(host, apiKey, resolvedCommand);
  process.stdout.write(`${formatResponses(result.data, resolvedCommand.format)}\n`);
}

export async function main(args: string[]) {
  try {
    const command = parseArgs(args);
    if(command.kind === 'help') {
      process.stdout.write(`${commandHelp(command.topic)}\n`);
      return;
    }
    if(command.kind === 'version') {
      process.stdout.write(`tinydialog ${CLI_VERSION}\n`);
      return;
    }

    const host = normalizeHost();
    if(command.kind === 'auth-login') {
      await runAuthLogin(host);
    } else if(command.kind === 'auth-status') {
      await runAuthStatus(host);
    } else if(command.kind === 'auth-logout') {
      await runAuthLogout(host);
    } else {
      await runList(command, host);
    }
  } catch(error) {
    if(error instanceof ApiError) {
      process.stderr.write(`Error: ${error.message} (${error.code})\n`);
      if(error.status === 401) {
        process.stderr.write('Run "tinydialog auth" to authenticate again.\n');
      }
    } else {
      process.stderr.write(`Error: ${(error as Error).message}\n`);
    }
    process.exitCode = 1;
  }
}
