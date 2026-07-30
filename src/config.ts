import {homedir} from 'node:os';
import {dirname, isAbsolute, join, parse, resolve} from 'node:path';
import {chmod, mkdir, readFile, rename, unlink, writeFile} from 'node:fs/promises';

export const DEFAULT_HOST = 'https://app.tinydialog.com';

type HostAuthentication = {
  apiKey: string;
};

type AuthenticationFile = {
  version: 1;
  hosts: Record<string, HostAuthentication>;
};

export function normalizeHost(value = process.env.TINYDIALOG_CLI_HOST ?? DEFAULT_HOST) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`TINYDIALOG_CLI_HOST is not a valid URL: ${value}`);
  }

  if(url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('TINYDIALOG_CLI_HOST must use http:// or https://.');
  }

  url.search = '';
  url.hash = '';
  url.pathname = url.pathname.replace(/\/+$/, '');
  return url.toString().replace(/\/$/, '');
}

export function getConfigDirectory() {
  if(process.platform === 'win32' && process.env.APPDATA) {
    return join(process.env.APPDATA, 'tinydialog-cli');
  }

  const xdgConfigHome = process.env.XDG_CONFIG_HOME;
  const baseDirectory = xdgConfigHome && isAbsolute(xdgConfigHome)
    ? xdgConfigHome
    : join(homedir(), '.config');
  return join(baseDirectory, 'tinydialog-cli');
}

export function getAuthenticationFilePath() {
  return join(getConfigDirectory(), 'auth.json');
}

async function readAuthenticationFile(): Promise<AuthenticationFile> {
  try {
    const contents = await readFile(getAuthenticationFilePath(), 'utf8');
    const parsed = JSON.parse(contents) as unknown;

    if(
      typeof parsed !== 'object'
      || parsed == null
      || !('version' in parsed)
      || parsed.version !== 1
      || !('hosts' in parsed)
      || typeof parsed.hosts !== 'object'
      || parsed.hosts == null
    ) {
      throw new Error('unsupported authentication file');
    }

    const hosts: Record<string, HostAuthentication> = {};
    for(const [host, authentication] of Object.entries(parsed.hosts)) {
      if(
        typeof authentication === 'object'
        && authentication != null
        && 'apiKey' in authentication
        && typeof authentication.apiKey === 'string'
        && authentication.apiKey.length > 0
      ) {
        hosts[host] = {apiKey: authentication.apiKey};
      }
    }

    return {version: 1, hosts};
  } catch(error) {
    if((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {version: 1, hosts: {}};
    }
    throw new Error(`Could not read ${getAuthenticationFilePath()}: ${(error as Error).message}`);
  }
}

async function writeAuthenticationFile(authentication: AuthenticationFile) {
  const directory = getConfigDirectory();
  const path = getAuthenticationFilePath();
  const temporaryPath = join(directory, `.auth-${process.pid}-${Date.now()}.tmp`);

  await mkdir(directory, {recursive: true, mode: 0o700});
  if(process.platform !== 'win32') await chmod(directory, 0o700);
  try {
    await writeFile(temporaryPath, `${JSON.stringify(authentication, null, 2)}\n`, {
      encoding: 'utf8',
      mode: 0o600,
      flag: 'wx',
    });
    try {
      await rename(temporaryPath, path);
    } catch(error) {
      const errorCode = (error as NodeJS.ErrnoException).code;
      if(process.platform !== 'win32' || (errorCode !== 'EEXIST' && errorCode !== 'EPERM')) throw error;
      await unlink(path).catch((unlinkError: NodeJS.ErrnoException) => {
        if(unlinkError.code !== 'ENOENT') throw unlinkError;
      });
      await rename(temporaryPath, path);
    }
  } finally {
    await unlink(temporaryPath).catch(() => undefined);
  }
}

export async function getStoredApiKey(host: string) {
  return (await readAuthenticationFile()).hosts[host]?.apiKey;
}

export async function storeApiKey(host: string, apiKey: string) {
  const authentication = await readAuthenticationFile();
  authentication.hosts[host] = {apiKey};
  await writeAuthenticationFile(authentication);
}

export async function removeStoredApiKey(host: string) {
  const authentication = await readAuthenticationFile();
  const existed = authentication.hosts[host] != null;
  delete authentication.hosts[host];

  if(Object.keys(authentication.hosts).length === 0) {
    await unlink(getAuthenticationFilePath()).catch((error: NodeJS.ErrnoException) => {
      if(error.code !== 'ENOENT') throw error;
    });
  } else if(existed) {
    await writeAuthenticationFile(authentication);
  }

  return existed;
}

export async function resolveApiKey(host: string) {
  const environmentApiKey = process.env.TINYDIALOG_CLI_API_KEY?.trim();
  if(environmentApiKey) {
    return {apiKey: environmentApiKey, source: 'TINYDIALOG_CLI_API_KEY' as const};
  }

  const storedApiKey = await getStoredApiKey(host);
  if(storedApiKey) {
    return {apiKey: storedApiKey, source: getAuthenticationFilePath()};
  }

  return undefined;
}

export async function findDefaultProject(startDirectory = process.cwd()) {
  let directory = resolve(startDirectory);
  const root = parse(directory).root;

  while(true) {
    const packageJsonPath = join(directory, 'package.json');
    try {
      const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8')) as unknown;
      if(
        typeof packageJson === 'object'
        && packageJson != null
        && 'tinydialog' in packageJson
        && typeof packageJson.tinydialog === 'object'
        && packageJson.tinydialog != null
        && 'project' in packageJson.tinydialog
      ) {
        if(typeof packageJson.tinydialog.project !== 'string' || !packageJson.tinydialog.project.trim()) {
          throw new Error(`${packageJsonPath}: tinydialog.project must be a non-empty string.`);
        }
        return packageJson.tinydialog.project.trim();
      }
    } catch(error) {
      if((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        if(error instanceof SyntaxError) {
          throw new Error(`Could not parse ${packageJsonPath}: ${error.message}`);
        }
        throw error;
      }
    }

    if(directory === root) return undefined;
    directory = dirname(directory);
  }
}
