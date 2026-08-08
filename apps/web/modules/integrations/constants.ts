export const INTEGRATIONS = [
  {
    id: "html",
    title: "HTML",
    icon: "/languages/html5.svg",
  },
  {
    id: "react",
    title: "React",
    icon: "/languages/react.svg",
  },
  {
    id: "nextjs",
    title: "Next.js",
    icon: "/languages/nextjs.svg",
  },
  {
    id: "javascript",
    title: "JavaScript",
    icon: "/languages/javascript.svg",
  },
];

export type IntegrationId = (typeof INTEGRATIONS)[number]["id"];

// Where the embed script is hosted. Override per environment so these
// snippets never drift from the deployed URL.
const EMBED_SCRIPT_URL =
  process.env.NEXT_PUBLIC_EMBED_SCRIPT_URL ||
  "https://lynq-embed.vercel.app/widget.js";

export const HTML_SCRIPT = `<script src="${EMBED_SCRIPT_URL}" data-organization-id="{{ORGANIZATION_ID}}"></script>`;

export const JAVASCRIPT_SCRIPT = `<script>
  (function () {
    var script = document.createElement("script");
    script.src = "${EMBED_SCRIPT_URL}";
    script.setAttribute("data-organization-id", "{{ORGANIZATION_ID}}");
    document.body.appendChild(script);
  })();
</script>`;

// React renders <script> tags inertly, so the tag has to be injected
export const REACT_SCRIPT = `import { useEffect } from "react";

export function ChatWidget() {
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "${EMBED_SCRIPT_URL}";
    script.setAttribute("data-organization-id", "{{ORGANIZATION_ID}}");
    document.body.appendChild(script);

    return () => script.remove();
  }, []);

  return null;
}`;

export const NEXTJS_SCRIPT = `import Script from "next/script";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Script
          src="${EMBED_SCRIPT_URL}"
          data-organization-id="{{ORGANIZATION_ID}}"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}`;
