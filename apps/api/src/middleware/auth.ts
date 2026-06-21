import type { Context, MiddlewareHandler } from "hono";
import { getCookie, getSignedCookie } from "hono/cookie";

import type { AuthUser } from "@bettertool/shared";

declare module "hono" {
  interface ContextVariableMap {
    user: AuthUser;
  }
}

const ADMIN_GROUPS = (process.env.AUTH_ADMIN_GROUPS ?? "admin")
  .split(",")
  .map((g) => g.trim())
  .filter(Boolean);

function header(c: Context, name: string): string | undefined {
  const value = c.req.header(name);
  return value && value.length > 0 ? value : undefined;
}

function parseGroups(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((g) => g.trim())
    .filter(Boolean);
}

export const authMiddleware = (): MiddlewareHandler => async (c, next) => {
  const emailHeader = process.env.AUTH_HEADER_EMAIL ?? "X-Auth-Request-Email";
  const userHeader = process.env.AUTH_HEADER_USER ?? "X-Auth-Request-User";
  const groupsHeader = process.env.AUTH_HEADER_GROUPS ?? "X-Auth-Request-Groups";
  const tokenHeader = process.env.AUTH_HEADER_ACCESS_TOKEN ?? "X-Auth-Request-Access-Token";

  const email = header(c, emailHeader);
  const username = header(c, userHeader) ?? email ?? "anonymous";
  const groups = parseGroups(header(c, groupsHeader));
  const accessToken = header(c, tokenHeader);

  if (!email) {
    return c.json({ error: "unauthorized", message: `missing auth header: ${emailHeader}` }, 401);
  }

  const user: AuthUser = {
    externalId: username,
    email,
    username,
    groups,
    accessToken,
    isAdmin: groups.some((g) => ADMIN_GROUPS.includes(g)),
  };
  c.set("user", user);
  await next();
};

export { getCookie, getSignedCookie };
