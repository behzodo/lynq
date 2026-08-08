import { NextResponse } from 'next/server';
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

/**
 * The MCP endpoint authenticates itself with an OAuth bearer token, and the
 * .well-known documents must stay reachable without a session - they are how a
 * client discovers where to send the user to sign in. Redirecting either to
 * /sign-in would break the OAuth flow before it starts.
 */
const isMcpRoute = createRouteMatcher([
  "/mcp(.*)",
  "/sse(.*)",
  "/message(.*)",
  "/.well-known(.*)",
]);

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
]);

const isOrgFreeRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/org-selection(.*)"
]);

export default clerkMiddleware(async (auth, req) => {
  if (isMcpRoute(req)) {
    return NextResponse.next();
  }

  const { userId, orgId } = await auth();

  if (!isPublicRoute(req)) {
    await auth.protect();
  }

  if (userId && !orgId && !isOrgFreeRoute(req)) {
    const searchParams = new URLSearchParams({ redirectUrl: req.url });

    const orgSelection = new URL(
      `/org-selection?${searchParams.toString()}`,
      req.url,
    );

    return NextResponse.redirect(orgSelection);
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
