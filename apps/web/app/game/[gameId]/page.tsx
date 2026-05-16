import GameShell from "@/app/_components/game/GameShell";

export default async function GamePage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;
  return <GameShell gameId={gameId} />;
}
