/**
 * WebSocket Price Feed System
 * Broadcasts real-time market data to connected clients
 * Supports forex, stocks, commodities with configurable intervals
 */

import type { Socket as IOSocket, Server as SocketIOServer } from "socket.io";
import { FOREX_PAIRS, STOCKS_LIST, COMMODITIES_LIST } from "./instruments";
import { logger } from "./logger";

let priceNamespace: ReturnType<SocketIOServer["of"]> | null = null;

// Simulated price data (in production, connect to real broker feeds)
const priceCache: Record<string, { bid: number; ask: number; mid: number; timestamp: number }> = {};

// Initialize price data
function initializePrices() {
  const allInstruments = [...FOREX_PAIRS, ...STOCKS_LIST, ...COMMODITIES_LIST];
  allInstruments.forEach((instrument: any) => {
    const basePrice = Math.random() * 1000 + 10;
    const spread = Number(instrument.spread ?? 0.0002);
    priceCache[instrument.symbol] = {
      bid: basePrice - (basePrice * spread) / 2,
      ask: basePrice + (basePrice * spread) / 2,
      mid: basePrice,
      timestamp: Date.now()
    };
  });
}

// Simulate price movements (in production, use real data feeds)
function updatePrices() {
  Object.keys(priceCache).forEach(symbol => {
    const currentPrice = priceCache[symbol].mid;
    const volatility = Math.random() * 0.004 - 0.002; // ±0.2% movement
    const newPrice = currentPrice * (1 + volatility);
    const spread = 0.0002;

    priceCache[symbol] = {
      bid: newPrice - (newPrice * spread) / 2,
      ask: newPrice + (newPrice * spread) / 2,
      mid: newPrice,
      timestamp: Date.now()
    };
  });
}

export function initPriceFeed(io: SocketIOServer) {
  priceNamespace = io.of("/prices");

  initializePrices();

  // Handle connections
  priceNamespace.on("connection", (socket: IOSocket) => {
    logger.info({ socketId: socket.id }, "[PRICE-FEED] Client connected");

    // Client subscribes to specific symbols
    socket.on("subscribe", (symbols: string[]) => {
      const validSymbols = symbols.filter(s => priceCache[s]);
      socket.join(validSymbols);
      socket.emit("subscribed", {
        symbols: validSymbols,
        prices: validSymbols.reduce((acc, symbol) => {
          acc[symbol] = priceCache[symbol];
          return acc;
        }, {} as any)
      });

      logger.info({
        socketId: socket.id,
        symbols: validSymbols
      }, "[PRICE-FEED] Subscribed to symbols");
    });

    // Client unsubscribes
    socket.on("unsubscribe", (symbols: string[]) => {
      symbols.forEach(s => socket.leave(s));
      logger.info({
        socketId: socket.id,
        symbols
      }, "[PRICE-FEED] Unsubscribed from symbols");
    });

    // Get current price snapshot
    socket.on("get_price", (symbol: string, callback: (response: { success: boolean; data?: Record<string, unknown>; error?: string }) => void) => {
      const price = priceCache[symbol];
      if (price) {
        callback({ success: true, data: price });
      } else {
        callback({ success: false, error: "Symbol not found" });
      }
    });

    socket.on("disconnect", () => {
      logger.info({ socketId: socket.id }, "[PRICE-FEED] Client disconnected");
    });
  });

  // Broadcast price updates every 1000ms (1 second)
  const priceUpdateInterval = setInterval(() => {
    updatePrices();

    // Broadcast to subscribed clients
    Object.keys(priceCache).forEach(symbol => {
      priceNamespace!.to(symbol).emit("price_update", {
        symbol,
        ...priceCache[symbol]
      });
    });
  }, 1000);

  // Cleanup on server close
  return () => clearInterval(priceUpdateInterval);
}

export function getPriceNamespace() {
  return priceNamespace;
}

export function getPrice(symbol: string) {
  return priceCache[symbol];
}

export function getPrices(symbols: string[]) {
  return symbols.reduce((acc, symbol) => {
    if (priceCache[symbol]) {
      acc[symbol] = priceCache[symbol];
    }
    return acc;
  }, {} as Record<string, any>);
}

// OHLC (Open-High-Low-Close) candle generation
interface Candle {
  symbol: string;
  timeframe: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: number;
}

const candleData: Record<string, Record<string, Candle>> = {};

export function generateCandle(symbol: string, timeframe: string = "1m"): Candle | null {
  const price = priceCache[symbol];
  if (!price) return null;

  const _key = `${symbol}:${timeframe}`;
  const now = Date.now();
  const timeframeMs = parseTimeframe(timeframe);

  // Initialize if not exists
  if (!candleData[symbol]) {
    candleData[symbol] = {};
  }

  const lastCandle = candleData[symbol][timeframe];
  const shouldCreateNewCandle = !lastCandle || (now - lastCandle.timestamp) >= timeframeMs;

  if (shouldCreateNewCandle) {
    const candle: Candle = {
      symbol,
      timeframe,
      open: lastCandle?.close || price.mid,
      high: price.mid * 1.002,
      low: price.mid * 0.998,
      close: price.mid,
      volume: Math.floor(Math.random() * 10000),
      timestamp: now
    };

    candleData[symbol][timeframe] = candle;
    return candle;
  }

  return lastCandle;
}

function parseTimeframe(timeframe: string): number {
  const value = parseInt(timeframe);
  const unit = timeframe.replace(/\d/g, "");

  switch (unit) {
    case "m": return value * 60 * 1000;
    case "h": return value * 60 * 60 * 1000;
    case "d": return value * 24 * 60 * 60 * 1000;
    case "w": return value * 7 * 24 * 60 * 60 * 1000;
    default: return value * 60 * 1000; // Default to minutes
  }
}

export function getCandles(symbol: string, timeframe: string, _limit: number = 50): Candle[] {
  // In production, fetch from database
  // This is a simplified version
  const candle = generateCandle(symbol, timeframe);
  return candle ? [candle] : [];
}
