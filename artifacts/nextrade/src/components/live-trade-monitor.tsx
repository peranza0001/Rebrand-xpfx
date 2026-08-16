import { Activity, ArrowDownRight, ArrowUpRight, PauseCircle, TrendingUp, TrendingDown, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

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

  const signalText = !activeTrade
    ? "No active trades. Choose an instrument and open a position when the market setup matches your plan."
    : activeTrade.pnl >= 0
      ? `Momentum is constructive for ${activeTrade.symbol}. Consider protecting gains or scaling into additional exposure.`
      : `Risk is elevated on ${activeTrade.symbol}. Reduce size, tighten stops, or exit before the next pullback.`;

  return (
    <Card className="border-border/60 bg-card/80">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              {title}
            </CardTitle>
            <CardDescription className="mt-1">{subtitle}</CardDescription>
          </div>
          {activeTrade && (
            <Badge variant={activeTrade.pnl >= 0 ? "default" : "secondary"} className={activeTrade.pnl >= 0 ? "bg-emerald-600/90" : "bg-amber-600/80"}>
              {activeTrade.pnl >= 0 ? "Bullish setup" : "Risk alert"}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {activeTrade ? (
          <>
            <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
              <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm text-muted-foreground">Selected trade</div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="font-mono text-xl font-semibold">{activeTrade.symbol}</span>
                      <Badge variant="outline" className="capitalize">{activeTrade.side}</Badge>
                    </div>
                  </div>
                  <div className={`text-right ${activeTrade.pnl >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">P&L</div>
                    <div className="text-2xl font-semibold">
                      {activeTrade.pnl >= 0 ? "+" : "-"}
                      {formatCurrency(Math.abs(activeTrade.pnl))}
                    </div>
                  </div>
                </div>

                <div className="mt-4 h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={series.map((point) => ({ ...point, time: typeof point.time === "number" ? new Date(point.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : point.time }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#475569" opacity={0.25} />
                      <XAxis dataKey="time" stroke="#94a3b8" style={{ fontSize: 11 }} minTickGap={18} />
                      <YAxis stroke="#94a3b8" style={{ fontSize: 11 }} domain={[(dataMin: number) => Math.max(0, dataMin * 0.995), (dataMax: number) => dataMax * 1.005]} />
                      <Tooltip
                        formatter={(value: number) => [formatCurrency(Number(value)), "Price"]}
                        labelFormatter={(label) => `Time: ${label}`}
                        contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: 10 }}
                      />
                      <Line type="monotone" dataKey="price" stroke={activeTrade.pnl >= 0 ? "#22c55e" : "#f97316"} strokeWidth={2.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="space-y-3">
                <div className="rounded-lg border border-border/60 bg-background/80 p-3">
                  <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Decision</div>
                  <div className="mt-2 text-sm text-foreground">{signalText}</div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-border/60 p-3">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Entry</div>
                    <div className="mt-1 font-mono text-lg">{activeTrade.entryPrice.toFixed(4)}</div>
                  </div>
                  <div className="rounded-lg border border-border/60 p-3">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Last</div>
                    <div className="mt-1 font-mono text-lg">{activeTrade.currentPrice.toFixed(4)}</div>
                  </div>
                  <div className="rounded-lg border border-border/60 p-3">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Stop</div>
                    <div className="mt-1 font-mono text-lg">{activeTrade.stopLoss ? activeTrade.stopLoss.toFixed(4) : "—"}</div>
                  </div>
                  <div className="rounded-lg border border-border/60 p-3">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Target</div>
                    <div className="mt-1 font-mono text-lg">{activeTrade.takeProfit ? activeTrade.takeProfit.toFixed(4) : "—"}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-lg border border-border/60 p-3">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground"><TrendingUp className="h-3.5 w-3.5" /> Return</div>
                <div className={`mt-2 text-2xl font-semibold ${activeTrade.pnl >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                  {activeTrade.pnlPercent >= 0 ? "+" : ""}{activeTrade.pnlPercent.toFixed(2)}%
                </div>
              </div>
              <div className="rounded-lg border border-border/60 p-3">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground"><Activity className="h-3.5 w-3.5" /> Volume</div>
                <div className="mt-2 font-mono text-2xl">{activeTrade.size.toFixed(2)}</div>
              </div>
              <div className="rounded-lg border border-border/60 p-3">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground"><ArrowUpRight className="h-3.5 w-3.5" /> Long/Short</div>
                <div className="mt-2 text-xl font-semibold capitalize">{activeTrade.side}</div>
              </div>
              <div className="rounded-lg border border-border/60 p-3">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground"><PauseCircle className="h-3.5 w-3.5" /> Status</div>
                <div className="mt-2 text-xl font-semibold capitalize">{activeTrade.status ?? "open"}</div>
              </div>
            </div>

            <div className="space-y-3">
              {safeTrades.map((trade) => (
                <div key={trade.id} className="flex flex-col gap-3 rounded-xl border border-border/60 bg-background/40 p-3 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold">{trade.symbol}</span>
                      <Badge variant={trade.pnl >= 0 ? "default" : "secondary"} className={trade.pnl >= 0 ? "bg-emerald-600/90" : "bg-amber-600/80"}>
                        {trade.side}
                      </Badge>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Entry {trade.entryPrice.toFixed(4)} · Last {trade.currentPrice.toFixed(4)} · {trade.status ?? "open"}
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
