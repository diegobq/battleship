import { describe, it, expect } from "vitest";
import { parseEnv } from "../env";

describe("parseEnv", () => {
  it("returns defaults when only NODE_ENV is provided", () => {
    const result = parseEnv({ NODE_ENV: "test" });
    expect(result.NODE_ENV).toBe("test");
    expect(result.PORT).toBe(3000);
    expect(result.HOSTNAME).toBe("localhost");
    expect(result.SESSION_SECRET).toBeUndefined();
    expect(result.ALLOWED_ORIGINS).toBeUndefined();
  });

  it("coerces PORT string to number", () => {
    const result = parseEnv({ NODE_ENV: "test", PORT: "4000" });
    expect(result.PORT).toBe(4000);
  });

  it("throws when PORT is not a valid number", () => {
    expect(() => parseEnv({ NODE_ENV: "test", PORT: "not-a-port" })).toThrow(
      "Invalid environment configuration",
    );
  });

  it("throws when PORT is out of range", () => {
    expect(() => parseEnv({ NODE_ENV: "test", PORT: "0" })).toThrow(
      "Invalid environment configuration",
    );
    expect(() => parseEnv({ NODE_ENV: "test", PORT: "65536" })).toThrow(
      "Invalid environment configuration",
    );
  });

  it("throws when NODE_ENV is an unknown value", () => {
    expect(() => parseEnv({ NODE_ENV: "staging" as "development" })).toThrow(
      "Invalid environment configuration",
    );
  });

  it("passes through SESSION_SECRET when set", () => {
    const result = parseEnv({ NODE_ENV: "test", SESSION_SECRET: "my-secret" });
    expect(result.SESSION_SECRET).toBe("my-secret");
  });

  it("passes through ALLOWED_ORIGINS when set", () => {
    const result = parseEnv({
      NODE_ENV: "test",
      ALLOWED_ORIGINS: "https://example.com",
    });
    expect(result.ALLOWED_ORIGINS).toBe("https://example.com");
  });

  it("uses custom HOSTNAME", () => {
    const result = parseEnv({ NODE_ENV: "test", HOSTNAME: "0.0.0.0" });
    expect(result.HOSTNAME).toBe("0.0.0.0");
  });
});
