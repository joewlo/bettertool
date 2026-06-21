import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import pg from "pg";

import {
  graphqlQuerySchema,
  postgresQuerySchema,
  restQuerySchema,
  type GraphqlQuery,
  type GraphqlResourceConfig,
  type PostgresQuery,
  type PostgresResourceConfig,
  type RestQuery,
  type RestResourceConfig,
} from "@bettertool/shared";

import { buildAuthHeaders } from "../lib/auth-headers.js";
import { getResource } from "../lib/resource-repo.js";
import { upsertUser } from "../lib/user-repo.js";

export const proxyRoute = new Hono();

const MAX_BYTES = 5 * 1024 * 1024;
const TIMEOUT_MS = 30_000;

const INTROSPECTION_QUERY = `query IntrospectionQuery {
  __schema {
    queryType { name }
    mutationType { name }
    subscriptionType { name }
    types {
      ...FullType
    }
    directives {
      name
      description
      locations
      args {
        ...InputValue
      }
    }
  }
}

fragment FullType on __Type {
  kind
  name
  description
  fields(includeDeprecated: true) {
    name
    description
    args {
      ...InputValue
    }
    type {
      ...TypeRef
    }
    isDeprecated
    deprecationReason
  }
  inputFields {
    ...InputValue
  }
  interfaces {
    ...TypeRef
  }
  enumValues(includeDeprecated: true) {
    name
    description
    isDeprecated
    deprecationReason
  }
  possibleTypes {
    ...TypeRef
  }
}

fragment InputValue on __InputValue {
  name
  description
  type {
    ...TypeRef
  }
  defaultValue
}

fragment TypeRef on __Type {
  kind
  name
  ofType {
    kind
    name
    ofType {
      kind
      name
      ofType {
        kind
        name
        ofType {
          kind
          name
          ofType {
            kind
            name
          }
        }
      }
    }
  }
}`;

export type RestResponse = {
  status: number;
  headers: Record<string, string>;
  data: unknown;
  durationMs: number;
  truncated?: boolean;
};

export type PgResponse = {
  rows: Record<string, unknown>[];
  rowCount: number;
  durationMs: number;
  command: string;
};

const validationHook = (result: any, c: any) =>
  result.success ? undefined : c.json({ error: "validation", issues: result.error.issues }, 400);

function parseJsonResult(text: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false };
  }
}

function upstreamErrorResponse(start: number, message: string): RestResponse {
  return {
    status: 502,
    headers: {},
    data: { error: "upstream", message },
    durationMs: Math.round(performance.now() - start),
  };
}

async function readUpstreamResponse(res: Response, start: number): Promise<RestResponse> {
  const responseHeaders: Record<string, string> = {};
  res.headers.forEach((v, k) => {
    responseHeaders[k] = v;
  });

  const buf = Buffer.from(await res.arrayBuffer());
  const text = buf.toString("utf8");
  let data: unknown;
  let truncated = false;
  if (buf.length > MAX_BYTES) {
    truncated = true;
    const sliced = text.slice(0, MAX_BYTES);
    const parsed = parseJsonResult(sliced);
    data = parsed.ok ? parsed.value : sliced;
  } else {
    const parsed = parseJsonResult(text);
    data = parsed.ok ? parsed.value : text;
  }

  const result: RestResponse = {
    status: res.status,
    headers: responseHeaders,
    data,
    durationMs: Math.round(performance.now() - start),
  };
  if (truncated) result.truncated = true;
  return result;
}

async function runRest(config: RestResourceConfig, query: RestQuery): Promise<RestResponse> {
  const start = performance.now();
  const base = config.baseUrl.replace(/\/+$/, "");
  const path = query.path === "" || query.path.startsWith("/") ? query.path : `/${query.path}`;
  const url = new URL(base + path);
  for (const [k, v] of Object.entries(query.params)) {
    url.searchParams.set(k, v);
  }

  const headers: Record<string, string> = {
    ...config.headers,
    ...query.headers,
    ...buildAuthHeaders(config.auth),
  };

  let body: BodyInit | undefined;
  if (query.bodyType === "json") {
    if (!("Content-Type" in headers)) headers["Content-Type"] = "application/json";
    body = query.body || undefined;
  } else if (query.bodyType === "text") {
    if (!("Content-Type" in headers)) headers["Content-Type"] = "text/plain";
    body = query.body || undefined;
  } else if (query.bodyType === "form") {
    if (!("Content-Type" in headers)) headers["Content-Type"] = "application/x-www-form-urlencoded";
    let record: Record<string, string> = {};
    try {
      const parsed = JSON.parse(query.body || "{}");
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        record = parsed as Record<string, string>;
      }
    } catch {
      record = {};
    }
    body = new URLSearchParams(record).toString();
  }

  const noBodyMethods = new Set(["GET", "HEAD"]);
  const fetchBody = noBodyMethods.has(query.method) ? undefined : body;

  let res: Response;
  try {
    res = await fetch(url, {
      method: query.method,
      headers,
      body: fetchBody,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    return upstreamErrorResponse(start, (err as Error).message);
  }

  return readUpstreamResponse(res, start);
}

async function runGraphql(config: GraphqlResourceConfig, query: GraphqlQuery): Promise<RestResponse> {
  const start = performance.now();
  const base = config.baseUrl.replace(/\/+$/, "");

  const headers: Record<string, string> = {
    ...config.headers,
    ...query.headers,
    ...buildAuthHeaders(config.auth),
    "Content-Type": "application/json",
  };

  let variables: unknown = {};
  if (query.variables.trim()) {
    const parsed = parseJsonResult(query.variables);
    variables = parsed.ok ? parsed.value : {};
  }
  const body = JSON.stringify({ query: query.query, variables });

  let res: Response;
  try {
    res = await fetch(base, {
      method: "POST",
      headers,
      body,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    return upstreamErrorResponse(start, (err as Error).message);
  }

  return readUpstreamResponse(res, start);
}

async function runPostgres(config: PostgresResourceConfig, query: PostgresQuery): Promise<PgResponse> {
  const start = performance.now();
  const client = new pg.Client({
    connectionString: config.connectionString,
    ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
  });

  try {
    await client.connect();

    const queryPromise = client.query(query.sql, query.parameters);
    const timeoutPromise = new Promise<never>((_, reject) => {
      const timer = setTimeout(() => reject(new Error("postgres query timeout (30s)")), TIMEOUT_MS);
      timer.unref?.();
    });

    const result = await Promise.race([queryPromise, timeoutPromise]);

    return {
      rows: result.rows as Record<string, unknown>[],
      rowCount: result.rowCount ?? 0,
      durationMs: Math.round(performance.now() - start),
      command: result.command,
    };
  } finally {
    await client.end().catch(() => {
      // ignore end errors
    });
  }
}

proxyRoute.post("/http/:resourceId", zValidator("json", restQuerySchema, validationHook), async (c) => {
  try {
    const { workspaceId } = await upsertUser(c.get("user"));
    const resourceId = c.req.param("resourceId");
    const resource = await getResource(workspaceId, resourceId);
    if (resource.type !== "rest") {
      return c.json({ error: "bad_request", message: "resource is not a REST resource" }, 400);
    }
    const query = c.req.valid("json");
    const config = resource.config as RestResourceConfig;
    const result = await runRest(config, query);
    return c.json(result);
  } catch (err) {
    if ((err as Error).message === "not found") {
      return c.json({ error: "not_found" }, 404);
    }
    return c.json({ error: "internal", message: (err as Error).message }, 500);
  }
});

proxyRoute.post("/http/:resourceId/test", zValidator("json", restQuerySchema, validationHook), async (c) => {
  try {
    const { workspaceId } = await upsertUser(c.get("user"));
    const resourceId = c.req.param("resourceId");
    const resource = await getResource(workspaceId, resourceId);
    if (resource.type !== "rest") {
      return c.json({ error: "bad_request", message: "resource is not a REST resource" }, 400);
    }
    const query = c.req.valid("json");
    const config = resource.config as RestResourceConfig;
    const result = await runRest(config, query);
    return c.json(result);
  } catch (err) {
    if ((err as Error).message === "not found") {
      return c.json({ error: "not_found" }, 404);
    }
    return c.json({ error: "internal", message: (err as Error).message }, 500);
  }
});

proxyRoute.post(
  "/graphql/:resourceId",
  zValidator("json", graphqlQuerySchema, validationHook),
  async (c) => {
    try {
      const { workspaceId } = await upsertUser(c.get("user"));
      const resourceId = c.req.param("resourceId");
      const resource = await getResource(workspaceId, resourceId);
      if (resource.type !== "graphql") {
        return c.json({ error: "bad_request", message: "resource is not a GraphQL resource" }, 400);
      }
      const query = c.req.valid("json");
      const config = resource.config as GraphqlResourceConfig;
      const result = await runGraphql(config, query);
      return c.json(result);
    } catch (err) {
      if ((err as Error).message === "not found") {
        return c.json({ error: "not_found" }, 404);
      }
      return c.json({ error: "internal", message: (err as Error).message }, 500);
    }
  },
);

proxyRoute.post("/graphql/:resourceId/introspect", async (c) => {
  try {
    const { workspaceId } = await upsertUser(c.get("user"));
    const resourceId = c.req.param("resourceId");
    const resource = await getResource(workspaceId, resourceId);
    if (resource.type !== "graphql") {
      return c.json({ error: "bad_request", message: "resource is not a GraphQL resource" }, 400);
    }
    const config = resource.config as GraphqlResourceConfig;
    const result = await runGraphql(config, {
      type: "graphql",
      query: INTROSPECTION_QUERY,
      variables: "",
      headers: {},
    });
    return c.json(result);
  } catch (err) {
    if ((err as Error).message === "not found") {
      return c.json({ error: "not_found" }, 404);
    }
    return c.json({ error: "internal", message: (err as Error).message }, 500);
  }
});

proxyRoute.post(
  "/postgres/:resourceId",
  zValidator("json", postgresQuerySchema, validationHook),
  async (c) => {
    try {
      const { workspaceId } = await upsertUser(c.get("user"));
      const resourceId = c.req.param("resourceId");
      const resource = await getResource(workspaceId, resourceId);
      if (resource.type !== "postgres") {
        return c.json({ error: "bad_request", message: "resource is not a Postgres resource" }, 400);
      }
      const query = c.req.valid("json");
      const config = resource.config as PostgresResourceConfig;
      const result = await runPostgres(config, query);
      return c.json(result);
    } catch (err) {
      if ((err as Error).message === "not found") {
        return c.json({ error: "not_found" }, 404);
      }
      return c.json({ error: "pg", message: (err as Error).message }, 502);
    }
  },
);
