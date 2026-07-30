const DEFAULT_PORT = 3000;

export const dbPath = process.env["DB_PATH"] ?? "./data/demo.db";

const envPort = process.env["PORT"];
let resolvedPort = DEFAULT_PORT;
if (envPort) {
	resolvedPort = Number(envPort);
}

export const port = resolvedPort;
