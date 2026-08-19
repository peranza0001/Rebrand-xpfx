/**
 * Economic Calendar & Price Alerts
 * Provides forex traders with economic events and price monitoring
 */

import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/session";
import { getUserData, newId, NOW } from "../lib/store";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// Mock economic calendar events
const ECONOMIC_EVENTS = [
  {
    id: "ev_001",
    eventName: "US Non-Farm Payroll",
    country: "United States",
    scheduledTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
    impactLevel: "high",
    forecast: "199,000",
    previous: "206,000",
    actual: null,
    affectedPairs: ["EUR/USD", "GBP/USD", "USD/JPY", "USD/CHF"],
    relevanceScore: 9.5
  },
  {
    id: "ev_002",
    eventName: "ECB Interest Rate Decision",
    country: "Eurozone",
    scheduledTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    impactLevel: "high",
    forecast: "3.50%",
    previous: "3.75%",
    actual: null,
    affectedPairs: ["EUR/USD", "EUR/GBP", "EUR/JPY"],
    relevanceScore: 9.8
  },
  {
    id: "ev_003",
    eventName: "UK Retail Sales",
    country: "United Kingdom",
    scheduledTime: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    impactLevel: "medium",
    forecast: "-0.3%",
    previous: "0.2%",
    actual: null,
    affectedPairs: ["GBP/USD", "EUR/GBP"],
    relevanceScore: 7.2
  },
  {
    id: "ev_004",
    eventName: "Japan CPI",
    country: "Japan",
    scheduledTime: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
    impactLevel: "medium",
    forecast: "2.1%",
    previous: "2.3%",
    actual: null,
    affectedPairs: ["USD/JPY", "EUR/JPY"],
    relevanceScore: 7.5
  },
  {
    id: "ev_005",
    eventName: "US Consumer Confidence",
    country: "United States",
    scheduledTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    impactLevel: "medium",
    forecast: "104.5",
    previous: "106.1",
    actual: null,
    affectedPairs: ["EUR/USD", "USD/JPY"],
    relevanceScore: 7.0
  },
];

// Get economic calendar
router.get("/calendar/events", (_req, res) => {
  const sorted = [...ECONOMIC_EVENTS].sort((a, b) => 
    new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime()
  );

  return res.json({
    events: sorted,
    count: sorted.length,
    description: "Upcoming economic events and their impact on forex pairs"
  });
});

// Get events for specific currency
router.get("/calendar/events/:currency", (req, res) => {
  const { currency } = req.params;
  const countryMap: Record<string, string> = {
    USD: "United States",
    EUR: "Eurozone",
    GBP: "United Kingdom",
    JPY: "Japan",
    CHF: "Switzerland",
    CAD: "Canada",
    AUD: "Australia",
    NZD: "New Zealand"
  };

  const country = countryMap[currency.toUpperCase()];
  if (!country) {
    return res.status(404).json({ error: `Unknown currency: ${currency}` });
  }

  const events = ECONOMIC_EVENTS.filter(e => e.country === country);
  return res.json({
    currency,
    country,
    events,
    count: events.length
  });
});

// Get high-impact events (>7.0 relevance)
router.get("/calendar/high-impact", (_req, res) => {
  const highImpact = ECONOMIC_EVENTS.filter(e => e.impactLevel === "high");
  return res.json({
    highImpactEvents: highImpact,
    count: highImpact.length,
    description: "High-impact events that typically cause significant price movement"
  });
});

// Create price alert
router.post("/alerts/create", requireAuth, (req, res) => {
  const { symbol, alertPrice, isAbove = true } = req.body;

  if (!symbol || alertPrice === undefined) {
    return res.status(400).json({ error: "Missing fields: symbol, alertPrice" });
  }

  const alert = {
    id: newId("alert"),
    userId: req.userId!,
    symbol,
    alertPrice,
    isAbove,
    isTriggered: false,
    createdAt: NOW(),
    direction: isAbove ? "above" : "below"
  };

  const data = getUserData(req.userId!);
  data.priceAlerts = data.priceAlerts || [];
  (data.priceAlerts as any[]).push(alert);

  logger.info({
    userId: req.userId,
    symbol,
    alertPrice,
    direction: alert.direction
  }, "[ALERT] Price alert created");

  return res.status(201).json({
    success: true,
    alert,
    message: `Alert created: Notify when ${symbol} goes ${isAbove ? "above" : "below"} $${alertPrice}`
  });
});

// Get user's price alerts
router.get("/alerts", requireAuth, (req, res) => {
  const data = getUserData(req.userId!);
  const alerts = data.priceAlerts || [];

  return res.json({
    alerts,
    count: alerts.length,
    active: alerts.filter((a: any) => !a.isTriggered).length,
    triggered: alerts.filter((a: any) => a.isTriggered).length
  });
});

// Delete price alert
router.delete("/alerts/:alertId", requireAuth, (req, res) => {
  const { alertId } = req.params;
  const data = getUserData(req.userId!);

  const alerts = data.priceAlerts || [];
  const index = alerts.findIndex((a: any) => a.id === alertId);

  if (index === -1) {
    return res.status(404).json({ error: "Alert not found" });
  }

  const removed = alerts.splice(index, 1)[0];
  logger.info({
    userId: req.userId,
    alertId
  }, "[ALERT] Price alert deleted");

  return res.json({
    success: true,
    message: "Alert deleted",
    removed
  });
});

// Get all active alerts for a symbol (admin/system)
router.get("/alerts/symbol/:symbol", (req, res) => {
  // In production, query from database across all users
  // This is a system endpoint for price monitoring backend
  return res.json({
    symbol: req.params.symbol,
    message: "Endpoint for backend monitoring system"
  });
});

export default router;
