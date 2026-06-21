import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";

import { resourceConfigSchema, resourceCreateSchema, resourceUpdateSchema } from "@bettertool/shared";

import {
  createResource,
  deleteResource,
  getResource,
  listResources,
  updateResource,
} from "../lib/resource-repo.js";
import { upsertUser } from "../lib/user-repo.js";

export const resourcesRoute = new Hono();

const validationHook = (result: any, c: any) =>
  result.success ? undefined : c.json({ error: "validation", issues: result.error.issues }, 400);

resourcesRoute.get("/", async (c) => {
  try {
    const { workspaceId } = await upsertUser(c.get("user"));
    const rows = await listResources(workspaceId);
    return c.json(rows);
  } catch (err) {
    return c.json({ error: "internal", message: (err as Error).message }, 500);
  }
});

resourcesRoute.get("/:id", async (c) => {
  try {
    const { workspaceId } = await upsertUser(c.get("user"));
    const row = await getResource(workspaceId, c.req.param("id"));
    return c.json(row);
  } catch (err) {
    if ((err as Error).message === "not found") {
      return c.json({ error: "not_found" }, 404);
    }
    return c.json({ error: "internal", message: (err as Error).message }, 500);
  }
});

resourcesRoute.post("/", zValidator("json", resourceCreateSchema, validationHook), async (c) => {
  try {
    const { workspaceId } = await upsertUser(c.get("user"));
    const body = c.req.valid("json");
    const cfgResult = resourceConfigSchema.safeParse({ type: body.type, config: body.config });
    if (!cfgResult.success) {
      return c.json({ error: "validation", issues: cfgResult.error.issues }, 400);
    }
    const row = await createResource(workspaceId, {
      name: body.name,
      type: body.type,
      config: cfgResult.data.config,
    });
    return c.json(row, 201);
  } catch (err) {
    if ((err as Error).message === "not found") {
      return c.json({ error: "not_found" }, 404);
    }
    return c.json({ error: "internal", message: (err as Error).message }, 500);
  }
});

resourcesRoute.put("/:id", zValidator("json", resourceUpdateSchema, validationHook), async (c) => {
  try {
    const { workspaceId } = await upsertUser(c.get("user"));
    const body = c.req.valid("json");
    if (body.config !== undefined && body.type !== undefined) {
      const cfgResult = resourceConfigSchema.safeParse({ type: body.type, config: body.config });
      if (!cfgResult.success) {
        return c.json({ error: "validation", issues: cfgResult.error.issues }, 400);
      }
      body.config = cfgResult.data.config;
    }
    const row = await updateResource(workspaceId, c.req.param("id"), body);
    return c.json(row);
  } catch (err) {
    if ((err as Error).message === "not found") {
      return c.json({ error: "not_found" }, 404);
    }
    return c.json({ error: "internal", message: (err as Error).message }, 500);
  }
});

resourcesRoute.delete("/:id", async (c) => {
  try {
    const { workspaceId } = await upsertUser(c.get("user"));
    await deleteResource(workspaceId, c.req.param("id"));
    return c.body(null, 204);
  } catch (err) {
    if ((err as Error).message === "not found") {
      return c.json({ error: "not_found" }, 404);
    }
    return c.json({ error: "internal", message: (err as Error).message }, 500);
  }
});
