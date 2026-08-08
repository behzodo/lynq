import type { MetadataRoute } from "next";
import { SITE } from "@/lib/seo";

/**
 * Only publicly reachable routes belong here. The dashboard sits behind Clerk,
 * so listing it would just point crawlers at a sign-in redirect.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    {
      url: SITE.url,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE.url}/sign-in`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${SITE.url}/sign-up`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];
}
