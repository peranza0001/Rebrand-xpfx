import { useMemo } from "react";
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, BarChart3, Zap, Award } from "lucide-react";

interface PerformanceMetrics {
  totalReturn: number;
  annualizedReturn: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  calmarRatio: number;
  winRate: number;
  profitFactor: number;
  recoveryFactor: number;
}

interface AdvancedAnalyticsDashboardProps {
  metrics?: PerformanceMetrics;
  equityData?: Array<{ date: string; equity: number }>;
  monthlyReturns?: Array<{ month: string; return: number }>;
  strategyPerformance?: Array<{ strategy: string; return: number; drawdown: number }>;
}

export function AdvancedAnalyticsDashboard({
  metrics = defaultMetrics,
  equityData = defaultEquityData,
  monthlyReturns = defaultMonthlyReturns,
  strategyPerformance = defaultStrategyPerformance,
}: AdvancedAnalyticsDashboardProps) {
  const getMetricColor = (value: number, type: string) => {
    if (type === "sharpeRatio") return value > 1 ? "text-emerald-600" : value > 0.5 ? "text-amber-600" : "text-rose-600";
    if (type === "drawdown") return value < -10 ? "text-rose-600" : value < -5 ? "text-amber-600" : "text-emerald-600";
    return "text-primary";
  };

  return (
    <div className="space-y-4">
      {/* Key Performance Indicators */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Total Return</div>
            <div className={`text-2xl font-bold mt-1 ${metrics.totalReturn >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
              {metrics.totalReturn >= 0 ? "+" : ""}{metrics.totalReturn.toFixed(2)}%
            </div>
            <div className="text-xs text-muted-foreground mt-2">Lifetime performance</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Sharpe Ratio</div>
            <div className={`text-2xl font-bold mt-1 ${getMetricColor(metrics.sharpeRatio, "sharpeRatio")}`}>
              {metrics.sharpeRatio.toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground mt-2">Risk-adjusted returns</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Max Drawdown</div>
            <div className={`text-2xl font-bold mt-1 ${getMetricColor(metrics.maxDrawdown, "drawdown")}`}>
              {metrics.maxDrawdown.toFixed(2)}%
            </div>
            <div className="text-xs text-muted-foreground mt-2">Peak-to-trough decline</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Win Rate</div>
            <div className={`text-2xl font-bold mt-1 ${metrics.winRate >= 50 ? "text-emerald-600" : "text-rose-600"}`}>
              {metrics.winRate.toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground mt-2">Profitable trades</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Equity Curve */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Equity Curve
            </CardTitle>
            <CardDescription>Account growth over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={equityData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--background)",
                    border: "1px solid var(--border)",
                    borderRadius: "6px",
                  }}
                  formatter={(value) => `$${value.toLocaleString()}`}
                />
                <Area
                  type="monotone"
                  dataKey="equity"
                  stroke="#3b82f6"
                  fillOpacity={1}
                  fill="url(#colorEquity)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Monthly Returns */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Monthly Returns
            </CardTitle>
            <CardDescription>Month-by-month performance</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyReturns} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--background)",
                    border: "1px solid var(--border)",
                    borderRadius: "6px",
                  }}
                  formatter={(value) => `${value.toFixed(2)}%`}
                />
                <Bar dataKey="return" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Strategy Comparison & Additional Metrics */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="h-4 w-4" />
              Advanced Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-3">
              {[
                { label: "Annualized Return", value: `${metrics.annualizedReturn.toFixed(2)}%` },
                { label: "Sortino Ratio", value: metrics.sortinoRatio.toFixed(2) },
                { label: "Calmar Ratio", value: metrics.calmarRatio.toFixed(2) },
                { label: "Profit Factor", value: metrics.profitFactor.toFixed(2) },
                { label: "Recovery Factor", value: metrics.recoveryFactor.toFixed(2) },
              ].map((metric) => (
                <div key={metric.label} className="flex justify-between items-center pb-2 border-b border-border last:border-0">
                  <span className="text-sm text-muted-foreground">{metric.label}</span>
                  <span className="font-mono font-semibold text-sm">{metric.value}</span>
                </div>
              ))}
            </div>

            <div className="rounded-lg bg-blue-500/10 border border-blue-500/30 p-3 mt-4">
              <div className="text-sm font-semibold text-blue-600 mb-1">📊 Interpretation Guide</div>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Sharpe Ratio &gt; 1.0 indicates good risk-adjusted returns</li>
                <li>• Sortino Ratio emphasizes downside risk management</li>
                <li>• Calmar Ratio measures return relative to max drawdown</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Strategy Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {strategyPerformance.map((strategy) => (
                <div key={strategy.strategy} className="rounded-lg border border-border p-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-sm">{strategy.strategy}</span>
                    <Badge variant={strategy.return >= 0 ? "default" : "destructive"}>
                      {strategy.return >= 0 ? "+" : ""}{strategy.return.toFixed(2)}%
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <div className="text-muted-foreground mb-1">Return</div>
                      <div className={`font-semibold ${strategy.return >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                        {strategy.return >= 0 ? "+" : ""}{strategy.return.toFixed(2)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground mb-1">Max Drawdown</div>
                      <div className="font-semibold text-rose-600">{strategy.drawdown.toFixed(2)}%</div>
                    </div>
                  </div>
                  <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-primary/60"
                      style={{ width: `${Math.max(0, Math.min(100, strategy.return))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

const defaultMetrics: PerformanceMetrics = {
  totalReturn: 125.5,
  annualizedReturn: 42.3,
  sharpeRatio: 1.85,
  sortinoRatio: 2.12,
  maxDrawdown: -12.4,
  calmarRatio: 3.41,
  winRate: 72.5,
  profitFactor: 2.85,
  recoveryFactor: 10.12,
};

const defaultEquityData = [
  { date: "Jan", equity: 50000 },
  { date: "Feb", equity: 52500 },
  { date: "Mar", equity: 55800 },
  { date: "Apr", equity: 54200 },
  { date: "May", equity: 59300 },
  { date: "Jun", equity: 63400 },
  { date: "Jul", equity: 68500 },
  { date: "Aug", equity: 72100 },
  { date: "Sep", equity: 76800 },
  { date: "Oct", equity: 81200 },
  { date: "Nov", equity: 85600 },
  { date: "Dec", equity: 112775 },
];

const defaultMonthlyReturns = [
  { month: "Jan", return: 5.0 },
  { month: "Feb", return: 6.3 },
  { month: "Mar", return: 6.4 },
  { month: "Apr", return: -2.9 },
  { month: "May", return: 9.4 },
  { month: "Jun", return: 6.9 },
  { month: "Jul", return: 8.3 },
  { month: "Aug", return: 5.3 },
  { month: "Sep", return: 6.8 },
  { month: "Oct", return: 5.7 },
  { month: "Nov", return: 5.4 },
  { month: "Dec", return: 31.6 },
];

const defaultStrategyPerformance = [
  { strategy: "Trend Following", return: 45.2, drawdown: -8.5 },
  { strategy: "Mean Reversion", return: 32.8, drawdown: -6.2 },
  { strategy: "Breakout Trading", return: 28.5, drawdown: -7.8 },
  { strategy: "News Trading", return: 19.0, drawdown: -15.3 },
];
