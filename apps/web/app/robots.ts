import type { MetadataRoute } from "next";
import { SITE } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Everything below is either behind auth or machine-only, so crawling it
      // only burns budget and risks indexing empty login redirects.
      disallow: [
        "/conversations",
        "/tickets",
        "/announcements",
        "/surveys",
        "/customization",
        "/integrations",
        "/org-selection",
        "/api/",
        "/mcp",
        "/sse",
        "/.well-known/",
      ],
    },
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
