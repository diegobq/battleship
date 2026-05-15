import Link from "next/link";
import LobbyTable from "./_components/LobbyTable";

export default function HomePage() {
  return (
    <main className="flex-1 mx-auto w-full max-w-2xl px-4 py-8 sm:py-12 flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
          Battleship
        </h1>
        <p className="opacity-70 text-sm sm:text-base">
          Real-time online PvP. Create a game or join an open lobby.
        </p>
      </header>
      <Link
        href="/new"
        className="inline-block self-start rounded-md px-5 py-3 font-semibold"
        style={{
          background: "var(--brand-secondary)",
          color: "var(--surface-bg)",
        }}
      >
        + Create new game
      </Link>
      <LobbyTable />
    </main>
  );
}
