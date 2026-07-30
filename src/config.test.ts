import {afterEach, describe, expect, test} from 'bun:test';
import {mkdtemp, mkdir, readFile, rm, stat, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {homedir, tmpdir} from 'node:os';
import {
  findDefaultProject,
  getAuthenticationFilePath,
  getConfigDirectory,
  getStoredApiKey,
  normalizeHost,
  removeStoredApiKey,
  storeApiKey,
} from './config.ts';

const temporaryDirectories: string[] = [];
const originalXdgConfigHome = process.env.XDG_CONFIG_HOME;

afterEach(async () => {
  if(originalXdgConfigHome == null) delete process.env.XDG_CONFIG_HOME;
  else process.env.XDG_CONFIG_HOME = originalXdgConfigHome;

  await Promise.all(temporaryDirectories.splice(0).map((directory) => (
    rm(directory, {recursive: true, force: true})
  )));
});

async function temporaryDirectory() {
  const directory = await mkdtemp(join(tmpdir(), 'tinydialog-cli-test-'));
  temporaryDirectories.push(directory);
  return directory;
}

describe('configuration', () => {
  test('normalizes host URLs', () => {
    expect(normalizeHost('http://localhost:3000///')).toBe('http://localhost:3000');
    expect(() => normalizeHost('file:///tmp/tinydialog')).toThrow('http:// or https://');
  });

  test('finds the nearest package project from a nested directory', async () => {
    const directory = await temporaryDirectory();
    const nestedDirectory = join(directory, 'src', 'components');
    await mkdir(nestedDirectory, {recursive: true});
    await writeFile(join(directory, 'package.json'), JSON.stringify({
      tinydialog: {project: 'Website'},
    }));

    expect(await findDefaultProject(nestedDirectory)).toBe('Website');
  });

  test('ignores empty and relative XDG_CONFIG_HOME values', () => {
    process.env.XDG_CONFIG_HOME = '';
    expect(getConfigDirectory()).toBe(join(homedir(), '.config', 'tinydialog-cli'));

    process.env.XDG_CONFIG_HOME = 'project-config';
    expect(getConfigDirectory()).toBe(join(homedir(), '.config', 'tinydialog-cli'));
  });

  test('stores credentials per host with restrictive file permissions', async () => {
    const directory = await temporaryDirectory();
    process.env.XDG_CONFIG_HOME = directory;

    await storeApiKey('https://app.tinydialog.com', 'production-key');
    await storeApiKey('http://localhost:3000', 'local-key');

    expect(await getStoredApiKey('https://app.tinydialog.com')).toBe('production-key');
    expect(await getStoredApiKey('http://localhost:3000')).toBe('local-key');
    expect(JSON.parse(await readFile(getAuthenticationFilePath(), 'utf8')).version).toBe(1);
    if(process.platform !== 'win32') {
      expect((await stat(getAuthenticationFilePath())).mode & 0o777).toBe(0o600);
    }

    expect(await removeStoredApiKey('http://localhost:3000')).toBe(true);
    expect(await getStoredApiKey('https://app.tinydialog.com')).toBe('production-key');
  });
});
