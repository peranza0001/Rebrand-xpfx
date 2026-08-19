-- Create wallet ledger entry table to track all balance-affecting events
CREATE TABLE IF NOT EXISTS wallet_ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  wallet_id UUID NOT NULL,
  entry_type VARCHAR NOT NULL,
  asset_symbol VARCHAR NOT NULL DEFAULT 'USD',
  amount DECIMAL(20, 8) NOT NULL,
  status VARCHAR NOT NULL DEFAULT 'completed',
  source_type VARCHAR,
  source_id VARCHAR,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP(6) DEFAULT now(),
  updated_at TIMESTAMP(6) DEFAULT now()
);

-- Create trading wallet balance table
CREATE TABLE IF NOT EXISTS trading_wallet_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  available_balance DECIMAL(20, 8) NOT NULL DEFAULT 0,
  locked_balance DECIMAL(20, 8) NOT NULL DEFAULT 0,
  pending_balance DECIMAL(20, 8) NOT NULL DEFAULT 0,
  total_balance DECIMAL(20, 8) NOT NULL DEFAULT 0,
  currency VARCHAR DEFAULT 'USD',
  created_at TIMESTAMP(6) DEFAULT now(),
  updated_at TIMESTAMP(6) DEFAULT now()
);

-- Create social trading wallet balance table
CREATE TABLE IF NOT EXISTS social_trading_wallet_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  available_balance DECIMAL(20, 8) NOT NULL DEFAULT 0,
  locked_balance DECIMAL(20, 8) NOT NULL DEFAULT 0,
  pending_balance DECIMAL(20, 8) NOT NULL DEFAULT 0,
  total_balance DECIMAL(20, 8) NOT NULL DEFAULT 0,
  currency VARCHAR DEFAULT 'USD',
  created_at TIMESTAMP(6) DEFAULT now(),
  updated_at TIMESTAMP(6) DEFAULT now()
);

-- Create connected wallet balance table (non-custodial)
CREATE TABLE IF NOT EXISTS connected_wallet_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  wallet_address VARCHAR NOT NULL,
  asset_symbol VARCHAR NOT NULL DEFAULT 'ETH',
  balance DECIMAL(20, 8) NOT NULL DEFAULT 0,
  currency VARCHAR DEFAULT 'USD',
  provider VARCHAR DEFAULT 'metamask',
  last_synced_at TIMESTAMP(6),
  created_at TIMESTAMP(6) DEFAULT now(),
  updated_at TIMESTAMP(6) DEFAULT now(),
  UNIQUE(user_id, wallet_address, asset_symbol)
);

-- Create asset-specific balance sub-ledger
CREATE TABLE IF NOT EXISTS asset_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  wallet_type VARCHAR NOT NULL,
  asset_symbol VARCHAR NOT NULL,
  available_balance DECIMAL(20, 8) NOT NULL DEFAULT 0,
  locked_balance DECIMAL(20, 8) NOT NULL DEFAULT 0,
  pending_balance DECIMAL(20, 8) NOT NULL DEFAULT 0,
  created_at TIMESTAMP(6) DEFAULT now(),
  updated_at TIMESTAMP(6) DEFAULT now(),
  UNIQUE(user_id, wallet_type, asset_symbol)
);

-- Create deposit addresses table (admin-provisioned)
CREATE TABLE IF NOT EXISTS deposit_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  asset_symbol VARCHAR NOT NULL,
  address VARCHAR NOT NULL,
  label VARCHAR,
  is_active BOOLEAN DEFAULT true,
  created_by_admin VARCHAR,
  created_at TIMESTAMP(6) DEFAULT now(),
  UNIQUE(user_id, asset_symbol)
);

-- Create withdrawal approval queue
CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  wallet_id UUID,
  asset_symbol VARCHAR NOT NULL,
  amount DECIMAL(20, 8) NOT NULL,
  recipient_address VARCHAR NOT NULL,
  withdrawal_type VARCHAR NOT NULL DEFAULT 'crypto',
  status VARCHAR NOT NULL DEFAULT 'pending',
  approved_by_admin VARCHAR,
  approval_timestamp TIMESTAMP(6),
  rejection_reason VARCHAR,
  transaction_hash VARCHAR,
  gas_fee DECIMAL(20, 8),
  created_at TIMESTAMP(6) DEFAULT now(),
  updated_at TIMESTAMP(6) DEFAULT now()
);

-- Create deposit approval queue
CREATE TABLE IF NOT EXISTS deposit_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  wallet_id UUID,
  asset_symbol VARCHAR NOT NULL,
  amount DECIMAL(20, 8) NOT NULL,
  source_address VARCHAR,
  status VARCHAR NOT NULL DEFAULT 'pending',
  approved_by_admin VARCHAR,
  approval_timestamp TIMESTAMP(6),
  rejection_reason VARCHAR,
  transaction_hash VARCHAR,
  created_at TIMESTAMP(6) DEFAULT now(),
  updated_at TIMESTAMP(6) DEFAULT now()
);

-- Create per-user deposit/withdrawal limits
CREATE TABLE IF NOT EXISTS user_financial_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  kyc_tier INT DEFAULT 1,
  daily_deposit_limit DECIMAL(20, 8) NOT NULL DEFAULT 10000,
  daily_withdrawal_limit DECIMAL(20, 8) NOT NULL DEFAULT 10000,
  monthly_deposit_limit DECIMAL(20, 8) NOT NULL DEFAULT 100000,
  monthly_withdrawal_limit DECIMAL(20, 8) NOT NULL DEFAULT 100000,
  daily_deposits_used DECIMAL(20, 8) DEFAULT 0,
  daily_withdrawals_used DECIMAL(20, 8) DEFAULT 0,
  monthly_deposits_used DECIMAL(20, 8) DEFAULT 0,
  monthly_withdrawals_used DECIMAL(20, 8) DEFAULT 0,
  last_reset_at TIMESTAMP(6),
  created_at TIMESTAMP(6) DEFAULT now(),
  updated_at TIMESTAMP(6) DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX idx_wallet_ledger_user_id ON wallet_ledger_entries(user_id);
CREATE INDEX idx_wallet_ledger_wallet_id ON wallet_ledger_entries(wallet_id);
CREATE INDEX idx_wallet_ledger_created_at ON wallet_ledger_entries(created_at);
CREATE INDEX idx_withdrawal_user_status ON withdrawal_requests(user_id, status);
CREATE INDEX idx_deposit_user_status ON deposit_requests(user_id, status);
CREATE INDEX idx_asset_balance_user ON asset_balances(user_id);
CREATE INDEX idx_connected_wallet_user ON connected_wallet_balances(user_id);
CREATE INDEX idx_deposit_address_user ON deposit_addresses(user_id, asset_symbol);
