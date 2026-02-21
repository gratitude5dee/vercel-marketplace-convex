import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

const internalApi = internal as any;

crons.interval(
  "morphicfields cleanup stale sessions",
  { hours: 1 },
  internalApi.jobs.cleanupStaleSessions,
  {},
);

crons.interval(
  "morphicfields recover stuck tasks",
  { minutes: 30 },
  internalApi.jobs.recoverStuckTasks,
  {},
);

crons.cron(
  "morphicfields daily metric rollup",
  "0 1 * * *",
  internalApi.jobs.rollupDailyMetrics,
  {},
);

crons.interval(
  "morphicfields cleanup orphan media",
  { hours: 12 },
  internalApi.jobs.cleanupOrphanMedia,
  {},
);

crons.interval(
  "morphicfields reconcile webhook retries",
  { minutes: 20 },
  internalApi.jobs.reconcileWebhookRetries,
  {},
);

export default crons;
