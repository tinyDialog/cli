export type OrganizationReference = {
  id: string;
  name: string;
};

export type Project = {
  id: string;
  name: string;
  organization: OrganizationReference;
  surveyCount: number;
  createdAt: string;
};

export type Survey = {
  id: string;
  name: string;
  project: {
    id: string;
    name: string;
    organization: OrganizationReference;
  };
  type: string;
  disabled: boolean;
  responseCount: number;
  createdAt: string;
};

export type SurveyResponse = {
  id: number;
  timestamp: string;
  response: {
    type: 'single';
    value: string|boolean|number;
  };
  project: {
    id: string;
    name: string;
    organization: OrganizationReference;
  };
  survey: {
    id: string;
    name: string;
  };
  respondent: {
    contact: string|null;
    url: string|null;
    operatingSystem: string|null;
    browser: string|null;
    screenSize: string|null;
  };
  extraData: Record<string, string>|null;
  topics: string[]|null;
  screenshotUrl: string|null;
};

export type ApiListResponse<T> = {
  data: T[];
  pagination: {
    limit: number;
    nextCursor: string|null;
  };
};

export type CurrentUserResponse = {
  data: {
    id: string;
    name: string;
    email: string;
  };
};
