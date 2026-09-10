import { Router, type IRouter } from "express";
import { PurchaseAssetBody } from "@workspace/api-zod";
import { assetCatalog } from "../lib/store";
import { requireAuth } from "../lib/session";

const router: IRouter = Router();

router.get("/assets", (_req, res) => {
  res.json(assetCatalog);
});

router.get("/assets/catalog", requireAuth, (_req, res) => {
  res.json(assetCatalog);
});

router.post("/assets/purchase", requireAuth, async (req, res) => {
  const parsed = PurchaseAssetBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      transactionId: "",
      assetSymbol: "",
      amountPurchased: 0,
      totalCost: 0,
      message: "Invalid purchase request.",
    });
  }
  const asset = assetCatalog.find((a) => a.id === parsed.data.assetId);
  if (!asset || !asset.available) {
    return res.json({
      success: false,
      transactionId: "",
      assetSymbol: parsed.data.assetId,
      amountPurchased: 0,
      totalCost: 0,
      message: "Asset is not available for purchase.",
    });
  }
  if (parsed.data.amount <= 0) {
    return res.json({
      success: false,
      transactionId: "",
      assetSymbol: asset.symbol,
      amountPurchased: 0,
      totalCost: 0,
      message: "Purchase amount must be greater than zero.",
    });
  }
  return res.status(503).json({
    success: false,
    transactionId: "",
    assetSymbol: asset.symbol,
    amountPurchased: 0,
    totalCost: 0,
    message: "Asset purchases are temporarily unavailable until durable asset settlement is enabled.",
  });
});

export default router;
