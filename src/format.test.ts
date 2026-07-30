import {describe, expect, test} from 'bun:test';
import {formatProjects, formatResponses} from './format.ts';
import type {Project, SurveyResponse} from './types.ts';

describe('output formatting', () => {
  test('JSON output is a plain array', () => {
    const projects: Project[] = [{
      id: 'project-id',
      name: 'Website',
      organization: {id: 'org-id', name: 'Acme'},
      surveyCount: 2,
      createdAt: '2026-07-28T12:00:00.000Z',
    }];

    expect(JSON.parse(formatProjects(projects, 'json'))).toEqual(projects);
  });

  test('Markdown escapes table delimiters', () => {
    const projects: Project[] = [{
      id: 'project-id',
      name: 'Docs | Website',
      organization: {id: 'org-id', name: 'Acme'},
      surveyCount: 2,
      createdAt: '2026-07-28T12:00:00.000Z',
    }];

    expect(formatProjects(projects, 'markdown')).toContain('Docs \\| Website');
  });

  test('response Markdown quotes untrusted multiline feedback and strips control codes', () => {
    const responses: SurveyResponse[] = [{
      id: 7,
      timestamp: '2026-07-28T12:00:00.000Z',
      response: {type: 'single', value: 'First\r line\n\u001b[31mSecond line'},
      project: {
        id: 'project-id',
        name: 'Website',
        organization: {id: 'org-id', name: 'Acme'},
      },
      survey: {id: 'survey-id', name: 'Feedback'},
      respondent: {
        contact: null,
        url: null,
        operatingSystem: null,
        browser: null,
        screenSize: null,
      },
      extraData: null,
      topics: null,
      screenshotUrl: null,
    }];

    const output = formatResponses(responses, 'markdown');
    expect(output).toContain('> First line\n> Second line');
    expect(output).not.toContain('\r');
    expect(output).not.toContain('\u001b');
  });
});
