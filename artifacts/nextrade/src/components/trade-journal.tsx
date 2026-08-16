import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart3, Filter, Download } from "lucide-react";

interface Trade {
  id: string;
  symbol: string;
  entryTime: Date;
  exitTime?: Date;
  side: "buy" | "sell";
  entryPrice: number;
  exitPrice?: number;
  size: number;
  pnl: number;
  pnlPercent: number;
  status: "open" | "closed" | "pending";
  notes?: string;
}

interface TradeJournalProps {
  trades?: Trade[];
  onAnalyze?: (trade: Trade) => void;
}

export function TradeJournal({ trades = defaultTrades, onAnalyze }: TradeJournalProps) {
  const stats = useMemo(() => {
    const closedTrades = trades.filter((t) => t.status === "closed");
    const winningTrades = closedTrades.filter((t) => t.pnl > 0);
    const totalPnL = closedTrades.reduce((sum, t) => sum + t.pnl, 0);
    const avgWin = winningTrades.length > 0 ? winningTrades.reduce((sum, t) => sum + t.pnl, 0) / winningTrades.length : 0;
    const avgLoss = closedTrades.filter((t) => t.pnl < 0).length > 0
      ? closedTrades.filter((t) => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0) / closedTrades.filter((t) => t.pnl < 0).length
      : 0;

    return {
      totalTrades: closedTrades.length,
      winRate: closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0,
      totalPnL,
      avgWin,
      avgLoss,
      profitFactor: Math.abs(avgWin) > 0 ? Math.abs(avgLoss / avgWin) : 0,
    };
  }, [trades]);

  const sortedTrades = useMemo(() => {
    return [...trades].sort((a, b) => (b.entryTime.getTime()) - (a.entryTime.getTime()));
  }, [trades]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Total Trades</div>
            <div className="text-2xl font-bold mt-1">{stats.totalTrades}</div>
            <div className="text-xs text-muted-foreground mt-2">Closed positions</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Win Rate</div>
            <div className={`text-2xl font-bold mt-1 ${stats.winRate >= 50 ? "text-emerald-600" : "text-rose-600"}`}>
              {stats.winRate.toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              {Math.round(stats.winRate / 100 * stats.totalTrades)} wins
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Total P&L</div>
            <div className={`text-2xl font-bold mt-1 ${stats.totalPnL >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
              ${Math.abs(stats.totalPnL).toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              {stats.totalPnL >= 0 ? "+" : "-"}{(stats.totalPnL / 5000 * 100).toFixed(2)}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Profit Factor</div>
            <div className="text-2xl font-bold mt-1">{stats.profitFactor.toFixed(2)}</div>
            <div className="text-xs text-muted-foreground mt-2">
              {stats.profitFactor >= 1.5 ? "Excellent" : stats.profitFactor >= 1 ? "Good" : "Needs work"}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3 flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Trade Journal & History
            </CardTitle>
            <CardDescription>Track and analyze all your trades</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1">
              <Filter className="h-4 w-4" />
              Filter
            </Button>
            <Button variant="outline" size="sm" className="gap-1">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 font-semibold">Symbol</th>
                  <th className="text-left py-3 px-2 font-semibold">Side</th>
                  <th className="text-left py-3 px-2 font-semibold">Entry</th>
                  <th className="text-left py-3 px-2 font-semibold">Exit</th>
                  <th className="text-left py-3 px-2 font-semibold">Size</th>
                  <th className="text-right py-3 px-2 font-semibold">P&L</th>
                  <th className="text-center py-3 px-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {sortedTrades.map((trade) => (
                  <tr
                    key={trade.id}
                    className="border-b border-border/50 hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => onAnalyze?.(trade)}
                  >
                    <td className="py-3 px-2 font-semibold">{trade.symbol}</td>
                    <td className="py-3 px-2">
                      <Badge variant={trade.side === "buy" ? "default" : "secondary"} className="uppercase text-xs">
                        {trade.side}
                      </Badge>
                    </td>
                    <td className="py-3 px-2 font-mono text-xs">{trade.entryPrice.toFixed(4)}</td>
                    <td className="py-3 px-2 font-mono text-xs">
                      {trade.exitPrice ? trade.exitPrice.toFixed(4) : "-"}
                    </td>
                    <td className="py-3 px-2">{trade.size}</td>
                    <td className={`py-3 px-2 text-right font-mono font-bold ${trade.pnl >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                      {trade.pnl >= 0 ? "+" : ""}{trade.pnl.toFixed(2)} ({trade.pnlPercent >= 0 ? "+" : ""}{trade.pnlPercent.toFixed(2)}%)
                    </td>
                    <td className="py-3 px-2 text-center">
                      <Badge
                        variant="outline"
                        className={
                          trade.status === "closed"
                            ? "text-emerald-600"
                            : trade.status === "open"
                            ? "text-blue-600"
                            : "text-amber-600"
                        }
                      >
                        {trade.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

const defaultTrades: Trade[] = [
  {
    id: "1",
    symbol: "EUR/USD",
    entryTime: new Date(Date.now() - 5 * 60 * 60 * 1000),
    exitTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
    side: "buy",
    entryPrice: 1.0820,
    exitPrice: 1.0885,
    size: 1.5,
    pnl: 97.5,
    pnlPercent: 0.65,
    status: "closed",
    notes: "Clean breakout on 4H chart",
  },
  {
    id: "2",
    symbol: "GBP/JPY",
    entryTime: new Date(Date.now() - 8 * 60 * 60 * 1000),
    exitTime: new Date(Date.now() - 3 * 60 * 60 * 1000),
    side: "sell",
    entryPrice: 188.95,
    exitPrice: 188.50,
    size: 0.8,
    pnl: 360,
    pnlPercent: 0.24,
    status: "closed",
    notes: "Support level rejection",
  },
  {
    id: "3",
    symbol: "BTC/USD",
    entryTime: new Date(Date.now() - 12 * 60 * 60 * 1000),
    exitTime: undefined,
    side: "buy",
    entryPrice: 63500,
    size: 0.05,
    pnl: -750,
    pnlPercent: -2.36,
    status: "open",
    notes: "Waiting for recovery",
  },
  {
    id: "4",
    symbol: "EUR/USD",
    entryTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
    exitTime: new Date(Date.now() - 18 * 60 * 60 * 1000),
    side: "sell",
    entryPrice: 1.0875,
    exitPrice: 1.0795,
    size: 2.0,
    pnl: 1600,
    pnlPercent: 0.73,
    status: "closed",
  },
  {
    id: "5",
    symbol: "XAU/USD",
    entryTime: new Date(Date.now() - 48 * 60 * 60 * 1000),
    exitTime: new Date(Date.now() - 36 * 60 * 60 * 1000),
    side: "buy",
    entryPrice: 2365,
    exitPrice: 2341,
    size: 0.1,
    pnl: -240,
    pnlPercent: -1.01,
    status: "closed",
  },
];
