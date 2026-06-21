import { defineConfig } from "drizzle-kit";

const url = process.env.DATABASE_URL ?? "postgres://bettertool:bettertool@localhost:5432/bettertool";

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
  casing: "snake_case",
});
