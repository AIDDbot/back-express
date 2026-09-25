import { createLogger } from "../../shared/logger.js";
import { getRunsCount, initHealthRepository, recordRun } from "./health.repository.js";
import type { HealthStatus } from "./health.types.js";

export type { HealthStatus } from "./health.types.js";

const log = createLogger("health");

export const startHealthTracking = (): void => {
  initHealthRepository();
  recordRun();
  log.info("Health tracking started");
};

export const getHealthStatus = (): HealthStatus => {
  const runsCount = getRunsCount();
  const uptime = process.uptime();
  log.debug(`Health check: runs=${runsCount}, uptime=${uptime.toFixed(2)}s`);
  return {
    runs: runsCount,
    uptime,
  };
};
