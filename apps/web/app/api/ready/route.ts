import { getGameRegistry, getWebSocketHub } from "@battleship/core";

export async function GET() {
  try {
    const registry = getGameRegistry();
    const hub = getWebSocketHub();

    if (!registry || !hub) {
      return Response.json(
        { status: "not_ready", reason: "Singletons not initialized" },
        { status: 503 }
      );
    }

    return Response.json({ status: "ready" }, { status: 200 });
  } catch (error) {
    return Response.json(
      {
        status: "error",
        reason:
          error instanceof Error ? error.message : "Unknown error",
      },
      { status: 503 }
    );
  }
}
