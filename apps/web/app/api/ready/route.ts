import { isRegistryInitialized, isHubInitialized } from "@battleship/core";

export async function GET() {
  if (!isRegistryInitialized() || !isHubInitialized()) {
    return Response.json(
      { status: "not_ready", reason: "Singletons not initialized" },
      { status: 503 },
    );
  }

  return Response.json({ status: "ready" }, { status: 200 });
}
