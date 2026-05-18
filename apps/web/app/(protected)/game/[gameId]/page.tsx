import type { Metadata } from "next";
import GameShell from "@/app/_components/game/GameShell";

export const metadata: Metadata = {
  title: "Game",
  description:
    "Place your fleet and open fire — your Battleship match is live.",
};

export default async function GamePage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;
  return <GameShell gameId={gameId} />;
}
