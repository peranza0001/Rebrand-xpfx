import { ethers } from "ethers";
import { env, isProduction } from "./env";
import { getAlchemyRpcUrl, isAlchemyConfigured } from "./integration-config";
import { logger } from "./logger";

export interface TokenSpec {
  symbol: string;
  address: string;
  decimals: number;
}
/** Ethereum mainnet ERC-20 tokens we know how to read & transfer. */
export const KNOWN_TOKENS: TokenSpec[] = [
  { symbol: "USDT", address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", decimals: 6 },
  { symbol: "USDC", address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", decimals: 6 },
  { symbol: "DAI", address: "0x6B175474E89094C44Da98b954EedeAC495271d0F", decimals: 18 },
];

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function transfer(address to, uint256 amount) returns (bool)",
];

export interface ProviderInfo {
  provider: ethers.Provider;
  source: "alchemy" | "infura" | "public";
}

export function getProvider(): ProviderInfo {
  const alchemy = env.ALCHEMY_API_KEY;
  const infura = env.INFURA_API_KEY;
  const alchemyRpcUrl = getAlchemyRpcUrl(alchemy);
  const providerInfo: ProviderInfo = alchemyRpcUrl
    ? { provider: new ethers.JsonRpcProvider(alchemyRpcUrl), source: "alchemy" }
    : isAlchemyConfigured(alchemy)
    ? { provider: new ethers.AlchemyProvider("mainnet", alchemy), source: "alchemy" }
    : infura
    ? { provider: new ethers.InfuraProvider("mainnet", infura), source: "infura" }
    : { provider: ethers.getDefaultProvider("mainnet"), source: "public" };

  logger.debug({ source: providerInfo.source }, "blockchain.provider.selected");
  return providerInfo;
}

export interface TokenBalanceResult {
  symbol: string;
  address: string;
  balance: number;
  decimals: number;
}

export interface LiveBalanceResult {
  address: string;
  chain: "ethereum-mainnet";
  ethBalance: number;
  tokens: TokenBalanceResult[];
  gasPriceGwei: number;
  estimatedSendGasFeeEth: number;
  fetchedAt: string;
  source: ProviderInfo["source"];
}

export async function getLiveBalance(address: string): Promise<LiveBalanceResult> {
  if (!ethers.isAddress(address)) {
    throw new Error(`Address ${address} is not a valid Ethereum address.`);
  }
  const { provider, source } = getProvider();
  const [ethWei, feeData] = await Promise.all([
    provider.getBalance(address),
    provider.getFeeData(),
  ]);
  const tokens = await Promise.all(
    KNOWN_TOKENS.map(async (t): Promise<TokenBalanceResult> => {
      try {
        const c = new ethers.Contract(t.address, ERC20_ABI, provider);
        const bal = (await c["balanceOf"]!(address)) as bigint;
        return {
          symbol: t.symbol,
          address: t.address,
          decimals: t.decimals,
          balance: parseFloat(ethers.formatUnits(bal, t.decimals)),
        };
      } catch {
        return { symbol: t.symbol, address: t.address, decimals: t.decimals, balance: 0 };
      }
    }),
  );
  const gasPriceWei = feeData.gasPrice ?? 0n;
  const gasPriceGwei = parseFloat(ethers.formatUnits(gasPriceWei, "gwei"));
  // 21,000 gas is the cost of a simple ETH transfer.
  const estimatedSendGasFeeEth = parseFloat(
    ethers.formatEther(gasPriceWei * 21000n),
  );
  return {
    address,
    chain: "ethereum-mainnet",
    ethBalance: parseFloat(ethers.formatEther(ethWei)),
    tokens,
    gasPriceGwei,
    estimatedSendGasFeeEth,
    fetchedAt: new Date().toISOString(),
    source,
  };
}

export function getPlatformReceivingAddress(): string {
  const configured = env.PLATFORM_RECEIVING_ADDRESS;
  if (configured && ethers.isAddress(configured)) {
    return ethers.getAddress(configured);
  }
  if (isProduction) {
    throw new Error(
      "PLATFORM_RECEIVING_ADDRESS env var is required in production and must be a valid EVM address.",
    );
  }
  return ethers.getAddress("0x000000000000000000000000000000000000dEaD");
}

export interface VerifyPaymentArgs {
  txHash: string;
  expectedFrom: string;
  expectedTo: string;
  asset: string;
  expectedAmount: number;
  /** Tolerance percentage for amount comparison (default 0.5%). */
  tolerancePct?: number;
}

export interface VerifyPaymentResult {
  ok: boolean;
  reason: string;
}

export async function verifyOnChainPayment(
  args: VerifyPaymentArgs,
): Promise<VerifyPaymentResult> {
  const tolerance = args.tolerancePct ?? 0.5;
  if (!/^0x[a-fA-F0-9]{64}$/.test(args.txHash)) {
    return { ok: false, reason: "Transaction hash is malformed." };
  }
  if (!ethers.isAddress(args.expectedFrom) || !ethers.isAddress(args.expectedTo)) {
    return { ok: false, reason: "Sender or recipient address is invalid." };
  }
  const expectedFrom = ethers.getAddress(args.expectedFrom);
  const expectedTo = ethers.getAddress(args.expectedTo);
  const symbol = args.asset.trim().toUpperCase();
  const { provider } = getProvider();
  let tx: ethers.TransactionResponse | null;
  let receipt: ethers.TransactionReceipt | null;
  try {
    [tx, receipt] = await Promise.all([
      provider.getTransaction(args.txHash),
      provider.getTransactionReceipt(args.txHash),
    ]);
  } catch (err) {
    const message = err instanceof Error ? err.message : "RPC lookup failed.";
    return {
      ok: false,
      reason: `Could not look up transaction on-chain: ${message}`,
    };
  }
  if (!tx) {
    return {
      ok: false,
      reason: "Transaction not found on-chain. It may not have been mined yet.",
    };
  }
  if (!receipt || receipt.status !== 1) {
    return { ok: false, reason: "Transaction was reverted or has not yet succeeded." };
  }
  if (ethers.getAddress(tx.from) !== expectedFrom) {
    return {
      ok: false,
      reason: `Transaction sender ${tx.from} does not match the connected wallet ${expectedFrom}.`,
    };
  }

  const amountWithinTolerance = (actual: number, expected: number) => {
    if (expected === 0) return actual === 0;
    return Math.abs(actual - expected) / expected <= tolerance / 100;
  };

  if (symbol === "ETH") {
    if (!tx.to || ethers.getAddress(tx.to) !== expectedTo) {
      return {
        ok: false,
        reason: `Transaction recipient does not match platform address ${expectedTo}.`,
      };
    }
    const actualEth = parseFloat(ethers.formatEther(tx.value));
    if (!amountWithinTolerance(actualEth, args.expectedAmount)) {
      return {
        ok: false,
        reason: `On-chain amount ${actualEth} ETH does not match expected ${args.expectedAmount} ETH.`,
      };
    }
    return { ok: true, reason: "verified" };
  }

  const token = KNOWN_TOKENS.find((t) => t.symbol === symbol);
  if (!token) {
    return {
      ok: false,
      reason: `Asset ${symbol} is not a supported on-chain settlement asset.`,
    };
  }
  if (!tx.to || ethers.getAddress(tx.to) !== ethers.getAddress(token.address)) {
    return {
      ok: false,
      reason: `Transaction is not against the ${symbol} contract; expected ${token.address} but got ${tx.to ?? "(none)"}.`,
    };
  }
  // ERC-20 transfer(address to, uint256 amount): selector 0xa9059cbb,
  // followed by 32-byte address and 32-byte amount in calldata.
  const TRANSFER_SELECTOR = "0xa9059cbb";
  if (!tx.data || !tx.data.toLowerCase().startsWith(TRANSFER_SELECTOR)) {
    return {
      ok: false,
      reason: `Transaction does not call transfer() on the ${symbol} contract.`,
    };
  }
  try {
    const decoded = ethers.AbiCoder.defaultAbiCoder().decode(
      ["address", "uint256"],
      "0x" + tx.data.slice(10),
    );
    const recipient = ethers.getAddress(decoded[0] as string);
    const rawAmount = decoded[1] as bigint;
    if (recipient !== expectedTo) {
      return {
        ok: false,
        reason: `Token transfer recipient ${recipient} does not match platform address ${expectedTo}.`,
      };
    }
    const actualAmount = parseFloat(ethers.formatUnits(rawAmount, token.decimals));
    if (!amountWithinTolerance(actualAmount, args.expectedAmount)) {
      return {
        ok: false,
        reason: `On-chain amount ${actualAmount} ${symbol} does not match expected ${args.expectedAmount} ${symbol}.`,
      };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not decode transfer call.";
    return { ok: false, reason: `Could not decode token transfer: ${message}` };
  }
  return { ok: true, reason: "verified" };
}

