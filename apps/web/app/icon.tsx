import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        background: "#0f172a",
        borderRadius: "5px",
        position: "relative",
      }}
    >
      {/* Hull */}
      <div
        style={{
          position: "absolute",
          bottom: 5,
          left: 3,
          right: 3,
          height: 9,
          background: "#94a3b8",
          borderRadius: "2px",
        }}
      />
      {/* Superstructure */}
      <div
        style={{
          position: "absolute",
          bottom: 14,
          left: 9,
          right: 9,
          height: 6,
          background: "#cbd5e1",
          borderRadius: "2px",
        }}
      />
      {/* Bridge */}
      <div
        style={{
          position: "absolute",
          bottom: 20,
          left: 13,
          right: 13,
          height: 5,
          background: "#e2e8f0",
          borderRadius: "2px",
        }}
      />
      {/* Mast */}
      <div
        style={{
          position: "absolute",
          bottom: 25,
          left: 15,
          width: 2,
          height: 6,
          background: "#f1f5f9",
        }}
      />
    </div>,
    { width: 32, height: 32 },
  );
}
