import {
  metadataCorsOptionsRequestHandler,
  protectedResourceHandlerClerk,
} from "@clerk/mcp-tools/next";

// Returned in the WWW-Authenticate challenge on a 401, which is what starts the
// client's OAuth flow. Must stay public.
const handler = protectedResourceHandlerClerk({
  scopes_supported: ["profile", "email"],
});
const corsHandler = metadataCorsOptionsRequestHandler();

export { handler as GET, corsHandler as OPTIONS };
