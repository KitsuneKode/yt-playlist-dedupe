import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "YT Dedupe - Nuke YouTube Playlist Duplicates Instantly";
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#F0F0EE", // Brutal background
        border: "24px solid #111111", // Thick border
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 60,
          left: 60,
          display: "flex",
          alignItems: "center",
          fontSize: 48,
          fontWeight: "bold",
          textTransform: "uppercase",
          color: "#111111",
          fontFamily: "sans-serif",
        }}
      >
        YT<span style={{ color: "#FF3300" }}>DDP</span>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          width: "80%",
        }}
      >
        <div
          style={{
            backgroundColor: "#FF3300",
            color: "white",
            fontSize: 24,
            fontWeight: "bold",
            textTransform: "uppercase",
            padding: "8px 16px",
            border: "4px solid #111111",
            marginBottom: 32,
            fontFamily: "monospace",
          }}
        >
          System Utility V1.0
        </div>
        <h1
          style={{
            fontSize: 100,
            fontWeight: "black",
            textTransform: "uppercase",
            color: "transparent",
            WebkitTextStroke: "4px #111111",
            lineHeight: 0.9,
            margin: 0,
            fontFamily: "sans-serif",
          }}
        >
          Nuke
        </h1>
        <h1
          style={{
            fontSize: 100,
            fontWeight: "black",
            textTransform: "uppercase",
            color: "#111111",
            lineHeight: 0.9,
            margin: 0,
            fontFamily: "sans-serif",
          }}
        >
          Duplicates.
        </h1>
        <h1
          style={{
            fontSize: 100,
            fontWeight: "black",
            textTransform: "uppercase",
            color: "#FF3300",
            lineHeight: 0.9,
            margin: 0,
            fontFamily: "sans-serif",
          }}
        >
          Instantly.
        </h1>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 60,
          right: 60,
          display: "flex",
          gap: "24px",
        }}
      >
        <div
          style={{
            display: "flex",
            padding: "16px 32px",
            backgroundColor: "#00E676",
            border: "4px solid #111111",
            color: "#111111",
            fontSize: 24,
            fontWeight: "bold",
            fontFamily: "sans-serif",
            textTransform: "uppercase",
            boxShadow: "8px 8px 0px 0px #111111",
          }}
        >
          Browser Extension
        </div>
        <div
          style={{
            display: "flex",
            padding: "16px 32px",
            backgroundColor: "white",
            border: "4px solid #111111",
            color: "#111111",
            fontSize: 24,
            fontWeight: "bold",
            fontFamily: "sans-serif",
            textTransform: "uppercase",
            boxShadow: "8px 8px 0px 0px #111111",
          }}
        >
          CLI Tool
        </div>
      </div>
    </div>,
    {
      ...size,
    },
  );
}
