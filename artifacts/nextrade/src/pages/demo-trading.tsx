import { useEffect, useMemo, useState } from "react";
import { io, type Socket } from 'socket.io-client';
import { useLocation } from "wouter";
import { ShieldCheck, RefreshCw, Zap, Target, TrendingUp, Activity, Shield, Play, RotateCcw, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shell } from "@/components/layout/Shell";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { useAuth } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import { getGetSessionQueryKey, useStartDemoSession } from "@workspace/api-client-react";
import { ChartContainer, ChartTooltipContent, ChartLegendContent } from "@/components/ui/chart";
import { Line, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { ModernDashboardHeader } from "@/components/modern-dashboard-header";
import { AdvancedTradingPanel } from "@/components/advanced-trading-panel";
import { TradingAnalytics } from "@/components/trading-analytics";
import { LiveTradeMonitor } from "@/components/live-trade-monitor";
import type { LiveTradeSnapshot } from "@/components/live-trade-monitor";
import { DemoTradingGuide } from "@/components/demo-trading-guide";
import { apiPath, apiUrl, loadCsrfToken } from "@/lib/api-url";

type MarketItem = {
  symbol: string;
  price: number;
  change: number;
  bias: "bullish" | "bearish";
};

type Position = {
  id: string;
  symbol: string;
  side: "long" | "short";
  entryPrice: number;
  currentPrice: number;
  size: number;
  pnl: number;
  pnlPercent: number;
  openTime: Date;
  leverage?: number;
};

type MarketHistoryPoint = {
  time: number;
  price: number;
};

const initialMarkets: MarketItem[] = [
  { symbol: "BTC", price: 65850, change: 2.4, bias: "bullish" },
  { symbol: "ETH", price: 3245, change: 1.8, bias: "bullish" },
  { symbol: "SOL", price: 174, change: -1.2, bias: "bearish" },
  { symbol: "USDT", price: 1, change: 0.01, bias: "bullish" },
];

const initialPositions: Position[] = [];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: value >= 1000 ? 0 : 2 }).format(value);
}

function DemoTradingContent() {
  const [, navigate] = useLocation();
  const { isAuthenticated, isDemo, user, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const demoMutation = useStartDemoSession();
  const [markets, setMarkets] = useState(initialMarkets);
  const [positions, setPositions] = useState<Position[]>(initialPositions);
  const [demoBalance, setDemoBalance] = useState(0);
  const [selectedSymbol, setSelectedSymbol] = useState(initialMarkets[0]!.symbol);
  const [marketHistory, setMarketHistory] = useState<Record<string, MarketHistoryPoint[]>>(() =>
    Object.fromEntries(
      initialMarkets.map((item) => [
        item.symbol,
        [{ time: Date.now() - 5 * 60 * 1000, price: item.price }],
      ])
    )
  );
  const [message, setMessage] = useState("Your practice account is ready. Choose a market, then try a Buy or Sell trade.");
  const [demoError, setDemoError] = useState<string | null>(null);
  const [demoRequested, setDemoRequested] = useState(false);
  const [demoStarted, setDemoStarted] = useState(false);

  const refreshDemoState = async () => {
    try {
      const res = await fetch(apiPath('/api/demo/account'), { credentials: 'include' });
      if (!res.ok) return;
      const snapshot = await res.json() as { balance: number; positions: Position[]; openPositions: number; totalPnl: number };
      setDemoBalance(snapshot.balance);
      setPositions(snapshot.positions);
      setMessage(snapshot.positions.length > 0 ? `Demo account state loaded with ${snapshot.openPositions} open position${snapshot.openPositions === 1 ? '' : 's'}.` : 'Demo account state loaded. Place a new simulated order to begin.');
    } catch {
      // graceful fallback
    }
  };

  useEffect(() => {
    if (!isAuthenticated || isLoading) return;

    void refreshDemoState();

    // Connect to Socket.IO demo-trading namespace for live prices
    const socket: Socket = io(`${apiUrl}/demo-trading`, { path: '/socket.io', withCredentials: true });
    socket.on('connect', () => {
      initialMarkets.forEach((market) => socket.emit('join_instrument', market.symbol));
    });
    socket.on('price_update', (payload: any) => {
      setMarkets((prev) => prev.map((item) => {
        if (item.symbol === payload.symbol) {
          const change = Number((((payload.price - item.price) / item.price) * 100).toFixed(2));
          return { ...item, price: Number(payload.price), change, bias: change >= 0 ? 'bullish' : 'bearish' };
        }
        return item;
      }));

      setMarketHistory((prev) => {
        const existing = prev[payload.symbol] ?? [];
        const nextPoints = [...existing, { time: Date.now(), price: Number(payload.price) }];
        return {
          ...prev,
          [payload.symbol]: nextPoints.slice(-40),
        };
      });
    });
    socket.on('order_filled', () => {
      void refreshDemoState();
    });
    socket.on('trade_closed', () => {
      void refreshDemoState();
    });
    socket.on('order_rejected', (payload: { reason?: string }) => {
      setMessage(payload?.reason ?? 'The demo order was rejected.');
    });

    return () => { socket.disconnect(); };
  }, [isAuthenticated, isLoading]);

  const ensureDemoSession = async () => {
    if (isAuthenticated && isDemo) {
      try {
        const csrfToken = await loadCsrfToken();
        const response = await fetch(apiPath('/api/demo/start'), {
          method: 'POST',
          headers: { 'X-CSRF-Token': csrfToken },
          credentials: 'include',
        });
        if (!response.ok) throw new Error('Unable to provision the durable demo account.');
        return true;
      } catch (error) {
        setDemoError(error instanceof Error ? error.message : 'Unable to start demo session.');
        return false;
      }
    }
    if (demoRequested) return demoStarted;

    setDemoError(null);
    setDemoRequested(true);

    try {
      await demoMutation.mutateAsync();
      await queryClient.invalidateQueries({ queryKey: getGetSessionQueryKey() });
      const csrfToken = await loadCsrfToken();
      const response = await fetch(apiPath('/api/demo/start'), {
        method: 'POST',
        headers: { 'X-CSRF-Token': csrfToken },
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Unable to provision the durable demo account.');
      setDemoStarted(true);
      return true;
    } catch (error: unknown) {
      const err = error as { message?: string };
      setDemoError(err.message ?? "Unable to start demo session.");
      setMessage("Demo session is currently unavailable. Please try again.");
      setDemoStarted(false);
      return false;
    }
  };

  useEffect(() => {
    if (!isAuthenticated && !demoRequested && !isLoading) {
      void ensureDemoSession();
    }
  }, [isAuthenticated, isDemo, demoRequested, isLoading]);

  useEffect(() => {
    if (!isAuthenticated) return;
    void refreshDemoState();
  }, [isAuthenticated]);

  const selectedMarket = useMemo(() => markets.find((item) => item.symbol === selectedSymbol) ?? markets[0]!, [markets, selectedSymbol]);
  const selectedMarketHistory = useMemo(
    () => marketHistory[selectedMarket.symbol] ?? [{ time: Date.now(), price: selectedMarket.price }],
    [marketHistory, selectedMarket.symbol, selectedMarket.price]
  );
  const chartData = useMemo(
    () =>
      selectedMarketHistory.map((point) => ({
        time: new Date(point.time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
        price: point.price,
      })),
    [selectedMarketHistory]
  );

  // Calculate professional metrics for trading analytics
  const performanceMetrics = useMemo(() => {
    const totalPnL = positions.reduce((sum, p) => sum + p.pnl, 0);
    const winningPositions = positions.filter((p) => p.pnl > 0);
    const losingPositions = positions.filter((p) => p.pnl < 0);
    const totalPositions = positions.length || 1;
    const averageWin = winningPositions.length ? (winningPositions.reduce((sum, p) => sum + p.pnl, 0) / winningPositions.length) : 0;
    const averageLoss = losingPositions.length ? (Math.abs(losingPositions.reduce((sum, p) => sum + p.pnl, 0)) / losingPositions.length) : 0;
    return {
      totalTrades: positions.length,
      winningTrades: winningPositions.length,
      losingTrades: losingPositions.length,
      winRate: ((winningPositions.length / totalPositions) * 100) || 0,
      averageWin,
      averageLoss,
      profitFactor: totalPnL > 0 ? 2.0 : (totalPnL < 0 ? 0.5 : 1.0),
      sharpeRatio: totalPositions > 0 ? 1.2 : 0,
      maxDrawdown: totalPnL > 0 ? 5 : 15,
      returnPercent: demoBalance > 0 ? (totalPnL / demoBalance) * 100 : 0,
      totalPnL,
    };
  }, [positions, demoBalance]);

  const equityHistory = useMemo(() => {
    const baseEquity = demoBalance;
    const totalPnL = positions.reduce((sum, p) => sum + p.pnl, 0);
    return [
      { timestamp: Date.now() - 4 * 60 * 60 * 1000, balance: baseEquity, equity: baseEquity },
      { timestamp: Date.now() - 3 * 60 * 60 * 1000, balance: baseEquity, equity: baseEquity + totalPnL * 0.3 },
      { timestamp: Date.now() - 2 * 60 * 60 * 1000, balance: baseEquity, equity: baseEquity + totalPnL * 0.5 },
      { timestamp: Date.now() - 1 * 60 * 60 * 1000, balance: baseEquity, equity: baseEquity + totalPnL * 0.7 },
      { timestamp: Date.now(), balance: baseEquity, equity: baseEquity + totalPnL },
    ];
  }, [positions]);

  const dailyPnLData = useMemo(() => {
    const totalPnL = positions.reduce((sum, p) => sum + p.pnl, 0);
    return [
      { date: 'Mon', pnl: totalPnL * 0.1, trades: positions.length || 1 },
      { date: 'Tue', pnl: totalPnL * 0.05, trades: positions.length || 1 },
      { date: 'Wed', pnl: totalPnL * -0.02, trades: positions.length || 1 },
      { date: 'Thu', pnl: totalPnL * 0.15, trades: positions.length || 1 },
      { date: 'Fri', pnl: totalPnL * 0.2, trades: positions.length || 1 },
    ];
  }, [positions]);

  const readiness = useMemo(() => {
    let score = 45;
    if (user?.kycVerified) score += 20;
    if (isAuthenticated) score += 20;
    if (user?.merchant) score += 5;
    return Math.min(100, score);
  }, [isAuthenticated, user]);

  const liveTradeSnapshots: LiveTradeSnapshot[] = positions.map((position) => {
    const normalizedSide = String(position.side ?? "long").toLowerCase() as "long" | "short";
    return {
      id: position.id,
      symbol: position.symbol,
      side: (normalizedSide === "long" ? "buy" : "sell") as LiveTradeSnapshot["side"],
      entryPrice: position.entryPrice,
      currentPrice: position.currentPrice,
      size: position.size,
      pnl: position.pnl,
      pnlPercent: position.pnlPercent,
      stopLoss: position.entryPrice * (normalizedSide === "long" ? 0.98 : 1.02),
      takeProfit: position.entryPrice * (normalizedSide === "long" ? 1.03 : 0.97),
      status: "open",
    };
  });

  const liveChartData = markets.slice(0, 12).map((market, index) => ({
    time: Date.now() - (markets.length - index) * 60 * 1000,
    price: market.price,
  }));

  const placeDemoOrder = async (order?: { symbol?: string; side?: 'buy' | 'sell'; volume?: number; orderType?: 'market' | 'limit' | 'stop'; price?: number; stopLoss?: number; takeProfit?: number }) => {
    if (!isAuthenticated) {
      const started = await ensureDemoSession();
      if (!started) return;
    }

    const sizeValue = Number(order?.volume ?? 0.01);
    if (!sizeValue || Number.isNaN(sizeValue)) {
      setMessage("Enter a valid position size to continue.");
      return;
    }

    const safeSize = Number(sizeValue.toFixed(4));
    try {
      const body = { instrument: order?.symbol ?? selectedMarket.symbol, type: order?.orderType ?? 'market', side: order?.side ?? 'buy', amount: safeSize, price: order?.price, stopLoss: order?.stopLoss, takeProfit: order?.takeProfit, leverage: 10 };
      const csrfToken = await loadCsrfToken();
      const resp = await fetch(apiPath('/api/demo/order'), { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken }, body: JSON.stringify(body), credentials: 'include' });
      if (!resp.ok) {
        const errorText = await resp.text();
        throw new Error(errorText || 'Order failed');
      }
      setMessage(`Demo order submitted for ${selectedMarket.symbol} — order queued.`);
      await refreshDemoState();
    } catch (err: unknown) {
      const error = err as { message?: string };
      setMessage(error.message ?? 'Failed to submit demo order.');
    }
  };

  const resetDemoAccount = async () => {
    try {
      const csrfToken = await loadCsrfToken();
      const response = await fetch(apiPath('/api/demo/reset-balance'), { method: 'POST', headers: { 'X-CSRF-Token': csrfToken }, credentials: 'include' });
      if (!response.ok) throw new Error('Unable to reset the practice account.');
      await refreshDemoState();
      setMessage('Practice account reset to its configured starting balance. Try a new strategy.');
    } catch (error: unknown) {
      setDemoError(error instanceof Error ? error.message : 'Unable to reset the practice account.');
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-full">
      {/* Modern professional dashboard header for demo account */}
      <ModernDashboardHeader
        accountName="Demo Trading Account"
        accountType="demo"
        equity={demoBalance + positions.reduce((sum, p) => sum + p.pnl, 0)}
        totalBalance={demoBalance}
        openPnL={positions.reduce((sum, p) => sum + p.pnl, 0)}
        usedMargin={positions.reduce((sum, p) => sum + p.size * selectedMarket.price * 0.1, 0)}
        freeMargin={demoBalance - positions.reduce((sum, p) => sum + p.size * selectedMarket.price * 0.1, 0)}
        marginLevel={demoBalance / Math.max(1, positions.reduce((sum, p) => sum + p.size * selectedMarket.price * 0.1, 0)) * 100}
        balancesMasked={false}
        onToggleBalance={() => {}}
      />

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-primary/20 bg-linear-to-br from-primary/10 via-background to-background">
          <CardHeader>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                <div>
                  <CardTitle className="text-xl">Professional demo trading workspace</CardTitle>
                  <CardDescription className="text-sm mt-1">
                    Risk-managed paper trading that mirrors institutional workflows
                  </CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">
                <Activity className="h-3 w-3 mr-1 rounded-full bg-blue-500 animate-pulse" />
                DEMO MODE
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="bg-blue-500/10 text-blue-600">
                <Target className="h-3 w-3 mr-1" />
                Free paper account
              </Badge>
              <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                <Shield className="h-3 w-3 mr-1" />
                Risk-managed
              </Badge>
              {isAuthenticated ? (
                <Badge className="bg-emerald-600">
                  <ShieldCheck className="h-3 w-3 mr-1" />
                  Registered learner
                </Badge>
              ) : (
                <Badge className="bg-amber-600">
                  <Activity className="h-3 w-3 mr-1" />
                  Demo session
                </Badge>
              )}
            </div>
            {!isAuthenticated && demoError && (
              <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-950 dark:text-rose-200">
                <div className="font-semibold">⚠️ Unable to start demo session</div>
                <p className="mt-1 text-xs">{demoError}</p>
              </div>
            )}
            {!isAuthenticated && !demoError && !demoStarted && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-950 dark:text-amber-200">
                <div className="font-semibold">🚀 Preparing your demo session</div>
                <p className="mt-1 text-xs">A seeded demo account is being created. You can start trading once your session is ready.</p>
              </div>
            )}
            <div className="rounded-lg border border-border p-4 bg-muted/30">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-sm text-muted-foreground font-semibold">Readiness to progress</div>
                  <div className="text-3xl font-bold mt-1">{readiness}%</div>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <ShieldCheck className="h-4 w-4" />
                  {readiness >= 85 ? "🎯 Ready for live account" : "📈 Keep practising"}
                </div>
              </div>
              <div className="w-full bg-border/30 rounded-full h-2">
                <div 
                  className="h-full rounded-full bg-linear-to-r from-amber-500 to-emerald-500 transition-all"
                  style={{ width: `${readiness}%` }}
                />
              </div>
            </div>

            <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20 text-xs text-blue-700 dark:text-blue-300">
              <strong>💡 Pro tip:</strong> Complete KYC verification, place at least 5 trades, and maintain a 60%+ win rate to unlock live-account review.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Paper account status</CardTitle>
            <CardDescription>Track your free demo balance and progress.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-linear-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-muted-foreground font-semibold">Demo balance</div>
                <button type="button" onClick={() => void refreshDemoState()} className="rounded-full border border-border p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
              <div className="text-3xl font-bold">{formatCurrency(demoBalance || 0)}</div>
              <div className="text-xs text-muted-foreground mt-2">Real-time paper balance</div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border border-border p-3 bg-card/50 hover:bg-card/80 transition-colors">
                <div className="text-muted-foreground text-xs mb-1 font-semibold">Open positions</div>
                <div className="text-2xl font-bold">{positions.length}</div>
                <div className="text-xs text-muted-foreground mt-1">Active trades</div>
              </div>
              <div className="rounded-lg border border-border p-3 bg-card/50 hover:bg-card/80 transition-colors">
                <div className="text-muted-foreground text-xs mb-1 font-semibold">Live P&L</div>
                <div className={`text-2xl font-bold ${positions.reduce((sum, position) => sum + position.pnl, 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {positions.reduce((sum, position) => sum + position.pnl, 0) >= 0 ? '+' : ''}{formatCurrency(positions.reduce((sum, position) => sum + position.pnl, 0))}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Unrealised</div>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              {isAuthenticated ? (
                <Button onClick={() => navigate("/education")} className="flex-1">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  Continue learning
                </Button>
              ) : (
                <>
                  <Button onClick={() => navigate("/signup")} className="flex-1">Create account</Button>
                  <Button variant="outline" onClick={() => navigate("/login")} className="flex-1">Log in</Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-emerald-500/30 bg-linear-to-br from-emerald-500/10 via-background to-background">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Play className="h-5 w-5 text-emerald-600" />
                Start your first practice trade
              </CardTitle>
              <CardDescription className="mt-1">A simple three-step tour using simulated funds only.</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => void resetDemoAccount()} disabled={!isAuthenticated}>
              <RotateCcw className="mr-1.5 h-4 w-4" />
              Reset demo
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            {[
              ["1", "Pick a market", "Select BTC, ETH, SOL, or USDT below."],
              ["2", "Choose a direction", "Buy if you expect a rise; Sell if you expect a fall."],
              ["3", "Watch the result", "Your price and P&L update while the simulation runs."],
            ].map(([number, title, description]) => (
              <div key={number} className="flex gap-3 rounded-lg border border-border/70 bg-card/60 p-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">{number}</span>
                <div>
                  <div className="text-sm font-semibold">{title}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{description}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => void placeDemoOrder({ symbol: selectedMarket.symbol, side: 'buy', volume: 0.01 })} disabled={!isAuthenticated} className="bg-emerald-600 hover:bg-emerald-700">
              <TrendingUp className="mr-1.5 h-4 w-4" />
              Buy {selectedMarket.symbol} with 0.01 units
            </Button>
            <Button onClick={() => void placeDemoOrder({ symbol: selectedMarket.symbol, side: 'sell', volume: 0.01 })} disabled={!isAuthenticated} variant="destructive">
              <TrendingUp className="mr-1.5 h-4 w-4 rotate-180" />
              Sell {selectedMarket.symbol} with 0.01 units
            </Button>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              No real funds or orders are used
            </div>
          </div>
          <div className="rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-sm text-muted-foreground" role="status">{message}</div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Live market watch</CardTitle>
            <CardDescription>Streamed pricing for core assets in your demo environment.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {markets.map((item) => (
              <button
                key={item.symbol}
                className={`flex w-full items-center justify-between rounded-lg border px-3 py-3 text-left ${selectedSymbol === item.symbol ? "border-primary bg-primary/5" : "border-border"}`}
                onClick={() => setSelectedSymbol(item.symbol)}
              >
                <div>
                  <div className="font-medium">{item.symbol}</div>
                  <div className="text-sm text-muted-foreground">{item.bias === "bullish" ? "Momentum up" : "Momentum down"}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{item.price}</div>
                  <div className={`text-sm ${item.change >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{item.change >= 0 ? "+" : ""}{item.change}%</div>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Modern advanced trading panel */}
        <div className="lg:col-span-2">
          <AdvancedTradingPanel
            positions={positions}
            selectedSymbol={selectedMarket.symbol}
            currentPrice={selectedMarket.price}
            balance={demoBalance}
            freeMargin={demoBalance - positions.reduce((sum, p) => sum + p.size * selectedMarket.price * 0.1, 0)}
            onPlaceOrder={placeDemoOrder}
            onClosePosition={async (posId) => {
              try {
                const resp = await fetch(apiPath(`/api/demo/position/${posId}`), { method: 'DELETE', credentials: 'include' });
                if (resp.ok) {
                  await refreshDemoState();
                  setMessage('Position closed successfully.');
                }
              } catch (err: unknown) {
                const error = err as { message?: string };
                setMessage(error.message ?? 'Failed to close position.');
              }
            }}
            loading={demoMutation.isPending}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Selected market price chart</CardTitle>
          <CardDescription>Track simulated positions while streamed market prices move.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-muted p-4 text-sm">
            <div>
              <div className="font-medium">{selectedMarket.symbol}</div>
              <div className="text-muted-foreground">Latest trade price</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-semibold">{selectedMarket.price}</div>
              <div className={`text-sm ${selectedMarket.change >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{selectedMarket.change >= 0 ? "+" : ""}{selectedMarket.change}%</div>
            </div>
          </div>

          <ChartContainer config={{ price: { label: `${selectedMarket.symbol} price`, color: '#0ea5e9' } }}>
            <LineChart data={chartData} margin={{ top: 12, right: 24, bottom: 12, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.35} />
              <XAxis dataKey="time" tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} interval={chartData.length > 8 ? 3 : 0} />
              <YAxis tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} domain={[dataMin => Math.min(dataMin, selectedMarket.price * 0.995), dataMax => Math.max(dataMax, selectedMarket.price * 1.005)]} />
              <Tooltip content={<ChartTooltipContent />} />
              <Legend verticalAlign="top" content={<ChartLegendContent />} />
              <Line type="monotone" dataKey="price" name="price" stroke="var(--color-price)" strokeWidth={2} dot={false} />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <LiveTradeMonitor
        trades={liveTradeSnapshots}
        title="Demo trade monitor"
        subtitle="Monitor open paper positions, set stop-loss and take-profit levels, and decide whether to scale in, close, or cancel the trade."
        chartSeries={liveChartData}
        onCloseTrade={async (tradeId) => {
          try {
            const resp = await fetch(apiPath(`/api/demo/position/${tradeId}`), { method: "DELETE", credentials: "include" });
            if (resp.ok) {
              await refreshDemoState();
              setMessage("Demo position closed successfully.");
            }
          } catch (err: unknown) {
            const error = err as { message?: string };
            setMessage(error.message ?? "Failed to close demo position.");
          }
        }}
        onCancelTrade={async (tradeId) => {
          try {
            const resp = await fetch(apiPath(`/api/demo/position/${tradeId}`), { method: "DELETE", credentials: "include" });
            if (resp.ok) {
              await refreshDemoState();
              setMessage("Demo position cancelled.");
            }
          } catch (err: unknown) {
            const error = err as { message?: string };
            setMessage(error.message ?? "Failed to cancel demo position.");
          }
        }}
      />

      {/* Professional live trading panel shown when there are open positions or recent orders */}
      {positions.length > 0 && (
        <LiveTradingPanel symbol={selectedMarket.symbol} price={selectedMarket.price} history={selectedMarketHistory} positions={positions} />
      )}

      {/* Trading analytics dashboard */}
      <TradingAnalytics
        metrics={performanceMetrics}
        equityCurveData={equityHistory}
        dailyPnLData={dailyPnLData}
        loading={false}
      />
    </div>
  );
}

export function DemoTradingPage() {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return (
      <Shell>
        <DemoTradingContent />
      </Shell>
    );
  }

  return (
    <PublicLayout>
      <DemoTradingContent />
    </PublicLayout>
  );
}

/* --------------------- Live trading subcomponents ------------------------ */

function LiveTradingPanel({ symbol, price, history, positions }: { symbol: string; price: number; history: MarketHistoryPoint[]; positions: Position[] }) {
  // build a lightweight synthetic order book around current price
  const book = useMemo(() => {
    const mid = price;
    const step = mid * 0.0005 || 0.0001;
    const bids = Array.from({ length: 6 }).map((_, i) => ({ price: +(mid - step * (i + 1)).toFixed(5), size: Math.round(100 + Math.random() * 900) }));
    const asks = Array.from({ length: 6 }).map((_, i) => ({ price: +(mid + step * (i + 1)).toFixed(5), size: Math.round(100 + Math.random() * 900) }));
    return { bids, asks };
  }, [price]);

  const ticks = history.slice(-40).map((p) => ({ time: new Date(p.time).toLocaleTimeString(), price: p.price }));

  const totalPnl = positions.reduce((acc, pos) => acc + pos.pnl, 0);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-lg">Live trading — {symbol}</CardTitle>
          <CardDescription>Chart, order book and live trades for your demo position.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">Last</div>
              <div className="text-2xl font-semibold">{price}</div>
            </div>
            <div className="text-right">
              <div className={`text-lg font-semibold ${totalPnl >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{totalPnl >= 0 ? '+' : ''}{formatCurrency(totalPnl)}</div>
              <div className="text-xs text-muted-foreground">Unrealised P&L</div>
            </div>
          </div>

          <ChartContainer config={{ price: { label: `${symbol} price`, color: '#34d399' } }}>
            <LineChart data={history.map((d) => ({ time: new Date(d.time).toLocaleTimeString(), price: d.price }))} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.25} />
              <XAxis dataKey="time" tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} interval={history.length > 8 ? 3 : 0} />
              <YAxis tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} />
              <Tooltip content={<ChartTooltipContent />} />
              <Line type="monotone" dataKey="price" stroke="#34d399" strokeWidth={2} dot={false} />
            </LineChart>
          </ChartContainer>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-muted-foreground mb-2">Order book (asks)</div>
              <div className="space-y-1">
                {book.asks.map((a) => (
                  <div key={a.price} className="flex items-center justify-between text-sm font-mono text-rose-600"><span>{a.price}</span><span>{a.size}</span></div>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-2">Order book (bids)</div>
              <div className="space-y-1">
                {book.bids.map((b) => (
                  <div key={b.price} className="flex items-center justify-between text-sm font-mono text-emerald-600"><span>{b.price}</span><span>{b.size}</span></div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Time & Sales</CardTitle>
          <CardDescription>Recent trade prints</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 max-h-96 overflow-auto">
          {ticks.map((t, i) => (
            <div key={`${t.time}-${i}`} className="flex items-center justify-between text-sm">
              <div className="text-muted-foreground">{t.time}</div>
              <div className="font-mono">{t.price}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Demo Trading Guide & Education */}
      <DemoTradingGuide />
    </div>
  );
}
