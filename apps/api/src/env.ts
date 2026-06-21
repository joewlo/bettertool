import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

const candidates = [
  resolve(here, "../../../.env"),
  resolve(process.cwd(), ".env"),
  resolve(process.cwd(), "../../.env"),
];

for (const p of candidates) {
  try {
    process.loadEnvFile(p);
    break;
  } catch {
    // try next candidate; if none load, real env vars are used (production)
  }
}
