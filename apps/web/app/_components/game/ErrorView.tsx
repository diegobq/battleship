"use client";
import Link from "next/link";

export interface ErrorViewProps {
  title: string;
  detail?: string;
}

export default function ErrorView({ title, detail }: ErrorViewProps) {
  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 gap-4">
      <h1
        className="text-2xl font-bold"
        style={{ color: "var(--brand-danger)" }}
      >
        {title}
      </h1>
      {detail && (
        <p className="opacity-70 text-sm max-w-md text-center">{detail}</p>
      )}
      <Link
        href="/"
        className="rounded px-4 py-2 font-semibold"
        style={{
          background: "var(--brand-primary)",
          color: "var(--surface-bg)",
        }}
      >
        Back to lobby
      </Link>
    </main>
  );
}
