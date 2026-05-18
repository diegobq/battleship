import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../env";

function buildPayload(playerId: string, gameId: string): string {
  return `${playerId}:${gameId}`;
}

export function mintToken(
  playerId: string,
  gameId: string,
  secret: string,
): string {
  return createHmac("sha256", secret)
    .update(buildPayload(playerId, gameId))
    .digest("hex");
}

export function verifyToken(
  token: string,
  playerId: string,
  gameId: string,
  secret: string,
): boolean {
  const expected = mintToken(playerId, gameId, secret);
  // HMAC-SHA256 always produces 64 hex chars; reject anything else before
  // calling timingSafeEqual to avoid buffer-length mismatches.
  if (token.length !== expected.length) return false;
  try {
    return timingSafeEqual(
      Buffer.from(token, "hex"),
      Buffer.from(expected, "hex"),
    );
  } catch {
    return false;
  }
}

export function getSessionSecret(): string {
  if (env.SESSION_SECRET) return env.SESSION_SECRET;
  if (env.NODE_ENV !== "production") return "dev-only-secret-change-in-prod";
  throw new Error(
    "SESSION_SECRET environment variable must be set in production",
  );
}

export function extractTokenFromCookies(
  cookieHeader: string | undefined,
  gameId: string,
): string | undefined {
  if (!cookieHeader) return undefined;
  const name = `battleship_session_${gameId}`;
  const match = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : undefined;
}
