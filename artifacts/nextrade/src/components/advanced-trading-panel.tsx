// Advanced trading panel - order entry and position management
import { useState } from "react";
import { Plus, Minus, Info, AlertTriangle, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export interface TradingPosition {
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
}

interface AdvancedTradingPanelProps {
  positions?: TradingPosition[];
  selectedSymbol?: string;
  balance: number;
  freeMargin: number;
  onPlaceOrder?: (order: any) => void;
  onClosePosition?: (positionId: string) => void;
  loading?: boolean;
}

export function AdvancedTradingPanel({
  positions = [],
  selectedSymbol = "EUR/USD",
  balance: _balance,
  freeMargin,
  onPlaceOrder,
  onClosePosition,
  loading = false,
}: AdvancedTradingPanelProps) {
  const [orderType, setOrderType] = useState<"market" | "limit" | "stop">("market");
  const [orderSide, setOrderSide] = useState<"buy" | "sell">("buy");
  const [volume, setVolume] = useState("1.0");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [slippage, setSlippage] = useState("2");

  const currentPrice = 1.0854;
  const riskReward = takeProfit && stopLoss ? 
    Math.abs(parseFloat(takeProfit) - currentPrice) / Math.abs(currentPrice - parseFloat(stopLoss)) 
    : 0;

  const estimatedLotSize = parseFloat(volume) * currentPrice;
  const marginRequired = estimatedLotSize * 0.1; // 10:1 leverage
  const canTrade = marginRequired <= freeMargin;

  const handlePlaceOrder = () => {
    onPlaceOrder?.({
      symbol: selectedSymbol,
      orderType,
      side: orderSide,
      volume: parseFloat(volume),
      stopLoss: stopLoss ? parseFloat(stopLoss) : undefined,
      takeProfit: takeProfit ? parseFloat(takeProfit) : undefined,
      slippage: parseFloat(slippage),
    });
  };

  const profitablePositions = positions.filter((p) => p.pnl > 0);
  const losingPositions = positions.filter((p) => p.pnl < 0);
  const totalOpenPnl = positions.reduce((sum, p) => sum + p.pnl, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Order Entry Panel */}
      <Card className="lg:col-span-1">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Order Entry
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Symbol header */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border/50">
            <div>
              <div className="font-mono font-semibold text-lg">{selectedSymbol}</div>
              <div className="text-xs text-muted-foreground">
                {currentPrice.toFixed(4)}
              </div>
            </div>
            <Badge variant="outline">Market</Badge>
          </div>

          {/* Order type tabs */}
          <Tabs value={orderType} onValueChange={(v) => setOrderType(v as any)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="market" className="text-xs">
                Market
              </TabsTrigger>
              <TabsTrigger value="limit" className="text-xs">
                Limit
              </TabsTrigger>
              <TabsTrigger value="stop" className="text-xs">
                Stop
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Side selector */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={orderSide === "buy" ? "default" : "outline"}
              onClick={() => setOrderSide("buy")}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Buy
            </Button>
            <Button
              variant={orderSide === "sell" ? "destructive" : "outline"}
              onClick={() => setOrderSide("sell")}
              className="gap-2"
            >
              <Minus className="h-4 w-4" />
              Sell
            </Button>
          </div>

          {/* Volume */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Volume (Lots)</label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>1 lot = 100,000 units</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              type="number"
              step="0.1"
              min="0.1"
              value={volume}
              onChange={(e) => setVolume(e.target.value)}
              placeholder="1.0"
              className="font-mono"
            />
            <div className="text-xs text-muted-foreground">
              ≈ ${estimatedLotSize.toFixed(2)} USD value
            </div>
          </div>

          {/* Stop Loss */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Stop Loss (Optional)</label>
            <Input
              type="number"
              step="0.0001"
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
              placeholder={currentPrice.toFixed(4)}
              className="font-mono text-xs"
            />
          </div>

          {/* Take Profit */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Take Profit (Optional)</label>
            <Input
              type="number"
              step="0.0001"
              value={takeProfit}
              onChange={(e) => setTakeProfit(e.target.value)}
              placeholder={currentPrice.toFixed(4)}
              className="font-mono text-xs"
            />
            {riskReward > 0 && (
              <div className="text-xs text-muted-foreground">
                Risk/Reward: 1:{riskReward.toFixed(2)}
              </div>
            )}
          </div>

          {/* Slippage tolerance */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Slippage Tolerance (%)</label>
            <Input
              type="number"
              step="0.1"
              min="0"
              max="10"
              value={slippage}
              onChange={(e) => setSlippage(e.target.value)}
              className="font-mono text-xs"
            />
          </div>

          {/* Risk Warning */}
          {!canTrade && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
              <div className="text-xs text-red-700">
                Insufficient margin. Required: ${marginRequired.toFixed(2)}, Available: ${freeMargin.toFixed(2)}
              </div>
            </div>
          )}

          {/* Margin requirements */}
          <div className="p-3 rounded-lg bg-muted/40 border border-border/50 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Margin Required:</span>
              <span className="font-semibold">${marginRequired.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Available Margin:</span>
              <span
                className={`font-semibold ${
                  canTrade ? "text-green-600" : "text-red-600"
                }`}
              >
                ${freeMargin.toFixed(2)}
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-muted/60 overflow-hidden">
              <div
                className={`h-full ${canTrade ? "bg-green-600" : "bg-red-600"}`}
                style={{
                  width: `${Math.min((marginRequired / freeMargin) * 100, 100)}%`,
                }}
              />
            </div>
          </div>

          {/* Place order button */}
          <Button
            onClick={handlePlaceOrder}
            disabled={loading || !canTrade}
            className={`w-full ${
              orderSide === "buy"
                ? "bg-green-600 hover:bg-green-700"
                : "bg-red-600 hover:bg-red-700"
            }`}
          >
            {loading ? "Processing..." : `${orderSide.toUpperCase()} ${volume} LOTS`}
          </Button>
        </CardContent>
      </Card>

      {/* Open Positions */}
      <Card className="lg:col-span-2">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Open Positions</CardTitle>
            <Badge variant="secondary">{positions.length}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {positions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No open positions</p>
              <p className="text-xs mt-1">Place an order to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent bg-muted/30 border-b">
                      <TableHead className="font-semibold">Symbol</TableHead>
                      <TableHead className="font-semibold">Side</TableHead>
                      <TableHead className="text-right font-semibold">Entry</TableHead>
                      <TableHead className="text-right font-semibold">Current</TableHead>
                      <TableHead className="text-right font-semibold">Size</TableHead>
                      <TableHead className="text-right font-semibold">P&L</TableHead>
                      <TableHead className="text-right font-semibold">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {positions.map((pos) => (
                      <TableRow
                        key={pos.id}
                        className="hover:bg-accent/40 border-b"
                      >
                        <TableCell className="font-mono font-semibold">
                          {pos.symbol}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              pos.side === "long" ? "default" : "destructive"
                            }
                            className="text-xs"
                          >
                            {pos.side.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {pos.entryPrice.toFixed(4)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {pos.currentPrice.toFixed(4)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {pos.size.toFixed(2)}
                        </TableCell>
                        <TableCell
                          className={`text-right font-mono font-semibold ${
                            pos.pnl >= 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {pos.pnl >= 0 ? "+" : ""}{pos.pnl.toFixed(2)} (
                          {pos.pnlPercent.toFixed(2)}%)
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-2 text-xs"
                            onClick={() => onClosePosition?.(pos.id)}
                          >
                            Close
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Position summary */}
              <div className="grid grid-cols-3 gap-2 p-3 rounded-lg bg-muted/30 border border-border/50">
                <div>
                  <div className="text-xs text-muted-foreground">Winning</div>
                  <div className="text-sm font-semibold text-green-600">
                    {profitablePositions.length}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Losing</div>
                  <div className="text-sm font-semibold text-red-600">
                    {losingPositions.length}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Total P&L</div>
                  <div
                    className={`text-sm font-semibold ${
                      totalOpenPnl >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {totalOpenPnl >= 0 ? "+" : ""}{totalOpenPnl.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
