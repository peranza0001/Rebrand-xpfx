-- Add Advanced Trading Features: Forex, Stocks, Advanced Orders

-- CreateEnum for instrument types and order types
CREATE TYPE "instrument_type" AS ENUM ('crypto', 'forex', 'stock', 'commodity', 'index');
CREATE TYPE "advanced_order_type" AS ENUM ('market', 'limit', 'stop_loss', 'take_profit', 'stop_limit');

-- Extend asset_catalog with instrument type and trading details
ALTER TABLE asset_catalog ADD COLUMN IF NOT EXISTS instrument_type instrument_type DEFAULT 'crypto';
ALTER TABLE asset_catalog ADD COLUMN IF NOT EXISTS base_asset VARCHAR(10);
ALTER TABLE asset_catalog ADD COLUMN IF NOT EXISTS quote_asset VARCHAR(10);
ALTER TABLE asset_catalog ADD COLUMN IF NOT EXISTS min_lot DECIMAL(20, 8) DEFAULT 0.01;
ALTER TABLE asset_catalog ADD COLUMN IF NOT EXISTS pip_value DECIMAL(20, 8) DEFAULT 0.0001;
ALTER TABLE asset_catalog ADD COLUMN IF NOT EXISTS margin_requirement DECIMAL(5, 2) DEFAULT 0.05;
ALTER TABLE asset_catalog ADD COLUMN IF NOT EXISTS exchange VARCHAR(50);
ALTER TABLE asset_catalog ADD COLUMN IF NOT EXISTS sector VARCHAR(50);
ALTER TABLE asset_catalog ADD COLUMN IF NOT EXISTS trading_hours VARCHAR(100);
ALTER TABLE asset_catalog ADD COLUMN IF NOT EXISTS spread DECIMAL(10, 5) DEFAULT 0.00020;
ALTER TABLE asset_catalog ADD COLUMN IF NOT EXISTS last_price_update TIMESTAMP(6);

-- Advanced Orders Table
CREATE TABLE IF NOT EXISTS advanced_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  symbol VARCHAR(20) NOT NULL,
  order_type advanced_order_type NOT NULL,
  side VARCHAR(10) NOT NULL,
  entry_price DECIMAL(20, 8),
  trigger_price DECIMAL(20, 8),
  quantity DECIMAL(20, 8) NOT NULL,
  leverage DECIMAL(5, 2) DEFAULT 1.0,
  status VARCHAR(20) DEFAULT 'pending',
  filled_price DECIMAL(20, 8),
  filled_quantity DECIMAL(20, 8) DEFAULT 0,
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  triggered_at TIMESTAMP(6),
  executed_at TIMESTAMP(6),
  cancelled_at TIMESTAMP(6),
  expiry_time TIMESTAMP(6),
  notes TEXT,

  CONSTRAINT advanced_orders_pkey PRIMARY KEY (id),
  CONSTRAINT advanced_orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Price Feed History Table (for candlestick/OHLC data)
CREATE TABLE IF NOT EXISTS price_feeds (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  symbol VARCHAR(20) NOT NULL,
  timeframe VARCHAR(10) NOT NULL,
  open DECIMAL(20, 8),
  high DECIMAL(20, 8),
  low DECIMAL(20, 8),
  close DECIMAL(20, 8),
  volume DECIMAL(20, 2),
  timestamp TIMESTAMP(6) NOT NULL,
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT price_feeds_pkey PRIMARY KEY (id),
  CONSTRAINT price_feeds_unique UNIQUE(symbol, timeframe, timestamp)
);

-- Economic Calendar Events
CREATE TABLE IF NOT EXISTS economic_events (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  event_name VARCHAR(100) NOT NULL,
  country VARCHAR(50) NOT NULL,
  scheduled_time TIMESTAMP(6) NOT NULL,
  impact_level VARCHAR(20),
  forecast VARCHAR(50),
  previous VARCHAR(50),
  actual VARCHAR(50),
  affected_pairs TEXT,
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(6),

  CONSTRAINT economic_events_pkey PRIMARY KEY (id)
);

-- Leverage History (track user leverage adjustments)
CREATE TABLE IF NOT EXISTS leverage_history (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  previous_leverage DECIMAL(5, 2),
  new_leverage DECIMAL(5, 2),
  reason VARCHAR(100),
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT leverage_history_pkey PRIMARY KEY (id),
  CONSTRAINT leverage_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Margin Levels Tracking
CREATE TABLE IF NOT EXISTS margin_levels (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  account_balance DECIMAL(20, 8),
  used_margin DECIMAL(20, 8),
  free_margin DECIMAL(20, 8),
  margin_level DECIMAL(8, 2),
  last_update TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT margin_levels_pkey PRIMARY KEY (id),
  CONSTRAINT margin_levels_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Price Alerts
CREATE TABLE IF NOT EXISTS price_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  symbol VARCHAR(20) NOT NULL,
  alert_type VARCHAR(20),
  alert_price DECIMAL(20, 8),
  is_above BOOLEAN,
  is_triggered BOOLEAN DEFAULT false,
  triggered_at TIMESTAMP(6),
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT price_alerts_pkey PRIMARY KEY (id),
  CONSTRAINT price_alerts_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indices for performance
CREATE INDEX IF NOT EXISTS idx_advanced_orders_user_id ON advanced_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_advanced_orders_symbol ON advanced_orders(symbol);
CREATE INDEX IF NOT EXISTS idx_advanced_orders_status ON advanced_orders(status);
CREATE INDEX IF NOT EXISTS idx_price_feeds_symbol_timeframe ON price_feeds(symbol, timeframe, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_economic_events_scheduled_time ON economic_events(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_price_alerts_user_id ON price_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_margin_levels_user_id ON margin_levels(user_id);
