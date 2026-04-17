import { ImageResponse } from "next/og";

export const size = {
  width: 32,
  height: 32,
};
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        fontSize: 20,
        background: "#FF3300",
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
        border: "2px solid #111111",
        fontWeight: "bold",
        fontFamily: "sans-serif",
      }}
    >
      YT
    </div>,
    {
      ...size,
    },
  );
}
