import { getRunsCount, initHealthRepository, recordRun } from "./health.repository.js";
import type { HealthStatus } from "./health.types.js";

export type { HealthStatus } from "./health.types.js";

export const startHealthTracking = (): void => {
  initHealthRepository();
  recordRun();
};

export const getHealthStatus = (): HealthStatus => {
  const runsCount = getRunsCount();
  return {
    runs: runsCount,
    uptime: process.uptime(),
  };
};
