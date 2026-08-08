import type { MetadataRoute } from "next";

/** The widget is iframe-only - nothing here should ever be crawled. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: "/",
    },
  };
}
