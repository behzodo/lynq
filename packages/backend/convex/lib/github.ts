/**
 * GitHub App REST + GraphQL helpers.
 *
 * Auth is two-step: sign a short-lived JWT with the app's private key, exchange
 * it for an installation access token, then call the API with that. Installation
 * tokens last an hour and are minted per call rather than stored - they are
 * cheap, and storing them buys nothing.
 */

const GITHUB_API = "https://api.github.com";

const base64Url = (input: ArrayBuffer | string) => {
  const bytes =
    typeof input === "string"
      ? new TextEncoder().encode(input)
      : new Uint8Array(input);

  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
};

/** DER length octets for a given content length. */
function derLength(length: number): number[] {
  if (length < 0x80) {
    return [length];
  }

  const bytes: number[] = [];
  let remaining = length;

  while (remaining > 0) {
    bytes.unshift(remaining & 0xff);
    remaining >>= 8;
  }

  return [0x80 | bytes.length, ...bytes];
}

/**
 * GitHub hands out PKCS#1 keys ("BEGIN RSA PRIVATE KEY") but Web Crypto only
 * imports PKCS#8, so the PKCS#1 body is wrapped in the PKCS#8 envelope:
 *
 *   SEQUENCE { INTEGER 0, AlgorithmIdentifier { rsaEncryption, NULL }, OCTET STRING }
 */
function wrapPkcs1AsPkcs8(pkcs1: Uint8Array): Uint8Array {
  // AlgorithmIdentifier for rsaEncryption (1.2.840.113549.1.1.1) with NULL params
  const algorithm = [
    0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01,
    0x01, 0x05, 0x00,
  ];

  const octetString = [0x04, ...derLength(pkcs1.length), ...pkcs1];
  const version = [0x02, 0x01, 0x00];

  const contents = [...version, ...algorithm, ...octetString];

  return new Uint8Array([0x30, ...derLength(contents.length), ...contents]);
}

/**
 * PEM -> PKCS#8 ArrayBuffer, tolerating the \n-escaped single-line form that env
 * vars usually hold, and either PKCS#1 or PKCS#8 input.
 */
function pemToPkcs8(pem: string): ArrayBuffer {
  const normalized = pem.replace(/\\n/g, "\n").trim();
  const isPkcs1 = /BEGIN RSA PRIVATE KEY/.test(normalized);

  const body = normalized
    .replace(/-----BEGIN [^-]+-----/, "")
    .replace(/-----END [^-]+-----/, "")
    .replace(/\s+/g, "");

  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  const pkcs8 = isPkcs1 ? wrapPkcs1AsPkcs8(bytes) : bytes;

  // Copy into a standalone buffer so the caller gets an exact-length ArrayBuffer
  return pkcs8.slice().buffer;
}

async function createAppJwt(): Promise<string> {
  const appId = process.env.GITHUB_APP_ID;
  const privateKey = process.env.GITHUB_APP_PRIVATE_KEY;

  if (!appId || !privateKey) {
    throw new Error(
      "GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY must be set on this deployment",
    );
  }

  const now = Math.floor(Date.now() / 1000);

  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    // Backdated by a minute to tolerate clock drift, which GitHub rejects
    iat: now - 60,
    exp: now + 540,
    iss: appId,
  };

  const signingInput = `${base64Url(JSON.stringify(header))}.${base64Url(
    JSON.stringify(payload),
  )}`;

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToPkcs8(privateKey),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(signingInput),
  );

  return `${signingInput}.${base64Url(signature)}`;
}

export async function getInstallationToken(
  installationId: number,
): Promise<string> {
  const jwt = await createAppJwt();

  const response = await fetch(
    `${GITHUB_API}/app/installations/${installationId}/access_tokens`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      `Could not get an installation token (${response.status}): ${await response.text()}`,
    );
  }

  const body = (await response.json()) as { token: string };
  return body.token;
}

async function rest<T>(
  token: string,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${GITHUB_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  if (!response.ok) {
    throw new Error(
      `GitHub ${init.method ?? "GET"} ${path} failed (${response.status}): ${await response.text()}`,
    );
  }

  return (await response.json()) as T;
}

export async function graphql<T>(
  token: string,
  query: string,
  variables: Record<string, unknown> = {},
): Promise<T> {
  const response = await fetch(`${GITHUB_API}/graphql`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  const body = (await response.json()) as {
    data?: T;
    errors?: { message: string }[];
  };

  if (body.errors?.length) {
    throw new Error(
      `GitHub GraphQL error: ${body.errors.map((e) => e.message).join("; ")}`,
    );
  }

  if (!body.data) {
    throw new Error(`GitHub GraphQL returned no data (${response.status})`);
  }

  return body.data;
}

export type InstallationRepo = {
  owner: string;
  name: string;
  fullName: string;
  private: boolean;
};

export async function listInstallationRepos(
  token: string,
): Promise<InstallationRepo[]> {
  const body = await rest<{
    repositories: {
      name: string;
      full_name: string;
      private: boolean;
      owner: { login: string };
    }[];
  }>(token, "/installation/repositories?per_page=100");

  return body.repositories.map((repo) => ({
    owner: repo.owner.login,
    name: repo.name,
    fullName: repo.full_name,
    private: repo.private,
  }));
}

export async function createIssue(
  token: string,
  args: {
    owner: string;
    repo: string;
    title: string;
    body: string;
    labels?: string[];
  },
) {
  return await rest<{ number: number; node_id: string; html_url: string }>(
    token,
    `/repos/${args.owner}/${args.repo}/issues`,
    {
      method: "POST",
      body: JSON.stringify({
        title: args.title,
        body: args.body,
        labels: args.labels,
      }),
    },
  );
}

export async function commentOnIssue(
  token: string,
  args: { owner: string; repo: string; issueNumber: number; body: string },
) {
  return await rest<{ id: number }>(
    token,
    `/repos/${args.owner}/${args.repo}/issues/${args.issueNumber}/comments`,
    { method: "POST", body: JSON.stringify({ body: args.body }) },
  );
}

export type ProjectSummary = {
  nodeId: string;
  number: number;
  title: string;
  statusFieldId?: string;
  statusOptions: { id: string; name: string }[];
};

type ProjectField = {
  id?: string;
  name?: string;
  options?: { id: string; name: string }[];
};

type ProjectNode = {
  id: string;
  number: number;
  title: string;
  fields: { nodes: ProjectField[] };
};

const PROJECTS_FRAGMENT = `
  projectsV2(first: 20, orderBy: {field: UPDATED_AT, direction: DESC}) {
    nodes { id number title
      fields(first: 30) {
        nodes {
          ... on ProjectV2SingleSelectField { id name options { id name } }
        }
      }
    }
  }
`;

/**
 * Projects v2 lives only in GraphQL, and a board's columns are options on a
 * single-select field whose ids differ per project - so they must be read, not
 * assumed.
 *
 * A login is either a user or an organization, and querying the wrong one is a
 * GraphQL error, so each is asked separately and failures are expected.
 */
export async function listProjects(
  token: string,
  login: string,
): Promise<ProjectSummary[]> {
  const nodes: ProjectNode[] = [];

  for (const ownerType of ["organization", "user"] as const) {
    try {
      const data = await graphql<
        Record<string, { projectsV2: { nodes: ProjectNode[] } } | null>
      >(
        token,
        `query($login: String!) {
           ${ownerType}(login: $login) { ${PROJECTS_FRAGMENT} }
         }`,
        { login },
      );

      nodes.push(...(data[ownerType]?.projectsV2.nodes ?? []));
    } catch {
      // Wrong owner type for this login, or no access - try the other
    }
  }

  return nodes.map((node) => {
    const statusField = node.fields.nodes.find(
      (field) => field.name === "Status" && field.id,
    );

    return {
      nodeId: node.id,
      number: node.number,
      title: node.title,
      statusFieldId: statusField?.id,
      statusOptions: statusField?.options ?? [],
    };
  });
}

export async function addIssueToProject(
  token: string,
  args: { projectNodeId: string; issueNodeId: string },
): Promise<string> {
  const data = await graphql<{
    addProjectV2ItemById: { item: { id: string } };
  }>(
    token,
    `mutation($projectId: ID!, $contentId: ID!) {
       addProjectV2ItemById(input: {projectId: $projectId, contentId: $contentId}) {
         item { id }
       }
     }`,
    { projectId: args.projectNodeId, contentId: args.issueNodeId },
  );

  return data.addProjectV2ItemById.item.id;
}

export async function setProjectItemStatus(
  token: string,
  args: {
    projectNodeId: string;
    itemId: string;
    statusFieldId: string;
    optionId: string;
  },
) {
  await graphql(
    token,
    `mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
       updateProjectV2ItemFieldValue(input: {
         projectId: $projectId,
         itemId: $itemId,
         fieldId: $fieldId,
         value: {singleSelectOptionId: $optionId}
       }) { projectV2Item { id } }
     }`,
    {
      projectId: args.projectNodeId,
      itemId: args.itemId,
      fieldId: args.statusFieldId,
      optionId: args.optionId,
    },
  );
}

/** Constant-time-ish comparison of webhook signatures. */
export async function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
): Promise<boolean> {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;

  if (!secret || !signatureHeader?.startsWith("sha256=")) {
    return false;
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const mac = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(rawBody),
  );

  const expected = Array.from(new Uint8Array(mac))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  const provided = signatureHeader.slice("sha256=".length);

  if (provided.length !== expected.length) {
    return false;
  }

  let mismatch = 0;
  for (let i = 0; i < expected.length; i += 1) {
    mismatch |= expected.charCodeAt(i) ^ provided.charCodeAt(i);
  }

  return mismatch === 0;
}
