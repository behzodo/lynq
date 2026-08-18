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

/** Filename shown in the code block header, so it is obvious where this goes. */
export const FILENAME_BY_INTEGRATION: Record<string, string> = {
  html: "index.html",
  react: "ChatWidget.tsx",
  nextjs: "app/layout.tsx",
  javascript: "index.html",
};

export const PLACEMENT_BY_INTEGRATION: Record<string, string> = {
  html: "Paste this just before the closing </body> tag on every page that should show the widget.",
  react:
    "Render <ChatWidget /> once, high in your tree — in your root layout or App component.",
  nextjs:
    "Add it to your root layout so the widget is present on every route.",
  javascript:
    "Paste this anywhere after the page has a <body>, or inside your existing bundle.",
};

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

/**
 * The deployment the app SDK talks to - the same one this dashboard uses, so
 * the snippet is copy-pasteable instead of a placeholder to go and look up.
 */
const CONVEX_URL =
  process.env.NEXT_PUBLIC_CONVEX_URL || "https://your-deployment.convex.cloud";

export const REACT_NATIVE_INSTALL = `npm install lynq-react-native convex

# Recommended. Without it, people sign in again on every launch.
npx expo install @react-native-async-storage/async-storage`;

export const REACT_NATIVE_SCRIPT = `import AsyncStorage from "@react-native-async-storage/async-storage";
import { LynqProvider, LynqWidget, asyncStorage } from "lynq-react-native";

export default function App() {
  return (
    <LynqProvider
      convexUrl="${CONVEX_URL}"
      organizationId="{{ORGANIZATION_ID}}"
      storage={asyncStorage(AsyncStorage)}
    >
      <RootNavigator />
      <LynqWidget />
    </LynqProvider>
  );
}`;

/** Optional: attaching an image needs a picker from the host app. */
export const REACT_NATIVE_IMAGE_PICKER = `import * as ImagePicker from "expo-image-picker";

<LynqWidget
  pickImage={async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
    const asset = result.assets?.[0];

    return asset
      ? { uri: asset.uri, name: asset.fileName ?? undefined, mimeType: asset.mimeType }
      : null;
  }}
/>`;
