import { describe, it, expect } from "vitest";
import { withRetry } from "../src/utils/withRetry.js";

describe("withRetry", () => {
  it("should retry on failure and eventually succeed", async () => {
    let tries = 0;
    const result = await withRetry(async () => {
      tries++;
      if (tries < 2) throw { code: "ECONNREFUSED" };
      return "ok";
    }, 3, 10);

    expect(result).toBe("ok");
    expect(tries).toBe(2);
  });

  it("should throw after all retries fail", async () => {
    let tries = 0;
    await expect(
      withRetry(async () => {
        tries++;
        throw { code: "ETIMEDOUT" };
      }, 2, 5)
    ).rejects.toThrow();
    expect(tries).toBe(2);
  });
});
