import { Router, type IRouter } from 'express';
import { assetCatalog } from '../lib/store';

const router: IRouter = Router();

router.get('/demo/market-data', (_req, res) => {
  res.json(assetCatalog.map((asset) => ({
    symbol: asset.symbol,
    name: asset.name,
    price: asset.price,
    change24h: asset.change24h,
    currency: asset.currency,
    logoUrl: asset.logoUrl,
  })));
});

export default router;
