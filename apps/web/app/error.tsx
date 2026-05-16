"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 gap-4">
      <h1
        className="text-2xl font-bold"
        style={{ color: "var(--brand-danger)" }}
      >
        Something went wrong
      </h1>
      <p className="opacity-70 text-sm max-w-md text-center">
        An unexpected error occurred. You can try again or return to the lobby.
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="rounded px-4 py-2 font-semibold"
          style={{
            background: "var(--brand-primary)",
            color: "var(--surface-fg)",
          }}
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded px-4 py-2 font-semibold"
          style={{
            background: "var(--surface-secondary)",
            color: "var(--text-primary)",
          }}
        >
          Return to lobby
        </Link>
      </div>
    </main>
  );
}
