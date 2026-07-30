import type { Express } from "express";
import { exec as execCallback } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { setTimeout as delay } from "node:timers/promises";
import { promisify } from "node:util";

const exec = promisify(execCallback);
const EXIT_FAILURE = 1;
const FIRST_ITEM_INDEX = 0;
const LAST_ITEM_OFFSET = 1;
const RETRY_DELAY_MS = 300;

interface PortConflict {
  pid: number;
  processName: string;
}

const parseWindowsPid = (netstatOutput: string, port: number): number | undefined => {
  const listeningLine = netstatOutput
    .split("\n")
    .find((line) => line.includes(`:${port} `) && line.includes("LISTENING"));
  if (!listeningLine) {
    return undefined;
  }
  const pidText = listeningLine.trim().split(/\s+/u).at(-LAST_ITEM_OFFSET);
  if (!pidText) {
    return undefined;
  }
  const pid = Number(pidText);
  if (Number.isNaN(pid)) {
    return undefined;
  }
  return pid;
};

const findWindowsConflict = async (port: number): Promise<PortConflict | undefined> => {
  const { stdout: netstatOutput } = await exec("netstat -ano");
  const pid = parseWindowsPid(netstatOutput, port);
  if (pid === undefined) {
    return undefined;
  }
  const { stdout: taskListOutput } = await exec(`tasklist /FI "PID eq ${pid}" /FO CSV /NH`);
  const processName =
    taskListOutput.split(",")[FIRST_ITEM_INDEX]?.replaceAll('"', "") ?? "unknown process";
  return { pid, processName };
};

const findPosixConflict = async (port: number): Promise<PortConflict | undefined> => {
  const { stdout: pidOutput } = await exec(`lsof -i :${port} -sTCP:LISTEN -t`);
  const pid = Number(pidOutput.trim().split("\n")[FIRST_ITEM_INDEX]);
  if (Number.isNaN(pid)) {
    return undefined;
  }
  const { stdout: commandOutput } = await exec(`ps -p ${pid} -o comm=`);
  return { pid, processName: commandOutput.trim() };
};

/** Best-effort lookup; swallows errors from missing tools (e.g. lsof) so callers get a graceful fallback. */
const findPortConflict = async (port: number): Promise<PortConflict | undefined> => {
  try {
    if (process.platform === "win32") {
      return await findWindowsConflict(port);
    }
    return await findPosixConflict(port);
  } catch {
    return undefined;
  }
};

const killProcess = async (pid: number): Promise<void> => {
  let command = `kill -9 ${pid}`;
  if (process.platform === "win32") {
    command = `taskkill /F /PID ${pid}`;
  }
  await exec(command);
};

const confirm = async (question: string): Promise<boolean> => {
  if (!process.stdin.isTTY) {
    return false;
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(question);
  rl.close();
  return /^y(?<es>es)?$/iu.test(answer.trim());
};

const exitForUnknownConflict = (port: number): void => {
  process.stderr.write(`Port ${port} is already in use. Stop the process using it and retry.\n`);
  process.exit(EXIT_FAILURE);
};

const confirmRetry = async (pid: number): Promise<void> => {
  const shouldKill = await confirm(`Kill PID ${pid} and retry? (y/N) `);
  if (!shouldKill) {
    process.exit(EXIT_FAILURE);
  }
};

const handlePortInUse = async (app: Express, port: number): Promise<void> => {
  const conflict = await findPortConflict(port);
  if (!conflict) {
    exitForUnknownConflict(port);
    return;
  }

  process.stderr.write(
    `Port ${port} is already in use by ${conflict.processName} (PID ${conflict.pid}).\n`,
  );
  await confirmRetry(conflict.pid);
  await killProcess(conflict.pid);
  await delay(RETRY_DELAY_MS);
  listen(app, port);
};

const onServerError = (app: Express, port: number, error: NodeJS.ErrnoException): void => {
  if (error.code === "EADDRINUSE") {
    void handlePortInUse(app, port);
    return;
  }
  process.stderr.write(`Failed to start server: ${error.message}\n`);
  process.exit(EXIT_FAILURE);
};

export const listen = (app: Express, port: number): void => {
  const server = app.listen(port, () =>
    process.stdout.write(`Check server health at http://localhost:${port}/api/health\n`),
  );

  server.on("error", (error: NodeJS.ErrnoException) => {
    onServerError(app, port, error);
  });
};
