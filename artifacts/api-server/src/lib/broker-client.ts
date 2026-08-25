import axios from "axios";
import { env } from "./env";
import { logger } from "./logger";

export type BrokerSide = "buy" | "sell";

export interface BrokerOrderRequest {
  symbol: string;
  side: BrokerSide;
  quantity: number;
  leverage?: number;
  type?: "market" | "limit";
  limitPrice?: number;
  userId?: string;
}

export interface BrokerOrderResult {
  ok: boolean;
  provider: string;
  orderId?: string;
  executionPrice?: number;
  status?: string;
  message?: string;
  raw?: unknown;
}

function getProviderName(): string {
  return (env.BROKER_EXECUTION_PROVIDER ?? "custom").trim().toLowerCase() || "custom";
}

function normalizeSide(side: BrokerSide): "buy" | "sell" {
  return side === "buy" ? "buy" : "sell";
}

function createHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (env.BROKER_API_KEY?.trim()) {
    headers.Authorization = `Bearer ${env.BROKER_API_KEY.trim()}`;
  }
  return headers;
}

export function isBrokerExecutionConfiguredForRuntime(rawEnv: Record<string, string | undefined> = process.env): boolean {
  const provider = (rawEnv.BROKER_EXECUTION_PROVIDER ?? rawEnv.BROKER_API_URL ?? "custom").trim().toLowerCase();
  if (!provider || provider === "none" || provider === "disabled") return false;
  if (!rawEnv.BROKER_API_URL?.trim()) return false;
  if (!rawEnv.BROKER_ACCOUNT_ID?.trim() && !rawEnv.BROKER_API_KEY?.trim()) return false;
  return true;
}

function getBrokerEndpointPath(provider: string): string {
  switch (provider) {
    case "oanda":
      return `/v3/accounts/${encodeURIComponent(env.BROKER_ACCOUNT_ID ?? "")}/orders`;
    case "alpaca":
      return `/v1/trading/accounts/${encodeURIComponent(env.BROKER_ACCOUNT_ID ?? "")}/orders`;
    default:
      return "/api/trades/order";
  }
}

function buildPayload(request: BrokerOrderRequest): Record<string, unknown> {
  const provider = getProviderName();
  const side = normalizeSide(request.side);
  const quantity = Number(request.quantity);

  if (provider === "oanda") {
    return {
      order: {
        type: request.type === "limit" ? "LIMIT" : "MARKET",
        instrument: request.symbol,
        units: side === "buy" ? Math.round(quantity) : Math.round(quantity) * -1,
        side: side === "buy" ? "BUY" : "SELL",
        ...(request.type === "limit" && request.limitPrice !== undefined ? { price: request.limitPrice } : {}),
      },
    };
  }

  if (provider === "alpaca") {
    return {
      symbol: request.symbol,
      qty: String(Math.max(0, quantity)),
      side: side === "buy" ? "buy" : "sell",
      type: request.type === "limit" ? "limit" : "market",
      time_in_force: "day",
      ...(request.type === "limit" && request.limitPrice !== undefined ? { limit_price: request.limitPrice } : {}),
    };
  }

  return {
    symbol: request.symbol,
    side,
    quantity,
    leverage: request.leverage ?? 1,
    orderType: request.type ?? "market",
    limitPrice: request.limitPrice,
    userId: request.userId,
    source: "xpfx-live-trading",
  };
}

export async function submitBrokerOrder(request: BrokerOrderRequest): Promise<BrokerOrderResult> {
  const provider = getProviderName();
  const brokerUrl = env.BROKER_API_URL?.trim();

  if (!brokerUrl || !isBrokerExecutionConfiguredForRuntime()) {
    return {
      ok: false,
      provider,
      message: "Broker execution is not configured. Set BROKER_API_URL and broker credentials before enabling live trading.",
    };
  }

  try {
    const endpoint = `${brokerUrl.replace(/\/$/, "")}${getBrokerEndpointPath(provider)}`;
    const payload = buildPayload(request);
    const response = await axios.post(endpoint, payload, {
      headers: createHeaders(),
      timeout: 15000,
    });

    const data = response.data ?? {};
    const executionPrice =
      Number(data.executionPrice ?? data.price ?? data.tradePrice ?? data.price ?? data.order?.price ?? data.order?.filledPrice ?? data.order?.price ?? NaN) || undefined;
    const orderId = String(data.id ?? data.orderId ?? data.order?.id ?? data.uuid ?? data.order_uuid ?? "");
    const status = String(data.status ?? data.state ?? data.order?.state ?? "accepted");

    if (response.status >= 200 && response.status < 300) {
      return {
        ok: true,
        provider,
        orderId: orderId || undefined,
        executionPrice,
        status,
        raw: data,
        message: `Order accepted by ${provider} broker execution provider.`,
      };
    }

    return {
      ok: false,
      provider,
      status,
      raw: data,
      message: `Broker rejected the order with HTTP ${response.status}.`,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown broker execution error";
    logger.error({ provider, symbol: request.symbol, side: request.side, quantity: request.quantity, error: message }, "[BROKER] live order execution failed");
    return {
      ok: false,
      provider,
      message: `Broker order execution failed: ${message}`,
    };
  }
}

export default { submitBrokerOrder, isBrokerExecutionConfiguredForRuntime };
