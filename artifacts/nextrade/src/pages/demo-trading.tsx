import { useEffect, useMemo, useState } from "react";
import { io, type Socket } from 'socket.io-client';
import { useLocation } from "wouter";
import { BarChart3, PlayCircle, ShieldCheck, Sparkles, RefreshCw } from "lucide-react";
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

type MarketItem = {
  symbol: string;
  price: number;
  change: number;
  bias: "bullish" | "bearish";
};

type Position = {
  id: string;
  symbol: string;
  side: "Long" | "Short";
  entry: number;
  size: number;
  pnl: number;
};

type MarketHistoryPoint = {
  time: number;
  price: number;
};

const initialMarkets: MarketItem[] = [
  { symbol: "EUR/USD", price: 1.0854, change: 0.18, bias: "bullish" },
  { symbol: "GBP/JPY", price: 188.74, change: -0.42, bias: "bearish" },
  { symbol: "BTC/USD", price: 64820, change: 1.03, bias: "bullish" },
  { symbol: "XAU/USD", price: 2384.7, change: -0.64, bias: "bearish" },
];

const initialPositions: Position[] = [];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: value >= 1000 ? 0 : 2 }).format(value);
}

function DemoTradingContent() {
  const [, navigate] = useLocation();
  const { isAuthenticated, user, isLoading } = useAuth();
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
  const [side, setSide] = useState<"Buy" | "Sell">("Buy");
  const [size, setSize] = useState("2500");
  const [message, setMessage] = useState("Paper trading is live. Use the workspace below to practise risk-managed execution.");
  const [demoError, setDemoError] = useState<string | null>(null);
  const [demoRequested, setDemoRequested] = useState(false);
  const [demoStarted, setDemoStarted] = useState(false);

  const refreshDemoState = async () => {
    try {
      const res = await fetch('/api/demo/account', { credentials: 'include' });
      if (!res.ok) return;
      const snapshot = await res.json() as { balance: number; positions: Position[]; openPositions: number; totalPnl: number };
      setDemoBalance(snapshot.balance);
      setPositions(snapshot.positions);
      setMessage(snapshot.positions.length > 0 ? `Live account snapshot loaded with ${snapshot.openPositions} open position${snapshot.openPositions === 1 ? '' : 's'}.` : 'Live account snapshot loaded. Place a new paper order to begin.');
    } catch {
      // graceful fallback
    }
  };

  useEffect(() => {
    if (!isAuthenticated || isLoading) return;

    void refreshDemoState();

    // Connect to Socket.IO demo-trading namespace for live prices
    const socket: Socket = io('/demo-trading', { path: '/socket.io', withCredentials: true });
    socket.on('connect', () => {
      ['EUR/USD', 'GBP/JPY', 'BTC/USD', 'XAU/USD'].forEach((s) => socket.emit('join_instrument', s));
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

    return () => { socket.disconnect(); };
  }, [isAuthenticated, isLoading]);

  const ensureDemoSession = async () => {
    if (isAuthenticated) return true;
    if (demoRequested) return demoStarted;

    setDemoError(null);
    setDemoRequested(true);

    try {
      await demoMutation.mutateAsync();
      await queryClient.invalidateQueries({ queryKey: getGetSessionQueryKey() });
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
  }, [isAuthenticated, demoRequested, isLoading]);

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
    const winningPositions = positions.filter(p => p.pnl > 0).length;
    const totalPositions = positions.length || 1;
    return {
      winRate: ((winningPositions / totalPositions) * 100) || 0,
      profitFactor: totalPnL > 0 ? 2.0 : (totalPnL < 0 ? 0.5 : 1.0),
      sharpeRatio: totalPositions > 0 ? 1.2 : 0,
      maxDrawdown: totalPnL > 0 ? -5 : -15,
    };
  }, [positions]);

  const equityHistory = useMemo(() => {
    const baseEquity = 50000;
    const totalPnL = positions.reduce((sum, p) => sum + p.pnl, 0);
    return [
      { time: 'Start', equity: baseEquity },
      { time: 'Day 1', equity: baseEquity + totalPnL * 0.3 },
      { time: 'Day 2', equity: baseEquity + totalPnL * 0.5 },
      { time: 'Day 3', equity: baseEquity + totalPnL * 0.7 },
      { time: 'Now', equity: baseEquity + totalPnL },
    ];
  }, [positions]);

  const dailyPnLData = useMemo(() => {
    const totalPnL = positions.reduce((sum, p) => sum + p.pnl, 0);
    return [
      { day: 'Mon', pnl: totalPnL * 0.1 },
      { day: 'Tue', pnl: totalPnL * 0.05 },
      { day: 'Wed', pnl: totalPnL * -0.02 },
      { day: 'Thu', pnl: totalPnL * 0.15 },
      { day: 'Fri', pnl: totalPnL * 0.2 },
    ];
  }, [positions]);

  const readiness = useMemo(() => {
    let score = 45;
    if (user?.kycVerified) score += 20;
    if (isAuthenticated) score += 20;
    if (user?.merchant) score += 5;
    return Math.min(100, score);
  }, [isAuthenticated, user]);

  const placeDemoOrder = async () => {
    if (!isAuthenticated) {
      const started = await ensureDemoSession();
      if (!started) return;
    }

    const sizeValue = Number(size);
    if (!sizeValue || Number.isNaN(sizeValue)) {
      setMessage("Enter a valid position size to continue.");
      return;
    }

    const safeSize = Math.max(100, Math.round(sizeValue));
    try {
      const body = { instrument: selectedMarket.symbol, type: 'market', side: side === 'Buy' ? 'buy' : 'sell', amount: safeSize, leverage: 10 };
      const resp = await fetch('/api/demo/order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), credentials: 'include' });
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
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <CardTitle className="text-xl">Professional demo trading workspace</CardTitle>
            </div>
            <CardDescription>
              Practise execution, risk management, and market read with a free paper account that mirrors institutional workflows.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Free paper account</Badge>
              <Badge variant="secondary">Risk-managed practice</Badge>
              {isAuthenticated ? <Badge className="bg-emerald-600">Registered learner</Badge> : <Badge className="bg-amber-600">Demo session</Badge>}
            </div>
            {!isAuthenticated && demoError && (
              <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-950 dark:text-rose-200">
                <div className="font-semibold">Unable to start demo session</div>
                <p className="mt-2">{demoError}</p>
              </div>
            )}
            {!isAuthenticated && !demoError && !demoStarted && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-950 dark:text-amber-200">
                <div className="font-semibold">Preparing your demo session</div>
                <p className="mt-2">A seeded demo account is being created. You can start trading once your session is ready.</p>
              </div>
            )}
            <div className="rounded-lg border border-border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">Readiness to progress</div>
                  <div className="text-2xl font-semibold">{readiness}%</div>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ShieldCheck className="h-4 w-4" />
                  {readiness >= 85 ? "Ready for live-account review" : "Keep practising to unlock live-account readiness"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Paper account status</CardTitle>
            <CardDescription>Track your free demo balance and your current readiness.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">Demo balance</div>
                <button type="button" onClick={() => void refreshDemoState()} className="rounded-full border border-border p-2 text-muted-foreground hover:text-foreground">
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
              <div className="text-3xl font-semibold">{formatCurrency(demoBalance || 0)}</div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border border-border p-3">
                <div className="text-muted-foreground">Open positions</div>
                <div className="text-xl font-semibold">{positions.length}</div>
              </div>
              <div className="rounded-lg border border-border p-3">
                <div className="text-muted-foreground">Live P&L</div>
                <div className={`text-xl font-semibold ${positions.reduce((sum, position) => sum + position.pnl, 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {positions.reduce((sum, position) => sum + position.pnl, 0) >= 0 ? '+' : ''}{formatCurrency(positions.reduce((sum, position) => sum + position.pnl, 0))}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {isAuthenticated ? (
                <Button onClick={() => navigate("/education")}>Continue learning</Button>
              ) : (
                <>
                  <Button onClick={() => navigate("/signup")}>Create account</Button>
                  <Button variant="outline" onClick={() => navigate("/login")}>Log in</Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

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
            balance={demoBalance}
            freeMargin={demoBalance - positions.reduce((sum, p) => sum + p.size * selectedMarket.price * 0.1, 0)}
            onPlaceOrder={async (order) => {
              setSize(String(order.amount));
              setSide(order.side === 'buy' ? 'Buy' : 'Sell');
              await placeDemoOrder();
            }}
            onClosePosition={async (posId) => {
              try {
                const resp = await fetch(`/api/demo/position/${posId}`, { method: 'DELETE', credentials: 'include' });
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
          <CardDescription>Track price action in your live demo environment as the market moves.</CardDescription>
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
    </div>
  );
}
