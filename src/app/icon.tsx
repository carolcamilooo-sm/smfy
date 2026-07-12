import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#08090d",
          borderRadius: 7,
        }}
      >
        <div
          style={{
            fontSize: 20,
            fontWeight: 800,
            color: "#c072ff",
          }}
        >
          S
        </div>
      </div>
    ),
    size
  );
}
