import { getHub, getRegistry } from "@battleship/core";

export async function GET() {
  try {
    const registry = getRegistry();
    const hub = getHub();

    if (!registry || !hub) {
      return Response.json(
        { status: "not_ready", reason: "Singletons not initialized" },
        { status: 503 },
      );
    }

    return Response.json({ status: "ready" }, { status: 200 });
  } catch (error) {
    return Response.json(
      {
        status: "error",
        reason: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 503 },
    );
  }
}
