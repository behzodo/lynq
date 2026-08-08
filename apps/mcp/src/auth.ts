import { spawn } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";

import {
  AUTHORIZATION_ENDPOINT,
  CALLBACK_PORTS,
  CREDENTIALS_DIR,
  CREDENTIALS_PATH,
  OAUTH_CLIENT_ID,
  OAUTH_SCOPES,
  TOKEN_ENDPOINT,
} from "./config.js";

type Credentials = {
  accessToken: string;
  refreshToken?: string;
  /** Epoch milliseconds. */
  expiresAt: number;
};

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
};

/** Refresh a little early so a call never races the expiry. */
const EXPIRY_SKEW_MS = 60_000;

const base64Url = (input: Buffer) =>
  input
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

function readCredentials(): Credentials | null {
  try {
    return JSON.parse(readFileSync(CREDENTIALS_PATH, "utf8")) as Credentials;
  } catch {
    return null;
  }
}

function writeCredentials(credentials: Credentials) {
  mkdirSync(CREDENTIALS_DIR, { recursive: true });
  // 0600: the refresh token is a long-lived credential
  writeFileSync(CREDENTIALS_PATH, JSON.stringify(credentials, null, 2), {
    mode: 0o600,
  });
}

export function clearCredentials() {
  try {
    writeFileSync(CREDENTIALS_PATH, "{}", { mode: 0o600 });
  } catch {
    // Nothing stored, nothing to clear
  }
}

function openBrowser(url: string) {
  const command =
    process.platform === "win32"
      ? { cmd: "cmd", args: ["/c", "start", "", url] }
      : process.platform === "darwin"
        ? { cmd: "open", args: [url] }
        : { cmd: "xdg-open", args: [url] };

  try {
    spawn(command.cmd, command.args, { detached: true, stdio: "ignore" }).unref();
  } catch {
    // Headless machine: the printed URL is the fallback
  }
}

/**
 * Binds the redirect listener before the authorize URL is built - the URL has
 * to name the port that is actually listening, and only the registered ports
 * are accepted by Clerk.
 */
function startCallbackServer(expectedState: string): Promise<{
  port: number;
  code: Promise<string>;
  close: () => void;
}> {
  return new Promise((resolveServer, rejectServer) => {
    let index = 0;
    let resolve: (code: string) => void;
    let reject: (error: Error) => void;

    const code = new Promise<string>((res, rej) => {
      resolve = res;
      reject = rej;
    });

    const tryPort = () => {
      const port = CALLBACK_PORTS[index];

      if (port === undefined) {
        rejectServer(
          new Error(
            `Could not listen on any of ports ${CALLBACK_PORTS.join(", ")}. Close whatever is using them and try again.`,
          ),
        );
        return;
      }

      const server = createServer((req, res) => {
        const url = new URL(req.url ?? "/", `http://localhost:${port}`);

        if (url.pathname !== "/callback") {
          res.writeHead(404).end();
          return;
        }

        const error = url.searchParams.get("error");
        const returnedCode = url.searchParams.get("code");
        const state = url.searchParams.get("state");

        const finish = (title: string, body: string) => {
          res.writeHead(200, { "Content-Type": "text/html" }).end(
            `<!doctype html><meta charset="utf-8"><title>${title}</title>
             <body style="font-family:system-ui;display:grid;place-items:center;height:100vh;margin:0;background:#f8fafc">
               <div style="text-align:center">
                 <h1 style="color:#1d4ed8;font-size:20px">${title}</h1>
                 <p style="color:#475569">${body}</p>
               </div>
             </body>`,
          );
        };

        if (error) {
          finish("Sign-in failed", error);
          reject(new Error(`Authorization failed: ${error}`));
          return;
        }

        // Guards against another page tricking this local server into
        // completing a flow it did not start
        if (!state || state !== expectedState) {
          finish("Sign-in failed", "State mismatch");
          reject(new Error("Authorization failed: state mismatch"));
          return;
        }

        if (!returnedCode) {
          finish("Sign-in failed", "No authorization code returned");
          reject(new Error("Authorization failed: no code"));
          return;
        }

        finish(
          "Lynq connected",
          "You can close this tab and return to your terminal.",
        );

        resolve(returnedCode);
      });

      server.once("error", () => {
        index += 1;
        tryPort();
      });

      server.listen(port, "127.0.0.1", () => {
        resolveServer({
          port,
          code,
          close: () => server.close(),
        });
      });
    };

    tryPort();
  });
}

async function exchange(body: Record<string, string>): Promise<Credentials> {
  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
  });

  if (!response.ok) {
    throw new Error(
      `Token request failed (${response.status}): ${await response.text()}`,
    );
  }

  const token = (await response.json()) as TokenResponse;

  return {
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    expiresAt: Date.now() + (token.expires_in ?? 3600) * 1000,
  };
}

/** Full interactive sign-in: opens the browser and waits for the redirect. */
export async function login(): Promise<Credentials> {
  const verifier = base64Url(randomBytes(32));
  const challenge = base64Url(createHash("sha256").update(verifier).digest());
  const state = base64Url(randomBytes(16));

  const server = await startCallbackServer(state);
  const redirectUri = `http://localhost:${server.port}/callback`;

  const authorizeUrl = new URL(AUTHORIZATION_ENDPOINT);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("client_id", OAUTH_CLIENT_ID);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("scope", OAUTH_SCOPES);
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set("code_challenge", challenge);
  authorizeUrl.searchParams.set("code_challenge_method", "S256");

  console.error("\nOpening your browser to sign in to Lynq…");
  console.error(`If it does not open, visit:\n${authorizeUrl.toString()}\n`);

  openBrowser(authorizeUrl.toString());

  const code = await server.code;

  try {
    const credentials = await exchange({
      grant_type: "authorization_code",
      client_id: OAUTH_CLIENT_ID,
      code,
      redirect_uri: redirectUri,
      code_verifier: verifier,
    });

    writeCredentials(credentials);
    console.error("Signed in to Lynq.\n");

    return credentials;
  } finally {
    server.close();
  }
}

async function refresh(credentials: Credentials): Promise<Credentials | null> {
  if (!credentials.refreshToken) {
    return null;
  }

  try {
    const refreshed = await exchange({
      grant_type: "refresh_token",
      client_id: OAUTH_CLIENT_ID,
      refresh_token: credentials.refreshToken,
    });

    // Clerk may not return a new refresh token; keep the existing one
    const merged: Credentials = {
      ...refreshed,
      refreshToken: refreshed.refreshToken ?? credentials.refreshToken,
    };

    writeCredentials(merged);

    return merged;
  } catch {
    return null;
  }
}

/**
 * Returns a usable access token, signing the user in if there is no valid one.
 * `interactive` is false for calls that must not hijack the terminal.
 */
export async function getAccessToken({
  forceLogin = false,
}: { forceLogin?: boolean } = {}): Promise<string> {
  if (forceLogin) {
    return (await login()).accessToken;
  }

  const stored = readCredentials();

  if (stored?.accessToken && stored.expiresAt - EXPIRY_SKEW_MS > Date.now()) {
    return stored.accessToken;
  }

  if (stored?.refreshToken) {
    const refreshed = await refresh(stored);

    if (refreshed) {
      return refreshed.accessToken;
    }
  }

  return (await login()).accessToken;
}

/** Drops the cached access token so the next call refreshes or re-logs in. */
export async function reauthenticate(): Promise<string> {
  const stored = readCredentials();

  if (stored?.refreshToken) {
    const refreshed = await refresh(stored);

    if (refreshed) {
      return refreshed.accessToken;
    }
  }

  return (await login()).accessToken;
}
