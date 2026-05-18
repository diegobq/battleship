import { ImageResponse } from "next/og";

export const alt = "Battleship — Real-time online PvP";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        background: "#0f172a",
        color: "#f1f5f9",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ fontSize: 80, fontWeight: 800, letterSpacing: "-3px" }}>
        Battleship
      </div>
      <div style={{ fontSize: 32, color: "#94a3b8", marginTop: 16 }}>
        Real-time online PvP
      </div>
    </div>,
    { width: 1200, height: 630 },
  );
}
