import { ipcMain } from "electron";
import { getTimeRecordbyBib, markTimeRecordAsSent } from "../database/timingRecords-db";
import { DatabaseStatus } from "../../shared/enums";
import { RunnerDB } from "../../shared/models";
import {
  OpenSplitTimeEnvironment,
  OpenSplitTimeRawTime,
  authenticate,
  authenticateSaved,
  clearAuthentication,
  getConnectionStatus,
  getEventGroup,
  getOpenSplitTimeEnvironment,
  getOrganization,
  getSavedCredentials,
  isOpenSplitTimePushPaused,
  listOpenSplitTimeEnvironments,
  pushTimeRecordUpdate,
  setOpenSplitTimeEnvironment,
  setOpenSplitTimePushPaused,
  submitRawTimes
} from "../services/opensplittime";
import { Handler } from "../types";

interface AuthenticateParams {
  email: string;
  password: string;
  saveCredentials: boolean;
}

interface EventGroupParams {
  eventGroupIdOrSlug: string;
}

interface SetEnvironmentParams {
  environment: string;
}

interface SetPushPausedParams {
  paused: boolean;
}

interface PushRecordParams {
  bibId: number;
}

interface SubmitRawTimesParams extends EventGroupParams {
  records: OpenSplitTimeRawTime[];
}

function requiredString(value: unknown, name: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${name} must be a non-empty string`);
  }

  return value.trim();
}

const authenticateWithOpenSplitTime: Handler<AuthenticateParams> = async (_, params) => {
  const email = requiredString(params?.email, "email");
  const password = requiredString(params?.password, "password");
  if (typeof params?.saveCredentials !== "boolean") {
    throw new TypeError("saveCredentials must be a boolean");
  }

  return authenticate(email, password, params.saveCredentials);
};

const authenticateWithSavedOpenSplitTime: Handler = () => authenticateSaved();
const getSavedOpenSplitTimeCredentials: Handler = () => getSavedCredentials();
const getOpenSplitTimeConnectionStatus: Handler = () => getConnectionStatus();
const getOpenSplitTimeOrganization: Handler = () => getOrganization();

const getOpenSplitTimeEnvironments: Handler = () => ({
  environments: listOpenSplitTimeEnvironments(),
  current: getOpenSplitTimeEnvironment()
});

const setOpenSplitTimeEnvironmentHandler: Handler<SetEnvironmentParams> = (_, params) => {
  const environment = requiredString(params?.environment, "environment");

  if (environment !== "production" && environment !== "staging") {
    throw new TypeError("environment must be 'production' or 'staging'");
  }

  setOpenSplitTimeEnvironment(environment as OpenSplitTimeEnvironment);
};

const getOpenSplitTimeEventGroup: Handler<EventGroupParams> = (_, params) => {
  return getEventGroup(requiredString(params?.eventGroupIdOrSlug, "eventGroupIdOrSlug"));
};

const getOpenSplitTimePushPaused: Handler = () => ({ paused: isOpenSplitTimePushPaused() });

const setOpenSplitTimePushPausedHandler: Handler<SetPushPausedParams> = (_, params) => {
  if (typeof params?.paused !== "boolean") {
    throw new TypeError("paused must be a boolean");
  }

  setOpenSplitTimePushPaused(params.paused);
};

const submitOpenSplitTimeRawTimes: Handler<SubmitRawTimesParams> = (_, params) => {
  const eventGroupIdOrSlug = requiredString(params?.eventGroupIdOrSlug, "eventGroupIdOrSlug");

  if (!Array.isArray(params?.records) || params.records.length === 0) {
    throw new TypeError("records must contain at least one raw time");
  }

  if (params.records.length > 100) {
    throw new RangeError("records must contain no more than 100 raw times");
  }

  return submitRawTimes(eventGroupIdOrSlug, params.records);
};

const pushOpenSplitTimeRecord: Handler<PushRecordParams> = async (_, params) => {
  if (typeof params?.bibId !== "number" || !Number.isFinite(params.bibId)) {
    throw new TypeError("bibId must be a number");
  }

  const [record, status] = getTimeRecordbyBib({ bibId: params.bibId } as RunnerDB);
  if (status !== DatabaseStatus.Success || !record) {
    throw new TypeError(`No timing record found for bib ${params.bibId}`);
  }

  const outcome = await pushTimeRecordUpdate(record, undefined, { force: true });
  if (outcome.pushed) markTimeRecordAsSent(record.bibId, true);

  return outcome;
};

export const initOpenSplitTimeHandlers = () => {
  ipcMain.handle("opensplittime-authenticate", authenticateWithOpenSplitTime);
  ipcMain.handle("opensplittime-authenticate-saved", authenticateWithSavedOpenSplitTime);
  ipcMain.handle("opensplittime-get-saved-credentials", getSavedOpenSplitTimeCredentials);
  ipcMain.handle("opensplittime-get-connection-status", getOpenSplitTimeConnectionStatus);
  ipcMain.handle("opensplittime-get-organization", getOpenSplitTimeOrganization);
  ipcMain.handle("opensplittime-get-event-group", getOpenSplitTimeEventGroup);
  ipcMain.handle("opensplittime-get-environments", getOpenSplitTimeEnvironments);
  ipcMain.handle("opensplittime-set-environment", setOpenSplitTimeEnvironmentHandler);
  ipcMain.handle("opensplittime-submit-raw-times", submitOpenSplitTimeRawTimes);
  ipcMain.handle("opensplittime-clear-authentication", clearAuthentication);
  ipcMain.handle("opensplittime-get-push-paused", getOpenSplitTimePushPaused);
  ipcMain.handle("opensplittime-set-push-paused", setOpenSplitTimePushPausedHandler);
  ipcMain.handle("opensplittime-push-record", pushOpenSplitTimeRecord);
};
