import type {Project, Survey, SurveyResponse} from './types.ts';

export type OutputFormat = 'json' | 'markdown';

function sanitize(value: unknown) {
  // oxlint-disable-next-line typescript/no-base-to-string -- Extra data can contain arbitrary JSON values. Preserve their existing display.
  const text = String(value ?? '');
  return (
    text
      // oxlint-disable-next-line no-control-regex -- Remove terminal escape sequences and control characters from rendered feedback.
      .replace(/\u001B(?:\[[0-?]*[ -/]*[@-~]|[@-_])/g, '')
      // oxlint-disable-next-line no-control-regex -- Strip control characters while preserving line feeds and tabs.
      .replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '')
  );
}

function inline(value: unknown) {
  return sanitize(value).replace(/\r?\n/g, ' ').replace(/\|/g, '\\|').replace(/`/g, '\\`');
}

function quote(value: unknown) {
  const text = sanitize(value);
  return text
    .split(/\r?\n/)
    .map((line) => `> ${line}`)
    .join('\n');
}

function table(headers: string[], rows: string[][]) {
  return [`| ${headers.join(' | ')} |`, `| ${headers.map(() => '---').join(' | ')} |`, ...rows.map((row) => `| ${row.join(' | ')} |`)].join('\n');
}

export function formatProjects(projects: Project[], format: OutputFormat) {
  if (format === 'json') return JSON.stringify(projects, null, 2);
  if (projects.length === 0) return 'No projects found.';

  return table(
    ['Project', 'Organization', 'Surveys', 'ID'],
    projects.map((project) => [inline(project.name), inline(project.organization.name), project.surveyCount.toString(), `\`${inline(project.id)}\``]),
  );
}

export function formatSurveys(surveys: Survey[], format: OutputFormat) {
  if (format === 'json') return JSON.stringify(surveys, null, 2);
  if (surveys.length === 0) return 'No surveys found.';

  return table(
    ['Survey', 'Type', 'Responses', 'Status', 'ID'],
    surveys.map((survey) => [
      inline(survey.name),
      inline(survey.type),
      survey.responseCount.toString(),
      survey.disabled ? 'disabled' : 'active',
      `\`${inline(survey.id)}\``,
    ]),
  );
}

export function formatResponses(responses: SurveyResponse[], format: OutputFormat) {
  if (format === 'json') return JSON.stringify(responses, null, 2);
  if (responses.length === 0) return 'No responses found.';

  return responses
    .map((response) => {
      const metadata = [
        `- Response ID: \`${response.id}\``,
        `- Submitted: ${inline(response.timestamp)}`,
        response.respondent.contact ? `- Contact: ${inline(response.respondent.contact)}` : null,
        response.respondent.url ? `- URL: ${inline(response.respondent.url)}` : null,
        response.topics?.length ? `- Topics: ${response.topics.map(inline).join(', ')}` : null,
        response.screenshotUrl ? `- Screenshot: ${inline(response.screenshotUrl)}` : null,
        ...Object.entries(response.extraData ?? {}).map(([key, value]) => `- ${inline(key)}: ${inline(value)}`),
      ].filter((line): line is string => line != null);

      return [`## ${inline(response.project.name)}/${inline(response.survey.name)}`, '', quote(response.response.value), '', ...metadata].join('\n');
    })
    .join('\n\n');
}
