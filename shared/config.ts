const DEFAULT_PORT = 3000;

export const dbPath = process.env["DB_PATH"] ?? "./data/astrobookings.db";
export const port = process.env["PORT"] ?? DEFAULT_PORT;
