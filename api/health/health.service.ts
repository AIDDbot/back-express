import { recordRun, getRunsCount } from "./health.repository.js";
import type { HealthStatus } from "./health.types.js";

export type { HealthStatus };

recordRun();

export function getHealthStatus(): HealthStatus {
  const runsCount = getRunsCount();
  return {
    uptime: process.uptime(),
    runs: runsCount,
  };
}
