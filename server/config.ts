const DEFAULT_PORT = 3000;

export const dbPath = process.env["DB_PATH"] ?? "./data/demo.db";
export const port = process.env["PORT"] ? Number(process.env["PORT"]) : DEFAULT_PORT;
