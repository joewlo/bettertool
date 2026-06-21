import { Hono } from "hono";

import type { AuthUser } from "@bettertool/shared";

import { upsertUser } from "../lib/user-repo.js";

export const meRoute = new Hono();

meRoute.get("/", async (c) => {
  try {
    const authUser = c.get("user");
    const { userId, workspaceId } = await upsertUser(authUser);
    const user: AuthUser = authUser;
    return c.json({ user, userId, workspaceId });
  } catch (err) {
    return c.json({ error: "internal", message: (err as Error).message }, 500);
  }
});
