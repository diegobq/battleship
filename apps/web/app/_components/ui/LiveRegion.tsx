"use client";

interface LiveRegionProps {
  sentences: string[];
}

export function LiveRegion({ sentences }: LiveRegionProps) {
  return (
    <div role="log" aria-live="polite" aria-atomic="false" className="sr-only">
      {sentences.map((s, i) => (
        <p key={i}>{s}</p>
      ))}
    </div>
  );
}
