import {describe, expect, test} from 'bun:test';
import {parseArgs} from './args.ts';

describe('parseArgs', () => {
  test('accepts plural resource aliases and default list options', () => {
    expect(parseArgs(['projects', 'list'])).toEqual({
      kind: 'project-list',
      format: 'markdown',
      limit: 25,
    });
    expect(parseArgs(['surveys', 'list', '--project', 'Website'])).toEqual({
      kind: 'survey-list',
      format: 'markdown',
      limit: 50,
      project: 'Website',
      projectId: undefined,
    });
  });

  test('accepts JSON, custom limits, and hidden ID selectors', () => {
    expect(parseArgs([
      'responses',
      'list',
      '--format=json',
      '--limit',
      '12',
      '--project-id',
      'project-id',
      '--survey-id',
      'survey-id',
    ])).toEqual({
      kind: 'response-list',
      format: 'json',
      limit: 12,
      project: undefined,
      projectId: 'project-id',
      survey: undefined,
      surveyId: 'survey-id',
    });
  });

  test('accepts auth aliases', () => {
    expect(parseArgs(['auth'])).toEqual({kind: 'auth-login'});
    expect(parseArgs(['auth', 'signout'])).toEqual({kind: 'auth-logout'});
  });

  test('rejects ambiguous selectors and invalid limits', () => {
    expect(() => parseArgs([
      'response',
      'list',
      '--project',
      'Website',
      '--project-id',
      'id',
    ])).toThrow('Use --project or --project-id');
    expect(() => parseArgs(['project', 'list', '--limit', '0'])).toThrow('positive integer');
  });

  test('rejects empty option values', () => {
    expect(() => parseArgs(['response', 'list', '--project='])).toThrow(
      'Option --project requires a value.',
    );
    expect(() => parseArgs(['response', 'list', '--project', 'Website', '--survey='])).toThrow(
      'Option --survey requires a value.',
    );
  });
});
