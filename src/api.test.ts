import {afterEach, describe, expect, test} from 'bun:test';
import {CLI_COMPATIBILITY_DATE, listProjects, listSurveys} from './api.ts';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('API client', () => {
  test('sends authentication and compatibility headers', async () => {
    let requestUrl = '';
    let requestHeaders: Headers|undefined;
    globalThis.fetch = (async (input, init) => {
      requestUrl = String(input);
      requestHeaders = new Headers(init?.headers);
      return Response.json({
        data: [],
        pagination: {limit: 25, nextCursor: null},
      });
    }) as typeof fetch;

    await listProjects('https://app.tinydialog.com', 'secret-key', 25);

    expect(requestUrl).toBe('https://app.tinydialog.com/api/cli/projects?limit=25');
    expect(requestHeaders?.get('authorization')).toBe('Bearer secret-key');
    expect(requestHeaders?.get('x-compatibility-date')).toBe(CLI_COMPATIBILITY_DATE);
  });

  test('sends hidden ID selectors instead of names', async () => {
    let requestUrl = '';
    globalThis.fetch = (async (input) => {
      requestUrl = String(input);
      return Response.json({
        data: [],
        pagination: {limit: 50, nextCursor: null},
      });
    }) as typeof fetch;

    await listSurveys('http://localhost:3000', 'secret-key', {
      limit: 50,
      projectId: 'project-id',
    });

    expect(requestUrl).toBe('http://localhost:3000/api/cli/surveys?limit=50&projectId=project-id');
  });
});
