/** Wire format of GET /api/health */
export interface HealthStatus {
  uptime: number;
  runs: number;
}
