import { eq } from "drizzle-orm";
import { platformSettingsTable } from "@workspace/db/schema";
import { dbGet, getDb } from "./db-client";
import { getPrismaClient, getPrismaModelDelegate } from "./db-persist";
import { logger } from "./logger";
import { demoConfig, platformSettings } from "./store";

const SETTINGS = {
  platform: "platform",
  demo: "demo",
} as const;

function settingValue(key: string): object {
  return key === SETTINGS.platform ? platformSettings : demoConfig;
}

function assignSetting(key: string, value: unknown): void {
  if (!value || typeof value !== "object" || Array.isArray(value)) return;
  if (key === SETTINGS.platform) Object.assign(platformSettings, value);
  if (key === SETTINGS.demo) Object.assign(demoConfig, value);
}

export async function hydratePlatformSettings(): Promise<void> {
  const prisma = getPrismaClient();
  if (prisma) {
    const delegate = getPrismaModelDelegate("platform_settings");
    if (delegate?.findMany) {
      try {
        const rows = await delegate.findMany();
        for (const row of rows) assignSetting(String(row.key), row.value);
        if (rows.length > 0) return;
      } catch (err) {
        logger.warn({ err }, "[platform-settings] Prisma hydration failed; trying Drizzle");
      }
    }
  }

  const rows = await dbGet(
    "platform-settings.hydrate",
    (db) => db.select().from(platformSettingsTable),
    [],
  );
  for (const row of rows) assignSetting(row.key, row.value);
}

export async function persistPlatformSetting(key: keyof typeof SETTINGS): Promise<boolean> {
  const value = settingValue(key);
  const prisma = getPrismaClient();
  const delegate = prisma ? getPrismaModelDelegate("platform_settings") : null;
  if (delegate?.upsert) {
    try {
      await delegate.upsert({
        where: { key },
        create: { key, value },
        update: { value, updated_at: new Date() },
      });
      return true;
    } catch (err) {
      logger.warn({ err, key }, "[platform-settings] Prisma persistence failed; trying Drizzle");
    }
  }

  const db = getDb();
  if (!db) return false;
  try {
    await db.insert(platformSettingsTable).values({ key, value }).onConflictDoUpdate({
      target: platformSettingsTable.key,
      set: { value, updatedAt: new Date() },
    });
    return true;
  } catch (err) {
    logger.warn({ err, key }, "[platform-settings] Drizzle persistence failed");
    return false;
  }
}