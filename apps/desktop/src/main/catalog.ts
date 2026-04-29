import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Catalog } from "@agentdeck/shared-types";

let cached: Catalog | null = null;

export function loadCatalog(): Catalog {
  if (cached) return cached;
  const here = path.dirname(fileURLToPath(import.meta.url));
  const jsonPath = path.join(here, "catalog.json");
  const raw = readFileSync(jsonPath, "utf8");
  cached = JSON.parse(raw) as Catalog;
  return cached;
}
