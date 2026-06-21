import type { RestResourceConfig } from "@bettertool/shared";

export type AuthConfig = RestResourceConfig["auth"];

export function buildAuthHeaders(auth: AuthConfig): Record<string, string> {
  switch (auth.type) {
    case "none":
      return {};
    case "bearer":
      return { Authorization: `Bearer ${auth.token}` };
    case "apikey":
      return { [auth.headerName]: auth.keyValue };
    case "basic": {
      const token = Buffer.from(`${auth.username}:${auth.password}`).toString("base64");
      return { Authorization: `Basic ${token}` };
    }
  }
}
