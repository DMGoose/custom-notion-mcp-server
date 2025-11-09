import { describe, it, expect, beforeEach } from "vitest";
import { SimpleCache } from "../src/utils/cache.js";

describe("SimpleCache", () => {
  let cache: SimpleCache;

  beforeEach(() => {
    cache = new SimpleCache(0.001); // TTL 0.06s
  });

  it("should set and get values", () => {
    cache.set("foo", "bar");
    expect(cache.get("foo")).toBe("bar");
  });

  it("should expire values after TTL", async () => {
    cache.set("foo", "bar");
    await new Promise((r) => setTimeout(r, 80)); // 80ms
    expect(cache.get("foo")).toBeNull();
  });

  it("should clear all entries", () => {
    cache.set("a", "b");
    cache.clear();
    expect(cache.getStats().size).toBe(0);
  });
});
