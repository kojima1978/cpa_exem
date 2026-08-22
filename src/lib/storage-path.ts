import { dirname, join } from "path";
import { getDbPath } from "@/lib/db-path";

export function getDataDir(): string {
  return dirname(getDbPath());
}

export function getMaterialsDir(): string {
  return join(getDataDir(), "materials");
}
