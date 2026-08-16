// Trading analytics and performance metrics dashboard
import { BarChart, Bar, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, Target, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PerformanceMetrics {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  averageWin: number;
  averageLoss: number;
  profitFactor: number;
  sharpeRatio: number;
  maxDrawdown: number;
  returnPercent: number;
  totalPnL: number;
}

interface EquityCurveData {
  timestamp: number;
  balance: number;
  equity: number;
}

interface DailyPnLData {
  date: string;
  pnl: number;
  trades: number;
}

interface TradingAnalyticsProps {
  metrics: PerformanceMetrics;
  equityCurveData?: EquityCurveData[];
  dailyPnLData?: DailyPnLData[];
  loading?: boolean;
}

export function TradingAnalytics({
  metrics,
  equityCurveData = [],
  dailyPnLData = [],
  loading = false,
}: TradingAnalyticsProps) {
  const chartColors = {
    positive: "#10b981",
    negative: "#ef4444",
    primary: "#3b82f6",
    secondary: "#8b5cf6",
  };

  return (
    <div className="space-y-4">
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Win Rate */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              Win Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.winRate.toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {metrics.winningTrades} wins / {metrics.totalTrades} total
            </div>
          </CardContent>
        </Card>

        {/* Profit Factor */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              Profit Factor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                metrics.profitFactor > 1.5
                  ? "text-green-600"
                  : metrics.profitFactor > 1
                    ? "text-amber-600"
                    : "text-red-600"
              }`}
            >
              {metrics.profitFactor.toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Gross profit / gross loss ratio
            </div>
          </CardContent>
        </Card>

        {/* Sharpe Ratio */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Zap className="h-4 w-4 text-purple-600" />
              Sharpe Ratio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.sharpeRatio.toFixed(2)}</div>
            <div className="text-xs text-muted-foreground mt-1">
              Risk-adjusted returns
            </div>
          </CardContent>
        </Card>

        {/* Max Drawdown */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-600" />
              Max Drawdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {Math.abs(metrics.maxDrawdown).toFixed(2)}%
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Worst peak-to-trough decline
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Equity Curve */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Equity Curve</CardTitle>
          </CardHeader>
          <CardContent>
            {loading || equityCurveData.length === 0 ? (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                {loading ? "Loading chart..." : "No data available"}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={equityCurveData}>
                  <defs>
                    <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={chartColors.primary} stopOpacity={0.8} />
                      <stop offset="95%" stopColor={chartColors.primary} stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={(ts) =>
                      new Date(ts).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })
                    }
                    stroke="#9ca3af"
                    style={{ fontSize: "12px" }}
                  />
                  <YAxis stroke="#9ca3af" style={{ fontSize: "12px" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1f2937",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                    }}
                    formatter={(value) => [
                      `$${(value as number).toFixed(2)}`,
                      "Equity",
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="equity"
                    stroke={chartColors.primary}
                    strokeWidth={2}
                    dot={false}
                    fillOpacity={1}
                    fill="url(#colorEquity)"
                    isAnimationActive={true}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Daily P&L Distribution */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Daily P&L Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {loading || dailyPnLData.length === 0 ? (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                {loading ? "Loading chart..." : "No data available"}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={dailyPnLData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="date"
                    stroke="#9ca3af"
                    style={{ fontSize: "12px" }}
                  />
                  <YAxis stroke="#9ca3af" style={{ fontSize: "12px" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1f2937",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                    }}
                    formatter={(value) => [
                      `$${(value as number).toFixed(2)}`,
                      "P&L",
                    ]}
                  />
                  <Bar
                    dataKey="pnl"
                    fill={chartColors.positive}
                    radius={4}
                    shape={<BarShape />}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Statistics Summary */}
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Trading Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">Total Trades</div>
              <div className="text-xl font-bold">{metrics.totalTrades}</div>
            </div>
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">Winning Trades</div>
              <div className="text-xl font-bold text-green-600">
                {metrics.winningTrades}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">Losing Trades</div>
              <div className="text-xl font-bold text-red-600">
                {metrics.losingTrades}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">Avg Win</div>
              <div className="text-xl font-bold text-green-600">
                ${metrics.averageWin.toFixed(2)}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">Avg Loss</div>
              <div className="text-xl font-bold text-red-600">
                -${Math.abs(metrics.averageLoss).toFixed(2)}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">Return</div>
              <div
                className={`text-xl font-bold ${
                  metrics.returnPercent >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {metrics.returnPercent >= 0 ? "+" : ""}{metrics.returnPercent.toFixed(2)}%
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Custom bar shape to color positive/negative differently
function BarShape(props: any) {
  const { x, y, width, height, payload } = props;

  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      fill={payload.pnl >= 0 ? "#10b981" : "#ef4444"}
      rx={4}
      ry={4}
    />
  );
}
