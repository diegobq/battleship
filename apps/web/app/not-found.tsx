import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 gap-4">
      <h1
        className="text-2xl font-bold"
        style={{ color: "var(--brand-danger)" }}
      >
        404 — Not Found
      </h1>
      <p className="opacity-70 text-sm max-w-md text-center">
        The page you&apos;re looking for doesn&apos;t exist.
      </p>
      <Link
        href="/"
        className="rounded px-4 py-2 font-semibold"
        style={{
          background: "var(--brand-primary)",
          color: "var(--surface-fg)",
        }}
      >
        Back to lobby
      </Link>
    </main>
  );
}
