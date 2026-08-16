import { Activity, ArrowDownRight, ArrowUpRight, PauseCircle, TrendingUp, TrendingDown, XCircle, Target, Zap, Shield, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Area, AreaChart, BarChart, Bar } from "recharts";
import { useState } from "react";

export interface LiveTradeSnapshot {
  id: string;
  symbol: string;
  side: "buy" | "sell" | "long" | "short";
  entryPrice: number;
  currentPrice: number;
  size: number;
  pnl: number;
  pnlPercent: number;
  stopLoss?: number;
  takeProfit?: number;
  status?: "open" | "pending" | "cancelled";
}

interface LiveTradeMonitorProps {
  trades: LiveTradeSnapshot[];
  title?: string;
  subtitle?: string;
  chartSeries?: Array<{ time: number | string; price: number }>;
  onCloseTrade?: (tradeId: string) => void;
  onCancelTrade?: (tradeId: string) => void;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function deriveChartSeries(trades: LiveTradeSnapshot[]) {
  const primary = trades[0];
  if (!primary) return [];

  const base = primary.entryPrice || 1;
  const points = Array.from({ length: 12 }, (_, index) => {
    const drift = (index - 5) * (base * 0.0025);
    const price = Number((primary.currentPrice + drift).toFixed(5));
    return {
      time: Date.now() - (11 - index) * 60 * 1000,
      price,
    };
  });

  return points;
}

export function LiveTradeMonitor({
  trades,
  title = "Live trading analysis",
  subtitle = "Monitor trade momentum, risk and execution decisions in real time.",
  chartSeries,
  onCloseTrade,
  onCancelTrade,
}: LiveTradeMonitorProps) {
  const safeTrades = trades.filter((trade) => trade && Number.isFinite(trade.currentPrice));
  const activeTrade = safeTrades.find((trade) => trade.status !== "cancelled") ?? safeTrades[0];
  const series = chartSeries && chartSeries.length > 0 ? chartSeries : deriveChartSeries(safeTrades);
  const [showRiskMetrics, setShowRiskMetrics] = useState(true);

  // Calculate professional risk/reward metrics
  const riskRewardRatio = activeTrade ? 
    Math.abs((activeTrade.takeProfit || activeTrade.currentPrice * 1.02) - activeTrade.entryPrice) / 
    Math.max(0.0001, Math.abs(activeTrade.entryPrice - (activeTrade.stopLoss || activeTrade.currentPrice * 0.98)))
    : 0;

  const riskPercentage = activeTrade && activeTrade.stopLoss ? 
    Math.abs((activeTrade.entryPrice - activeTrade.stopLoss) / activeTrade.entryPrice * 100)
    : 0;

  const profitTarget = activeTrade && activeTrade.takeProfit ?
    Math.abs((activeTrade.takeProfit - activeTrade.entryPrice) / activeTrade.entryPrice * 100)
    : 0;

  const distanceToStop = activeTrade && activeTrade.stopLoss ?
    Math.abs((activeTrade.currentPrice - activeTrade.stopLoss) / activeTrade.stopLoss * 100)
    : 0;

  const distanceToTarget = activeTrade && activeTrade.takeProfit ?
    Math.abs((activeTrade.takeProfit - activeTrade.currentPrice) / activeTrade.currentPrice * 100)
    : 0;

  // Market sentiment based on P&L trend
  const sentimentScore = activeTrade ? 
    Math.min(100, Math.max(0, 50 + (activeTrade.pnlPercent * 5)))
    : 50;

  const signalText = !activeTrade
    ? "No active trades. Choose an instrument and open a position when the market setup matches your plan."
    : activeTrade.pnl >= 0
      ? `Momentum is constructive for ${activeTrade.symbol}. Consider protecting gains or scaling into additional exposure.`
      : `Risk is elevated on ${activeTrade.symbol}. Reduce size, tighten stops, or exit before the next pullback.`;

  // Enhanced chart data with sentiment coloring
  const enhancedChartData = series.map((point, idx) => ({
    ...point,
    time: typeof point.time === "number" ? new Date(point.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : point.time,
    sentiment: 50 + (Math.random() - 0.5) * 30, // Simulated sentiment data
  }));

  return (
    <Card className="border-border/60 bg-card/80">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary animate-pulse" />
              {title}
              {activeTrade && <Badge variant="outline" className="ml-2 text-xs">LIVE STREAM</Badge>}
            </CardTitle>
            <CardDescription className="mt-1">{subtitle}</CardDescription>
          </div>
          {activeTrade && (
            <div className="flex items-center gap-2">
              <Badge variant={activeTrade.pnl >= 0 ? "default" : "secondary"} className={activeTrade.pnl >= 0 ? "bg-emerald-600/90" : "bg-amber-600/80"}>
                {activeTrade.pnl >= 0 ? "Bullish setup" : "Risk alert"}
              </Badge>
              <Button size="sm" variant="ghost" onClick={() => setShowRiskMetrics(!showRiskMetrics)}>
                {showRiskMetrics ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {activeTrade ? (
          <>
            {/* Main chart with enhanced visualization */}
            <div className="grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
              <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Selected trade</div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="font-mono text-xl font-semibold">{activeTrade.symbol}</span>
                      <Badge variant="outline" className="capitalize">{activeTrade.side}</Badge>
                      <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/30">
                        {activeTrade.currentPrice.toFixed(5)}
                      </Badge>
                    </div>
                  </div>
                  <div className={`text-right ${activeTrade.pnl >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">P&L</div>
                    <div className="text-2xl font-semibold">
                      {activeTrade.pnl >= 0 ? "+" : "-"}
                      {formatCurrency(Math.abs(activeTrade.pnl))}
                    </div>
                    <div className={`text-xs font-semibold ${activeTrade.pnlPercent >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                      {activeTrade.pnlPercent >= 0 ? "+" : ""}{activeTrade.pnlPercent.toFixed(2)}%
                    </div>
                  </div>
                </div>

                {/* Enhanced line chart */}
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={enhancedChartData}>
                      <defs>
                        <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={activeTrade.pnl >= 0 ? "#22c55e" : "#f97316"} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={activeTrade.pnl >= 0 ? "#22c55e" : "#f97316"} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#475569" opacity={0.25} />
                      <XAxis dataKey="time" stroke="#94a3b8" style={{ fontSize: 11 }} minTickGap={18} />
                      <YAxis stroke="#94a3b8" style={{ fontSize: 11 }} domain={[(dataMin: number) => Math.max(0, dataMin * 0.995), (dataMax: number) => dataMax * 1.005]} />
                      <Tooltip
                        formatter={(value: number) => [formatCurrency(Number(value)), "Price"]}
                        labelFormatter={(label) => `Time: ${label}`}
                        contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: 10 }}
                      />
                      <Area type="monotone" dataKey="price" stroke={activeTrade.pnl >= 0 ? "#22c55e" : "#f97316"} strokeWidth={2.5} fillOpacity={1} fill="url(#colorPrice)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Chart legend with entry/current/stops */}
                <div className="mt-3 grid grid-cols-4 gap-2 text-xs">
                  <div className="rounded bg-blue-500/10 border border-blue-500/30 p-2">
                    <div className="text-muted-foreground">Entry</div>
                    <div className="font-mono font-semibold text-blue-500">{activeTrade.entryPrice.toFixed(5)}</div>
                  </div>
                  <div className="rounded bg-green-500/10 border border-green-500/30 p-2">
                    <div className="text-muted-foreground">Current</div>
                    <div className="font-mono font-semibold text-green-500">{activeTrade.currentPrice.toFixed(5)}</div>
                  </div>
                  <div className="rounded bg-red-500/10 border border-red-500/30 p-2">
                    <div className="text-muted-foreground">Stop Loss</div>
                    <div className="font-mono font-semibold text-red-500">{activeTrade.stopLoss ? activeTrade.stopLoss.toFixed(5) : "—"}</div>
                  </div>
                  <div className="rounded bg-emerald-500/10 border border-emerald-500/30 p-2">
                    <div className="text-muted-foreground">Target</div>
                    <div className="font-mono font-semibold text-emerald-500">{activeTrade.takeProfit ? activeTrade.takeProfit.toFixed(5) : "—"}</div>
                  </div>
                </div>
              </div>

              {/* Risk metrics panel */}
              <div className="space-y-3">
                <div className="rounded-lg border border-border/60 bg-background/80 p-3">
                  <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Trading Signal</div>
                  <div className="text-sm text-foreground leading-relaxed">{signalText}</div>
                </div>

                {showRiskMetrics && (
                  <>
                    <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Zap className="h-3.5 w-3.5 text-yellow-600" />
                        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">Risk/Reward</div>
                      </div>
                      <div className="text-lg font-semibold text-yellow-600">{riskRewardRatio.toFixed(2)}:1</div>
                      <div className="text-xs text-muted-foreground mt-1">Optimal: 1.5:1 or higher</div>
                    </div>

                    <div className="rounded-lg border border-border/60 p-3">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">Distance to Stop</div>
                      <div className="text-sm font-semibold">{distanceToStop.toFixed(1)}%</div>
                      <div className="mt-1 w-full bg-border/30 rounded-full h-1.5">
                        <div 
                          className={`h-full rounded-full transition-all ${
                            distanceToStop > 50 ? "bg-emerald-500" : distanceToStop > 25 ? "bg-yellow-500" : "bg-rose-500"
                          }`}
                          style={{ width: `${Math.min(distanceToStop, 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="rounded-lg border border-border/60 p-3">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">Distance to Target</div>
                      <div className="text-sm font-semibold">{distanceToTarget.toFixed(1)}%</div>
                      <div className="mt-1 w-full bg-border/30 rounded-full h-1.5">
                        <div 
                          className="h-full rounded-full bg-emerald-500 transition-all"
                          style={{ width: `${Math.min(distanceToTarget, 100)}%` }}
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Professional metrics grid */}
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-lg border border-border/60 p-3">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground mb-2">
                  <Target className="h-3.5 w-3.5" /> Return
                </div>
                <div className={`text-2xl font-semibold ${activeTrade.pnl >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                  {activeTrade.pnlPercent >= 0 ? "+" : ""}{activeTrade.pnlPercent.toFixed(2)}%
                </div>
              </div>
              <div className="rounded-lg border border-border/60 p-3">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground mb-2">
                  <Activity className="h-3.5 w-3.5" /> Volume
                </div>
                <div className="text-2xl font-mono font-semibold">{activeTrade.size.toFixed(2)}</div>
              </div>
              <div className="rounded-lg border border-border/60 p-3">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground mb-2">
                  <Shield className="h-3.5 w-3.5" /> Risk %
                </div>
                <div className="text-2xl font-semibold text-orange-600">{riskPercentage.toFixed(2)}%</div>
              </div>
              <div className="rounded-lg border border-border/60 p-3">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground mb-2">
                  <PauseCircle className="h-3.5 w-3.5" /> Status
                </div>
                <div className="text-xl font-semibold capitalize">{activeTrade.status ?? "open"}</div>
              </div>
            </div>

            {/* Position list with actions */}
            <div className="space-y-3">
              {safeTrades.map((trade) => (
                <div key={trade.id} className="flex flex-col gap-3 rounded-xl border border-border/60 bg-background/40 p-3 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold">{trade.symbol}</span>
                      <Badge variant={trade.pnl >= 0 ? "default" : "secondary"} className={trade.pnl >= 0 ? "bg-emerald-600/90" : "bg-amber-600/80"}>
                        {trade.side}
                      </Badge>
                      {trade.status === "open" && <Badge variant="outline" className="text-green-600 border-green-500/30 bg-green-500/5">ACTIVE</Badge>}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Entry {trade.entryPrice.toFixed(4)} · Last {trade.currentPrice.toFixed(4)} · {trade.pnlPercent.toFixed(2)}%
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`text-right ${trade.pnl >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                      <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">P&L</div>
                      <div className="font-mono font-semibold">
                        {trade.pnl >= 0 ? "+" : "-"}
                        {formatCurrency(Math.abs(trade.pnl))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => onCancelTrade?.(trade.id)}>
                        <XCircle className="mr-1 h-3.5 w-3.5" />
                        Cancel
                      </Button>
                      <Button size="sm" variant={trade.pnl >= 0 ? "secondary" : "destructive"} onClick={() => onCloseTrade?.(trade.id)}>
                        {trade.pnl >= 0 ? <TrendingUp className="mr-1 h-3.5 w-3.5" /> : <ArrowDownRight className="mr-1 h-3.5 w-3.5" />}
                        {trade.pnl >= 0 ? "Take profit" : "Cut loss"}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-dashed border-border/60 bg-muted/10 p-8 text-center text-sm text-muted-foreground">
            No live trades are active right now. Use the market watch and trading panel to open the next position.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
