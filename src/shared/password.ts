import { argon2, argon2Sync, randomBytes, timingSafeEqual, type Argon2Parameters } from "node:crypto";

const DEFAULTS = { memory: 65536, passes: 2, parallelism: 1, tagLength: 32 };

const derive = (parameters: Argon2Parameters): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    argon2("argon2id", parameters, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });

const encode = (salt: Buffer, key: Buffer): string =>
  `$argon2id$v=19$m=${DEFAULTS.memory},t=${DEFAULTS.passes},p=${DEFAULTS.parallelism}$${salt.toString("base64").replace(/=+$/u, "")}$${key.toString("base64").replace(/=+$/u, "")}`;

export const hash = async (message: string): Promise<string> => {
  const nonce = randomBytes(32);
  const key = await derive({ ...DEFAULTS, message, nonce });
  return encode(nonce, key);
};

/** Used once at startup for the unknown-email timing parity hash. */
export const hashSync = (message: string): string => {
  const nonce = randomBytes(32);
  return encode(nonce, argon2Sync("argon2id", { ...DEFAULTS, message, nonce }));
};

const decodeBase64 = (value: string): Buffer => {
  const buffer = Buffer.from(value, "base64");
  if (buffer.toString("base64").replace(/=+$/u, "") !== value) {
    throw new Error("Invalid PHC base64");
  }
  return buffer;
};

export const verify = async (message: string, encoded: string): Promise<boolean> => {
  const match = /^\$argon2id\$v=19\$m=(\d+),t=(\d+),p=(\d+)\$([A-Za-z0-9+/]+)\$([A-Za-z0-9+/]+)$/u.exec(encoded);
  if (!match) return false;
  try {
    const [, memory, passes, parallelism, salt, digest] = match;
    const nonce = decodeBase64(salt!);
    const expected = decodeBase64(digest!);
    const actual = await derive({
      message,
      nonce,
      memory: Number(memory),
      passes: Number(passes),
      parallelism: Number(parallelism),
      tagLength: expected.length,
    });
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
};

/** Mutable facade so login timing tests can spy on the actual verifier. */
export const password = { hash, hashSync, verify };
