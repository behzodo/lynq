export const EMBED_CONFIG = {
  WIDGET_URL: import.meta.env.VITE_WIDGET_URL || "http://localhost:3001",
  // Convex HTTP actions live on the .site domain, not .cloud
  CONVEX_HTTP_URL: import.meta.env.VITE_CONVEX_HTTP_URL || "https://dynamic-retriever-894.convex.site",
  DEFAULT_POSITION: "bottom-right" as const,
};
