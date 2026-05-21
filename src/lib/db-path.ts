import { resolve } from "path";

/**
 * DATABASE_URL からSQLiteファイルの絶対パスを取得する。
 * - file:./data/cpa-exam.db  → {cwd}/prisma/data/cpa-exam.db（相対パス: prisma/基準）
 * - file:/app/prisma/data/cpa-exam.db → /app/prisma/data/cpa-exam.db（絶対パス: Docker用）
 */
export function getDbPath(): string {
  const url = process.env.DATABASE_URL || "";
  const filePath = url.replace(/^file:/, "");
  if (filePath.startsWith("/")) {
    return filePath;
  }
  return resolve(process.cwd(), "prisma", filePath);
}
