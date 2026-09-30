import { strict as assert } from "node:assert";
import type { Express } from "express";
import { mock, it } from "node:test";
import { setTimeout as wait } from "node:timers/promises";
import { API_BASE_PATH } from "../shared/config.js";
import { listen, type ListenerRuntime } from "./listener.js";

interface Fixture {
  calls: unknown[][];
  listeners: Array<(error: NodeJS.ErrnoException) => void>;
  start: (port: number) => void;
}

const fixture = (testRuntime: ListenerRuntime): Fixture => {
  const calls: unknown[][] = [];
  const listeners: Array<(error: NodeJS.ErrnoException) => void> = [];
  const app = {
    listen: (...args: unknown[]) => {
      calls.push(args);
      return {
        on: (_event: string, listener: (error: NodeJS.ErrnoException) => void) => {
          listeners.push(listener);
        },
      };
    },
  } as unknown as Express;
  return {
    calls,
    listeners,
    start: (port) => {
      listen(app, port, testRuntime);
    },
  };
};

const runtime = (overrides: Partial<ListenerRuntime> = {}): ListenerRuntime => ({
  confirm: () => Promise.resolve(false),
  delay: () => Promise.resolve(),
  exec: () => Promise.resolve({ stdout: "", stderr: "" }),
  exit: (code) => process.exit(code),
  host: undefined,
  platform: "linux",
  ...overrides,
});

const startError = (code: string): NodeJS.ErrnoException =>
  Object.assign(new Error("error"), { code });
const waitForHandler = async (): Promise<void> => {
  await wait(0);
};
const invokeCallback = (calls: unknown[][]): void => {
  const args = calls[0];
  assert.ok(args);
  const callback = args.at(-1);
  assert.equal(typeof callback, "function");
  (callback as () => void)();
};

void it("writes the health URL for a wildcard host", () => {
  const output: string[] = [];
  const { start, calls } = fixture(runtime());
  mock.method(process.stdout, "write", (chunk: string | Uint8Array) => {
    output.push(String(chunk));
    return true;
  });
  try {
    start(4321);
    invokeCallback(calls);
    assert.ok(output.some((line) => line.includes(`http://localhost:4321${API_BASE_PATH}/health`)));
  } finally {
    mock.restoreAll();
  }
});

void it("uses the explicit host and brackets IPv6 in the health URL", () => {
  const output: string[] = [];
  const { start, calls } = fixture(runtime({ host: "2001:db8::1" }));
  mock.method(process.stdout, "write", (chunk: string | Uint8Array) => {
    output.push(String(chunk));
    return true;
  });
  try {
    start(8080);
    assert.deepEqual(calls[0]?.slice(0, 2), [8080, "2001:db8::1"]);
    invokeCallback(calls);
    assert.ok(
      output.some((line) => line.includes(`http://[2001:db8::1]:8080${API_BASE_PATH}/health`)),
    );
  } finally {
    mock.restoreAll();
  }
});

void it("exits on other server errors", () => {
  const { start, listeners } = fixture(
    runtime({
      exit: (code): never => {
        throw new Error(`exit:${code}`);
      },
    }),
  );
  start(4321);
  const handler = listeners[0];
  assert.ok(handler);
  assert.throws(() => {
    handler(startError("EACCES"));
  }, /exit:1/u);
});

void it("exits when a Windows port conflict cannot be identified", async () => {
  let exitCode: number | undefined;
  mock.method(process, "exit", (code: number) => {
    exitCode = code;
    return undefined as never;
  });
  const testRuntime = runtime({
    platform: "win32",
    exec: () => Promise.resolve({ stdout: "not a pid", stderr: "" }),
  });
  const { start, listeners } = fixture(testRuntime);
  start(4321);
  listeners[0]?.(startError("EADDRINUSE"));
  await waitForHandler();
  assert.equal(exitCode, 1);
  mock.restoreAll();
});

void it("kills a Windows conflict and retries listening", async () => {
  const commands: string[] = [];
  const waits: number[] = [];
  const testRuntime = runtime({
    platform: "win32",
    confirm: () => Promise.resolve(true),
    exec: (command) => {
      commands.push(command);
      if (command === "netstat -ano")
        return Promise.resolve({
          stdout: " TCP 0.0.0.0:4321 0.0.0.0:0 LISTENING 1234\n",
          stderr: "",
        });
      if (command.startsWith("tasklist"))
        return Promise.resolve({ stdout: '"sample.exe","1","Console"', stderr: "" });
      return Promise.resolve({ stdout: "", stderr: "" });
    },
    delay: async (milliseconds) => {
      await Promise.resolve();
      waits.push(milliseconds);
    },
  });
  const { start, calls, listeners } = fixture(testRuntime);
  start(4321);
  listeners[0]?.(startError("EADDRINUSE"));
  await waitForHandler();
  assert.deepEqual(commands, [
    "netstat -ano",
    'tasklist /FI "PID eq 1234" /FO CSV /NH',
    "taskkill /F /PID 1234",
  ]);
  assert.deepEqual(waits, [300]);
  assert.equal(calls.length, 2);
});

void it("exits when the user declines to kill a POSIX conflict", async () => {
  const commands: string[] = [];
  let exitCode: number | undefined;
  mock.method(process, "exit", (code: number) => {
    exitCode = code;
    return undefined as never;
  });
  const testRuntime = runtime({
    confirm: () => Promise.resolve(false),
    exec: (command) => {
      commands.push(command);
      return Promise.resolve({
        stdout: command.startsWith("lsof") ? "456\n" : "worker\n",
        stderr: "",
      });
    },
  });
  const { start, listeners } = fixture(testRuntime);
  start(9000);
  listeners[0]?.(startError("EADDRINUSE"));
  await waitForHandler();
  assert.deepEqual(commands, [
    "lsof -i :9000 -sTCP:LISTEN -t",
    "ps -p 456 -o comm=",
    "kill -9 456",
  ]);
  assert.equal(exitCode, 1);
  mock.restoreAll();
});

void it("handles command failures as unknown conflicts", async () => {
  let exitCode: number | undefined;
  mock.method(process, "exit", (code: number) => {
    exitCode = code;
    return undefined as never;
  });
  const testRuntime = runtime({
    exec: () => Promise.reject(new Error("command missing")),
  });
  const { start, listeners } = fixture(testRuntime);
  start(4321);
  listeners[0]?.(startError("EADDRINUSE"));
  await waitForHandler();
  assert.equal(exitCode, 1);
  mock.restoreAll();
});
