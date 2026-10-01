import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { parseCorsOrigin, parseHost } from "./config.ts";

void describe("parseCorsOrigin", () => {
  void it("defaults to * when unset", () => {
    assert.equal(parseCorsOrigin(undefined), "*");
  });

  void it("defaults to * when blank", () => {
    assert.equal(parseCorsOrigin("   "), "*");
  });

  void it("returns a single trimmed origin as a string", () => {
    assert.equal(parseCorsOrigin(" http://localhost:4200 "), "http://localhost:4200");
  });

  void it("returns several origins as a frozen list, dropping empty items", () => {
    const origins = parseCorsOrigin("http://a.test, http://b.test,,");

    assert.deepEqual(origins, ["http://a.test", "http://b.test"]);
    assert.ok(Object.isFrozen(origins));
  });

  void it("defaults to * when the value holds only commas", () => {
    assert.equal(parseCorsOrigin(" , ,"), "*");
  });
});

void describe("parseHost", () => {
  void it("returns undefined when unset or whitespace-only", () => {
    assert.equal(parseHost(undefined), undefined);
    assert.equal(parseHost("  "), undefined);
  });

  void it("returns the trimmed bind address", () => {
    assert.equal(parseHost(" 127.0.0.1 "), "127.0.0.1");
  });
});
