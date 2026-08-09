/**
 * Admin platform-wide controls — settings, asset catalog, all trades.
 */
import { Router, type IRouter } from "express";
import {
  UpdatePlatformSettingsBody,
  CreateAdminAssetBody,
  UpdateAdminAssetBody,
  type AdminTradeRow,
  type AssetCatalogItem,
  type PlatformSettings,
} from "@workspace/api-zod";
import {
  assetCatalog,
  logActivity,
  newId,
  demoConfig,
  platformSettings,
  userData,
  users,
} from "../lib/store";
import { requireAdmin } from "../lib/session";

const router: IRouter = Router();

// ---------- Public read-only platform settings (used by the customer app) ----------

router.get("/platform-settings", (_req, res) => {
  const out: PlatformSettings = { ...platformSettings };
  return res.json(out);
});

// ---------- Platform settings (admin) ----------

router.get("/admin/platform-settings", requireAdmin, (_req, res) => {
  const out: PlatformSettings = { ...platformSettings };
  return res.json(out);
});

router.patch("/admin/platform-settings", requireAdmin, (req, res) => {
  const parsed = UpdatePlatformSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid settings", details: parsed.error.issues });
  }
  Object.assign(platformSettings, parsed.data);
  logActivity({
    actorId: req.userId!,
    actorName: req.storedUser!.user.fullName,
    action: "admin.platform_settings.update",
    detail: `Updated platform settings: ${JSON.stringify(parsed.data)}`,
  });
  const out: PlatformSettings = { ...platformSettings };
  return res.json(out);
});

// ---------- Assets ----------

router.get("/admin/assets", requireAdmin, (_req, res) => {
  return res.json(assetCatalog);
});

router.post("/admin/assets", requireAdmin, (req, res) => {
  const parsed = CreateAdminAssetBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid asset", details: parsed.error.issues });
  }
  const symbol = parsed.data.symbol.toUpperCase();
  if (assetCatalog.some((a) => a.symbol === symbol)) {
    return res.status(409).json({ error: `Asset ${symbol} already exists in catalog.` });
  }
  const asset: AssetCatalogItem = {
    id: newId("a"),
    symbol,
    name: parsed.data.name,
    price: parsed.data.price,
    currency: parsed.data.currency.toUpperCase(),
    change24h: 0,
    logoUrl: parsed.data.imageUrl ?? null,
    available: true,
  };
  assetCatalog.push(asset);
  logActivity({
    actorId: req.userId!,
    actorName: req.storedUser!.user.fullName,
    action: "admin.asset.create",
    detail: `Created asset ${symbol} at ${asset.price} ${asset.currency}`,
  });
  return res.json(asset);
});

router.patch("/admin/assets/:assetId", requireAdmin, (req, res) => {
  const assetId = (req.params["assetId"] as string);
  const asset = assetCatalog.find((a) => a.id === assetId);
  if (!asset) return res.status(404).json({ error: "Asset not found" });

  const parsed = UpdateAdminAssetBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid update", details: parsed.error.issues });
  }
  if (parsed.data.name !== undefined) asset.name = parsed.data.name;
  if (parsed.data.price !== undefined) asset.price = parsed.data.price;
  if (parsed.data.currency !== undefined) asset.currency = parsed.data.currency.toUpperCase();
  if (parsed.data.change24h !== undefined) asset.change24h = parsed.data.change24h;
  if (parsed.data.imageUrl !== undefined) asset.logoUrl = parsed.data.imageUrl;
  if (parsed.data.available !== undefined) asset.available = parsed.data.available;

  logActivity({
    actorId: req.userId!,
    actorName: req.storedUser!.user.fullName,
    action: "admin.asset.update",
    detail: `Updated asset ${asset.symbol}: ${JSON.stringify(parsed.data)}`,
  });
  return res.json(asset);
});

router.delete("/admin/assets/:assetId", requireAdmin, (req, res) => {
  const assetId = (req.params["assetId"] as string);
  const idx = assetCatalog.findIndex((a) => a.id === assetId);
  if (idx === -1) return res.status(404).json({ error: "Asset not found" });
  const removed = assetCatalog.splice(idx, 1)[0]!;
  logActivity({
    actorId: req.userId!,
    actorName: req.storedUser!.user.fullName,
    action: "admin.asset.delete",
    detail: `Removed asset ${removed.symbol} from catalog.`,
  });
  return res.json({ ok: true });
});

// ---------- Trades (all users) ----------

router.get("/admin/trades", requireAdmin, (_req, res) => {
  const rows: AdminTradeRow[] = [];
  for (const [userId, data] of userData) {
    const stored = users.get(userId);
    if (!stored) continue;
    for (const t of data.trades) {
      rows.push({
        ...t,
        userId,
        userName: stored.user.fullName,
        userEmail: stored.user.email,
      });
    }
  }
  rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return res.json(rows);
});

// ---------- Demo config & activity (admin) ----------
router.get('/admin/demo-config', requireAdmin, (_req, res) => {
  return res.json(demoConfig);
});

router.patch('/admin/demo-config', requireAdmin, (req, res) => {
  const body = req.body as Partial<typeof demoConfig>;
  if (body.defaultBalance !== undefined) demoConfig.defaultBalance = Number(body.defaultBalance);
  if (body.defaultLeverage !== undefined) demoConfig.defaultLeverage = Number(body.defaultLeverage);
  if (body.volatility !== undefined) demoConfig.volatility = Number(body.volatility);
  if (body.spread !== undefined) demoConfig.spread = Number(body.spread);
  if (body.enabled !== undefined) demoConfig.enabled = Boolean(body.enabled);
  logActivity({ actorId: req.userId!, actorName: req.storedUser!.user.fullName, action: 'admin.demo_config.update', detail: `Updated demo config: ${JSON.stringify(body)}` });
  return res.json(demoConfig);
});

router.get('/admin/demo-activity', requireAdmin, (_req, res) => {
  const activity: Array<{ userId: string; email: string; trades: any[]; transactions: any[] }> = [];
  for (const [uid, data] of userData) {
    if ((data.trades && data.trades.length > 0) || (data.transactions && data.transactions.some((tx) => tx.isDemo))) {
      const stored = users.get(uid);
      activity.push({ userId: uid, email: stored?.user.email ?? '', trades: data.trades, transactions: data.transactions.filter((tx) => tx.isDemo) });
    }
  }
  return res.json(activity);
});

export default router;

