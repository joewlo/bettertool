import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

import { appDefinitionSchema } from "@bettertool/shared";

import {
  createApp,
  deleteApp,
  getApp,
  listApps,
  updateApp,
} from "../lib/app-repo.js";
import { upsertUser } from "../lib/user-repo.js";

export const appsRoute = new Hono();

const createSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
});

const updateSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    description: z.string().optional(),
    definition: appDefinitionSchema.passthrough().optional(),
  })
  .partial();

const validationHook = (result: any, c: any) =>
  result.success ? undefined : c.json({ error: "validation", issues: result.error.issues }, 400);

appsRoute.get("/", async (c) => {
  try {
    const { workspaceId } = await upsertUser(c.get("user"));
    const rows = await listApps(workspaceId);
    return c.json(rows);
  } catch (err) {
    return c.json({ error: "internal", message: (err as Error).message }, 500);
  }
});

appsRoute.get("/:id", async (c) => {
  try {
    const { workspaceId } = await upsertUser(c.get("user"));
    const row = await getApp(workspaceId, c.req.param("id"));
    if (!row) return c.json({ error: "not_found" }, 404);
    return c.json(row);
  } catch (err) {
    if ((err as Error).message === "not found") {
      return c.json({ error: "not_found" }, 404);
    }
    return c.json({ error: "internal", message: (err as Error).message }, 500);
  }
});

appsRoute.post("/", zValidator("json", createSchema, validationHook), async (c) => {
  try {
    const { workspaceId, userId } = await upsertUser(c.get("user"));
    const body = c.req.valid("json");
    const row = await createApp(workspaceId, userId, body);
    return c.json(row, 201);
  } catch (err) {
    if ((err as Error).message === "not found") {
      return c.json({ error: "not_found" }, 404);
    }
    return c.json({ error: "internal", message: (err as Error).message }, 500);
  }
});

appsRoute.put("/:id", zValidator("json", updateSchema, validationHook), async (c) => {
  try {
    const { workspaceId } = await upsertUser(c.get("user"));
    const body = c.req.valid("json");
    const row = await updateApp(workspaceId, c.req.param("id"), body);
    return c.json(row);
  } catch (err) {
    if ((err as Error).message === "not found") {
      return c.json({ error: "not_found" }, 404);
    }
    return c.json({ error: "internal", message: (err as Error).message }, 500);
  }
});

appsRoute.delete("/:id", async (c) => {
  try {
    const { workspaceId } = await upsertUser(c.get("user"));
    await deleteApp(workspaceId, c.req.param("id"));
    return c.body(null, 204);
  } catch (err) {
    if ((err as Error).message === "not found") {
      return c.json({ error: "not_found" }, 404);
    }
    return c.json({ error: "internal", message: (err as Error).message }, 500);
  }
});
