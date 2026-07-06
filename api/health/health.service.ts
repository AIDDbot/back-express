import { getRunsCount, initHealthRepository, recordRun } from "./health.repository.js";
import type { HealthStatus } from "./health.types.js";

export type { HealthStatus };

export function startHealthTracking(): void {
  initHealthRepository();
  recordRun();
}

export function getHealthStatus(): HealthStatus {
  const runsCount = getRunsCount();
  return {
    uptime: process.uptime(),
    runs: runsCount,
  };
}
