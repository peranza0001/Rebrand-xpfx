// Professional market data table with live updates
import { useState } from "react";
import { ArrowUp, ArrowDown, TrendingUp, TrendingDown, Eye, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface MarketData {
  symbol: string;
  name: string;
  bid: number;
  ask: number;
  spread: number;
  changePct: number;
  change: number;
  dayHigh: number;
  dayLow: number;
  volume?: number;
  trend?: "up" | "down" | "neutral";
}

interface ModernMarketWatchlistProps {
  markets: MarketData[];
  onTrade?: (symbol: string) => void;
  onAddToWatchlist?: (symbol: string) => void;
  loading?: boolean;
  title?: string;
  showSpread?: boolean;
  compactMode?: boolean;
}

export function ModernMarketWatchlist({
  markets,
  onTrade,
  onAddToWatchlist,
  loading = false,
  title = "Market Watch",
  showSpread = true,
  compactMode = false,
}: ModernMarketWatchlistProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"change" | "spread" | "symbol">("change");

  const filtered = markets
    .filter(
      (m) =>
        m.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === "change") return b.changePct - a.changePct;
      if (sortBy === "spread") return a.spread - b.spread;
      return a.symbol.localeCompare(b.symbol);
    });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 5,
    }).format(price);
  };

  return (
    <div className="space-y-4">
      {/* Header with title and search */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-2">
          <Eye className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">{title}</h2>
          <Badge variant="secondary" className="ml-auto md:ml-2">
            {filtered.length}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search symbols..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-9 text-sm"
          />
          {!compactMode && (
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="h-9 px-3 text-sm border border-input rounded-md bg-background"
            >
              <option value="change">% Change</option>
              <option value="spread">Spread</option>
              <option value="symbol">Symbol</option>
            </select>
          )}
        </div>
      </div>

      {/* Market data table */}
      <div className="border border-border/50 rounded-lg overflow-hidden bg-card/50 backdrop-blur-sm">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b border-border/50 bg-muted/30">
              <TableHead className="w-[120px] font-semibold">Symbol</TableHead>
              <TableHead className="text-right font-semibold">Bid</TableHead>
              <TableHead className="text-right font-semibold">Ask</TableHead>
              {showSpread && (
                <TableHead className="text-right font-semibold text-xs">Spread</TableHead>
              )}
              <TableHead className="text-right font-semibold">Change %</TableHead>
              {!compactMode && (
                <>
                  <TableHead className="text-right font-semibold text-sm text-muted-foreground">
                    High
                  </TableHead>
                  <TableHead className="text-right font-semibold text-sm text-muted-foreground">
                    Low
                  </TableHead>
                </>
              )}
              <TableHead className="w-[100px] text-right font-semibold">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={showSpread ? 8 : 7} className="text-center py-8">
                  <div className="animate-pulse text-muted-foreground">
                    Loading market data...
                  </div>
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={showSpread ? 8 : 7}
                  className="text-center py-8 text-muted-foreground"
                >
                  No markets found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((market) => {
                const isUp = market.changePct >= 0;
                const spreadColor =
                  market.spread < 0.5
                    ? "text-green-600"
                    : market.spread < 1
                      ? "text-amber-600"
                      : "text-red-600";

                return (
                  <TableRow
                    key={market.symbol}
                    className="hover:bg-accent/40 border-b border-border/30 transition-colors"
                  >
                    <TableCell className="font-semibold">
                      <div className="flex items-center gap-2">
                        <div>
                          <div className="font-mono text-sm">{market.symbol}</div>
                          <div className="text-xs text-muted-foreground">
                            {market.name}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatPrice(market.bid)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatPrice(market.ask)}
                    </TableCell>
                    {showSpread && (
                      <TableCell className={`text-right text-xs font-mono ${spreadColor}`}>
                        {market.spread.toFixed(1)}
                      </TableCell>
                    )}
                    <TableCell className="text-right">
                      <div
                        className={`flex items-center justify-end gap-1 font-semibold ${
                          isUp ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {isUp ? (
                          <ArrowUp className="h-4 w-4" />
                        ) : (
                          <ArrowDown className="h-4 w-4" />
                        )}
                        <span className="font-mono">
                          {isUp ? "+" : ""}{market.changePct.toFixed(2)}%
                        </span>
                      </div>
                    </TableCell>
                    {!compactMode && (
                      <>
                        <TableCell className="text-right text-sm text-muted-foreground font-mono">
                          {formatPrice(market.dayHigh)}
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground font-mono">
                          {formatPrice(market.dayLow)}
                        </TableCell>
                      </>
                    )}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-2"
                                onClick={() => onTrade?.(market.symbol)}
                              >
                                Trade
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              Open trading panel for {market.symbol}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Summary stats */}
      {!compactMode && filtered.length > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground px-2">
          <div>
            {filtered.filter((m) => m.changePct >= 0).length} gainers •{" "}
            {filtered.filter((m) => m.changePct < 0).length} losers
          </div>
          <div>
            Avg spread:{" "}
            {(
              filtered.reduce((a, m) => a + m.spread, 0) / filtered.length
            ).toFixed(2)}
          </div>
        </div>
      )}
    </div>
  );
}
