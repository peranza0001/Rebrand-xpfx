import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { AlertTriangle, BarChart3, Clock3, Lock, PlayCircle, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shell } from "@/components/layout/Shell";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { useAuth } from "@/lib/auth";

type MarketItem = {
  symbol: string;
  price: number;
  change: number;
  bias: "bullish" | "bearish";
};

type Position = {
  id: number;
  symbol: string;
  side: "Long" | "Short";
  entry: number;
  size: number;
  pnl: number;
};

const initialMarkets: MarketItem[] = [
  { symbol: "EUR/USD", price: 1.0854, change: 0.18, bias: "bullish" },
  { symbol: "GBP/JPY", price: 188.74, change: -0.42, bias: "bearish" },
  { symbol: "BTC/USD", price: 64820, change: 1.03, bias: "bullish" },
  { symbol: "XAU/USD", price: 2384.7, change: -0.64, bias: "bearish" },
];

const initialPositions: Position[] = [
  { id: 1, symbol: "EUR/USD", side: "Long", entry: 1.0842, size: 12000, pnl: 184.8 },
  { id: 2, symbol: "BTC/USD", side: "Short", entry: 65200, size: 0.35, pnl: 144.2 },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: value >= 1000 ? 0 : 2 }).format(value);
}

function DemoTradingContent() {
  const [, navigate] = useLocation();
  const { isAuthenticated, user } = useAuth();
  const [markets, setMarkets] = useState(initialMarkets);
  const [positions, setPositions] = useState(initialPositions);
  const [selectedSymbol, setSelectedSymbol] = useState(initialMarkets[0]!.symbol);
  const [side, setSide] = useState<"Buy" | "Sell">("Buy");
  const [size, setSize] = useState("2500");
  const [guestSecondsLeft, setGuestSecondsLeft] = useState(300);
  const [message, setMessage] = useState("Paper trading is live. Use the workspace below to practise risk-managed execution.");

  useEffect(() => {
    const interval = window.setInterval(() => {
      setMarkets((prev) =>
        prev.map((item) => {
          const drift = (Math.random() - 0.5) * 0.0025;
          const nextPrice = Math.max(0.1, item.price * (1 + drift));
          const change = Number(((nextPrice - item.price) / item.price) * 100);
          return {
            ...item,
            price: Number(nextPrice.toFixed(item.symbol.includes("BTC") ? 2 : item.symbol.includes("EUR") || item.symbol.includes("GBP") ? 4 : 2)),
            change: Number(change.toFixed(2)),
            bias: change >= 0 ? "bullish" : "bearish",
          };
        }),
      );
    }, 1600);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isAuthenticated) return;
    const interval = window.setInterval(() => {
      setGuestSecondsLeft((prev) => prev - 1);
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isAuthenticated]);

  const selectedMarket = useMemo(() => markets.find((item) => item.symbol === selectedSymbol) ?? markets[0]!, [markets, selectedSymbol]);
  const readiness = useMemo(() => {
    let score = 45;
    if (user?.kycVerified) score += 20;
    if (isAuthenticated) score += 20;
    if (user?.merchant) score += 5;
    return Math.min(100, score);
  }, [isAuthenticated, user]);

  const guestLocked = !isAuthenticated && guestSecondsLeft <= 0;

  const placeDemoOrder = () => {
    if (guestLocked) {
      setMessage("Your guest demo session has expired. Create an account to continue practising.");
      return;
    }

    const sizeValue = Number(size);
    if (!sizeValue || Number.isNaN(sizeValue)) {
      setMessage("Enter a valid position size to continue.");
      return;
    }

    const safeSize = Math.max(100, Math.round(sizeValue));
    const entry = selectedMarket.price;
    const newPosition: Position = {
      id: Date.now(),
      symbol: selectedMarket.symbol,
      side: side === "Buy" ? "Long" : "Short",
      entry,
      size: safeSize,
      pnl: Number((safeSize * 0.001 * (selectedMarket.bias === "bullish" ? 1 : -1)).toFixed(2)),
    };

    setPositions((prev) => [newPosition, ...prev].slice(0, 6));
    setMessage(`Demo order submitted for ${selectedMarket.symbol} at ${formatCurrency(entry)}. Your paper account remains risk-free.`);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background">
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
              {isAuthenticated ? <Badge className="bg-emerald-600">Registered learner</Badge> : <Badge className="bg-amber-600">Guest session</Badge>}
            </div>
            {!isAuthenticated && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-950 dark:text-amber-200">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Clock3 className="h-4 w-4" />
                    <span>Guest trial window</span>
                  </div>
                  <span className="font-semibold">{guestSecondsLeft}s</span>
                </div>
                <p className="mt-2">You can practise without signing in. When the timer expires, the workspace locks until you create an account.</p>
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
              <div className="text-sm text-muted-foreground">Demo balance</div>
              <div className="text-3xl font-semibold">{formatCurrency(50000)}</div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border border-border p-3">
                <div className="text-muted-foreground">Open positions</div>
                <div className="text-xl font-semibold">{positions.length}</div>
              </div>
              <div className="rounded-lg border border-border p-3">
                <div className="text-muted-foreground">Win rate</div>
                <div className="text-xl font-semibold">72%</div>
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

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Execution ticket</CardTitle>
            <CardDescription>Place a paper order with the same workflow used in professional trading desks.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {guestLocked ? (
              <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-950 dark:text-rose-200">
                <div className="flex items-center gap-2 font-semibold">
                  <Lock className="h-4 w-4" />
                  Guest session expired
                </div>
                <p className="mt-1">Create an account to continue with a fresh demo workspace.</p>
              </div>
            ) : (
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-950 dark:text-emerald-200">
                <div className="flex items-center gap-2 font-semibold">
                  <PlayCircle className="h-4 w-4" />
                  Demo trading active
                </div>
                <p className="mt-1">You are executing in paper mode. No real funds are at risk.</p>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="text-muted-foreground">Instrument</span>
                <div className="rounded-md border border-border px-3 py-2 font-medium">{selectedMarket.symbol}</div>
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-muted-foreground">Side</span>
                <select className="w-full rounded-md border border-border bg-background px-3 py-2" value={side} onChange={(event) => setSide(event.target.value as "Buy" | "Sell")}>
                  <option value="Buy">Buy / Long</option>
                  <option value="Sell">Sell / Short</option>
                </select>
              </label>
            </div>

            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Position size</span>
              <input className="w-full rounded-md border border-border bg-background px-3 py-2" type="number" value={size} onChange={(event) => setSize(event.target.value)} />
            </label>

            <div className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>{message}</span>
            </div>

            <Button className="w-full" onClick={placeDemoOrder} disabled={guestLocked}>
              {guestLocked ? "Guest session locked" : `Place ${side} order`}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Open positions</CardTitle>
          <CardDescription>Your paper-book stays organised and reflects live market movement.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {positions.map((position) => (
            <div key={position.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3">
              <div>
                <div className="font-medium">{position.symbol}</div>
                <div className="text-sm text-muted-foreground">{position.side} · Entry {formatCurrency(position.entry)} · Size {position.size}</div>
              </div>
              <div className="flex items-center gap-3">
                <div className={`rounded-full px-3 py-1 text-sm ${position.pnl >= 0 ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"}`}>
                  P&L {position.pnl >= 0 ? "+" : ""}{formatCurrency(position.pnl)}
                </div>
                <div className="text-sm text-muted-foreground">Paper mode</div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
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
