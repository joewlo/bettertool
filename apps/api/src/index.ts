import "./env.js";

import { serve } from "@hono/node-server";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { Hono } from "hono";

import { authMiddleware } from "./middleware/auth.js";
import { appsRoute } from "./routes/apps.js";
import { healthRoute } from "./routes/health.js";
import { meRoute } from "./routes/me.js";
import { proxyRoute } from "./routes/proxy.js";
import { resourcesRoute } from "./routes/resources.js";

const app = new Hono();

app.use("*", logger());
app.use(
  "*",
  cors({
    origin: process.env.API_CORS_ORIGIN ?? "http://localhost:5173",
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization", "X-Auth-Request-Email", "X-Auth-Request-User"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  }),
);

app.route("/health", healthRoute);

app.use("/api/*", authMiddleware());

app.route("/api/me", meRoute);
app.route("/api/apps", appsRoute);
app.route("/api/resources", resourcesRoute);
app.route("/api/proxy", proxyRoute);

const port = Number(process.env.API_PORT ?? 8787);
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`bettertool api listening on http://localhost:${info.port}`);
});

export default app;
