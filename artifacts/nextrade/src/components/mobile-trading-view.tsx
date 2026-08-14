import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, Zap, Eye, EyeOff } from "lucide-react";

interface MobileChartData {
  time: string;
  price: number;
  volume?: number;
}

interface MobileTradingViewProps {
  symbol: string;
  currentPrice: number;
  change: number;
  changePct: number;
  chartData?: MobileChartData[];
  onBuy?: () => void;
  onSell?: () => void;
  onMore?: () => void;
}

export function MobileTradingView({
  symbol = "EUR/USD",
  currentPrice = 1.0854,
  change = 0.0034,
  changePct = 0.31,
  chartData = defaultChartData,
  onBuy,
  onSell,
  onMore,
}: MobileTradingViewProps) {
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [timeframe, setTimeframe] = useState("1H");

  const isPositive = change >= 0;

  return (
    <div className="space-y-3">
      {/* Header with price info */}
      <Card className="border-border/50">
        <CardContent className="pt-4">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="text-sm text-muted-foreground mb-1">{symbol}</div>
              <div className="text-3xl font-bold font-mono">{currentPrice.toFixed(4)}</div>
              <div className={`text-sm font-semibold mt-1 flex items-center gap-1 ${isPositive ? "text-emerald-600" : "text-rose-600"}`}>
                {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                {isPositive ? "+" : ""}{change.toFixed(4)} ({isPositive ? "+" : ""}{changePct.toFixed(2)}%)
              </div>
            </div>
            <Badge variant={isPositive ? "default" : "destructive"}>
              {isPositive ? "BULLISH" : "BEARISH"}
            </Badge>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs border-t border-border pt-3">
            <div className="text-center">
              <div className="text-muted-foreground mb-1">High</div>
              <div className="font-semibold">1.0920</div>
            </div>
            <div className="text-center">
              <div className="text-muted-foreground mb-1">Low</div>
              <div className="font-semibold">1.0800</div>
            </div>
            <div className="text-center">
              <div className="text-muted-foreground mb-1">Spread</div>
              <div className="font-semibold">0.0002</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick account summary */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold">Account Balance</span>
            <button
              onClick={() => setBalanceVisible(!balanceVisible)}
              className="text-muted-foreground hover:text-foreground"
            >
              {balanceVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </button>
          </div>
          <div className="text-2xl font-bold font-mono">
            {balanceVisible ? "$50,000.00" : "••••••"}
          </div>
          <div className="grid grid-cols-2 gap-2 mt-3 text-xs border-t border-border pt-3">
            <div>
              <div className="text-muted-foreground mb-1">Open P&L</div>
              <div className="font-semibold text-emerald-600">+$1,845.50</div>
            </div>
            <div>
              <div className="text-muted-foreground mb-1">Margin Level</div>
              <div className="font-semibold text-emerald-600">518%</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Chart with timeframe selector */}
      <Card>
        <CardHeader className="pb-2 flex items-center justify-between">
          <CardTitle className="text-base">Price Chart</CardTitle>
          <div className="flex gap-1">
            {["1M", "5M", "1H", "4H", "1D"].map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
                  timeframe === tf
                    ? "bg-primary text-white"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
              <XAxis dataKey="time" tick={{ fontSize: 11 }} />
              <YAxis domain={["dataMin - 0.01", "dataMax + 0.01"]} tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--background)",
                  border: "1px solid var(--border)",
                  borderRadius: "6px",
                }}
                formatter={(value) => value.toFixed(4)}
                labelFormatter={(label) => `Time: ${label}`}
              />
              <Line type="monotone" dataKey="price" stroke="#3b82f6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Quick trade buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          size="lg"
          className="gap-2 h-12 text-base font-semibold bg-emerald-600 hover:bg-emerald-700"
          onClick={onBuy}
        >
          <TrendingUp className="h-5 w-5" />
          BUY
        </Button>
        <Button
          size="lg"
          variant="destructive"
          className="gap-2 h-12 text-base font-semibold"
          onClick={onSell}
        >
          <TrendingDown className="h-5 w-5" />
          SELL
        </Button>
      </div>

      {/* Additional options */}
      <Tabs defaultValue="positions" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="positions" className="text-xs">
            Positions
          </TabsTrigger>
          <TabsTrigger value="orders" className="text-xs">
            Orders
          </TabsTrigger>
          <TabsTrigger value="market" className="text-xs">
            Market
          </TabsTrigger>
        </TabsList>

        <TabsContent value="positions" className="space-y-2 mt-3">
          <Card>
            <CardContent className="pt-3">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center pb-2 border-b border-border">
                  <span className="font-semibold">EUR/USD</span>
                  <span className="font-mono text-emerald-600">+$425.50</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Long · 1.5 lots</span>
                  <span>Entry: 1.0820</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Current: 1.0854</span>
                  <span>P&L: +0.39%</span>
                </div>
              </div>
              <Button size="sm" variant="destructive" className="w-full mt-3 text-xs">
                Close Position
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders" className="space-y-2 mt-3">
          <Card>
            <CardContent className="pt-4">
              <div className="text-center py-4 text-sm text-muted-foreground">
                <Zap className="h-6 w-6 mx-auto mb-2 opacity-50" />
                No pending orders
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="market" className="space-y-2 mt-3">
          <Card>
            <CardContent className="pt-3">
              <div className="space-y-2 text-sm">
                {[
                  { symbol: "GBP/USD", price: 1.2754, change: 0.15 },
                  { symbol: "XAU/USD", price: 2385.5, change: -0.22 },
                  { symbol: "BTC/USD", price: 64820, change: 1.05 },
                ].map((market) => (
                  <div key={market.symbol} className="flex justify-between items-center p-2 rounded hover:bg-muted">
                    <span className="font-semibold">{market.symbol}</span>
                    <div className="text-right">
                      <div className="font-mono text-xs">{market.price}</div>
                      <div className={`text-xs ${market.change >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                        {market.change >= 0 ? "+" : ""}{market.change}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* More options button */}
      <Button
        variant="outline"
        className="w-full gap-2"
        onClick={onMore}
      >
        <Zap className="h-4 w-4" />
        More Options
      </Button>
    </div>
  );
}

const defaultChartData: MobileChartData[] = [
  { time: "12:00", price: 1.0820 },
  { time: "12:15", price: 1.0825 },
  { time: "12:30", price: 1.0830 },
  { time: "12:45", price: 1.0828 },
  { time: "13:00", price: 1.0835 },
  { time: "13:15", price: 1.0840 },
  { time: "13:30", price: 1.0838 },
  { time: "13:45", price: 1.0845 },
  { time: "14:00", price: 1.0850 },
  { time: "14:15", price: 1.0854 },
];
