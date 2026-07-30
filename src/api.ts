import type {ApiListResponse, CurrentUserResponse, Project, Survey, SurveyResponse} from './types.ts';

export const CLI_COMPATIBILITY_DATE = '2026-07-28';
export const CLI_VERSION = '0.1.0';

type ApiErrorBody = {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
};

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

async function requestJson<T>(host: string, apiKey: string, path: string, searchParams?: URLSearchParams): Promise<T> {
  const url = new URL(`/api/cli/${path}`, `${host}/`);
  if(searchParams) url.search = searchParams.toString();

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'User-Agent': `tinydialog-cli/${CLI_VERSION}`,
        'X-Compatibility-Date': CLI_COMPATIBILITY_DATE,
      },
      signal: AbortSignal.timeout(30_000),
    });
  } catch(error) {
    if((error as Error).name === 'TimeoutError') {
      throw new Error(`Request to ${url.origin} timed out.`);
    }
    throw new Error(`Could not connect to ${url.origin}: ${(error as Error).message}`);
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error(`tinyDialog returned a non-JSON response (${response.status}). Check TINYDIALOG_CLI_HOST.`);
  }

  if(!response.ok) {
    const errorBody = typeof body === 'object' && body != null
      ? body as ApiErrorBody
      : {};
    throw new ApiError(
      response.status,
      errorBody.error?.code ?? 'request_failed',
      errorBody.error?.message ?? `Request failed with status ${response.status}.`,
      errorBody.error?.details,
    );
  }

  return body as T;
}

export function validateApiKey(host: string, apiKey: string) {
  return requestJson<CurrentUserResponse>(host, apiKey, 'me');
}

export function listProjects(host: string, apiKey: string, limit: number) {
  const query = new URLSearchParams({limit: limit.toString()});
  return requestJson<ApiListResponse<Project>>(host, apiKey, 'projects', query);
}

export function listSurveys(
  host: string,
  apiKey: string,
  options: {limit: number; project?: string; projectId?: string},
) {
  const query = new URLSearchParams({limit: options.limit.toString()});
  if(options.project) query.set('project', options.project);
  if(options.projectId) query.set('projectId', options.projectId);
  return requestJson<ApiListResponse<Survey>>(host, apiKey, 'surveys', query);
}

export function listResponses(
  host: string,
  apiKey: string,
  options: {
    limit: number;
    project?: string;
    projectId?: string;
    survey?: string;
    surveyId?: string;
  },
) {
  const query = new URLSearchParams({limit: options.limit.toString()});
  if(options.project) query.set('project', options.project);
  if(options.projectId) query.set('projectId', options.projectId);
  if(options.survey) query.set('survey', options.survey);
  if(options.surveyId) query.set('surveyId', options.surveyId);
  return requestJson<ApiListResponse<SurveyResponse>>(host, apiKey, 'responses', query);
}
