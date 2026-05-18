import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "New Game",
  description:
    "Configure your fleet, pick a game mode, and start a new Battleship match.",
};

export default function NewLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
