import { ImageResponse } from "next/og";
import { SITE } from "@/lib/seo";

export const alt = `${SITE.name} - ${SITE.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Social card, rendered at build time. Drawn rather than shipped as a file so
 * it always matches the copy in lib/seo.ts.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #171717 0%, #000000 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 96,
            fontWeight: 700,
            letterSpacing: "-0.03em",
            display: "flex",
          }}
        >
          {SITE.name}
        </div>
        <div
          style={{
            marginTop: 16,
            fontSize: 44,
            opacity: 0.9,
            display: "flex",
          }}
        >
          {SITE.tagline}
        </div>
        <div
          style={{
            marginTop: 48,
            fontSize: 28,
            opacity: 0.75,
            display: "flex",
          }}
        >
          Live chat · Tickets · Announcements · Surveys · Telegram
        </div>
      </div>
    ),
    size,
  );
}
