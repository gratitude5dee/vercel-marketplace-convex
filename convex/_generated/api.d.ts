/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as constitutions from "../constitutions.js";
import type * as jobs from "../jobs.js";
import type * as manager from "../manager.js";
import type * as managerActions from "../managerActions.js";
import type * as media from "../media.js";
import type * as metrics from "../metrics.js";
import type * as personas from "../personas.js";
import type * as phoneChannels from "../phoneChannels.js";
import type * as sessions from "../sessions.js";
import type * as tasks from "../tasks.js";
import type * as transcripts from "../transcripts.js";
import type * as webhooks from "../webhooks.js";
import type * as workerCalls from "../workerCalls.js";
import type * as workerDispatch from "../workerDispatch.js";
import type * as workspaces from "../workspaces.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  constitutions: typeof constitutions;
  jobs: typeof jobs;
  manager: typeof manager;
  managerActions: typeof managerActions;
  media: typeof media;
  metrics: typeof metrics;
  personas: typeof personas;
  phoneChannels: typeof phoneChannels;
  sessions: typeof sessions;
  tasks: typeof tasks;
  transcripts: typeof transcripts;
  webhooks: typeof webhooks;
  workerCalls: typeof workerCalls;
  workerDispatch: typeof workerDispatch;
  workspaces: typeof workspaces;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
