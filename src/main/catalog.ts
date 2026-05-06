import { readFileSync } from "node:fs";
import path from "node:path";
import type { Catalog } from "../shared";

let cached: Catalog | null = null;

export function loadCatalog(): Catalog {
  if (cached) return cached;
  const jsonPath = path.join(__dirname, "catalog.json");
  const raw = readFileSync(jsonPath, "utf8");
  cached = JSON.parse(raw) as Catalog;
  return cached;
}
