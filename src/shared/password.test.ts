import assert from "node:assert/strict";
import { argon2Sync } from "node:crypto";
import { describe, it } from "node:test";
import { hash, hashSync, verify } from "./password.ts";

// Historical runtime fixture; provenance and baseline are recorded in CHANGELOG.md.
const LEGACY_HASH =
  "$argon2id$v=19$m=65536,t=2,p=1$0PsWqbRI8tV10TcvxbDeeynS+Soyh8yO/F6vqw4wni0$XwG+Kw9vaBi4APCmYX+M0xUqmvicn8JXxnqH+Z49NOQ";

void describe("PHC passwords", () => {
  void it("verifies the historical hash and rejects a wrong password", async () => {
    assert.equal(await verify("migration-fixture-password", LEGACY_HASH), true);
    assert.equal(await verify("wrong", LEGACY_HASH), false);
  });

  void it("produces the compatible defaults with fresh salts", async () => {
    const first = await hash("s3cret");
    const second = await hash("s3cret");
    assert.match(
      first,
      /^\$argon2id\$v=19\$m=65536,t=2,p=1\$[A-Za-z0-9+/]{43}\$[A-Za-z0-9+/]{43}$/u,
    );
    assert.notEqual(first, second);
    assert.equal(await verify("s3cret", first), true);
    assert.equal(await verify("s3cret", second), true);
    assert.equal(await verify("wrong", first), false);
  });

  void it("verifies the synchronous startup hash", async () => {
    assert.equal(await verify("dummy", hashSync("dummy")), true);
  });

  void it("reads costs and digest length from the stored hash", async () => {
    const nonce = Buffer.from("0123456789abcdef");
    const key = argon2Sync("argon2id", {
      message: "custom",
      nonce,
      memory: 8192,
      passes: 3,
      parallelism: 2,
      tagLength: 16,
    });
    const encoded = `$argon2id$v=19$m=8192,t=3,p=2$${nonce.toString("base64").replace(/=+$/u, "")}$${key.toString("base64").replace(/=+$/u, "")}`;
    assert.equal(await verify("custom", encoded), true);
    assert.equal(await verify("wrong", encoded), false);
  });
});

void describe("Invalid PHC passwords", () => {
  void it("rejects malformed PHC values and invalid parameters", async () => {
    for (const encoded of [
      "",
      "hash",
      LEGACY_HASH.replace("v=19", "v=16"),
      LEGACY_HASH.replace("m=65536", "m=0"),
      LEGACY_HASH.replace("t=2", "t=0"),
      LEGACY_HASH.replace("p=1", "p=0"),
      LEGACY_HASH.replace("0PsWqbRI8tV10TcvxbDeeynS+Soyh8yO/F6vqw4wni0", "A"),
    ]) {
      assert.equal(await verify("password", encoded), false);
    }
  });
});
