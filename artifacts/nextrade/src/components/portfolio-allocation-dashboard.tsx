import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, TrendingUp, DollarSign } from "lucide-react";

interface PortfolioPosition {
  symbol: string;
  assetClass: "Forex" | "Crypto" | "Commodities" | "Indices" | "Stocks";
  value: number;
  allocation: number;
  changePercent: number;
}

interface PortfolioAllocationDashboardProps {
  positions: PortfolioPosition[];
  totalValue: number;
  diversificationScore?: number;
}

export function PortfolioAllocationDashboard({
  positions,
  totalValue,
  diversificationScore = 75,
}: PortfolioAllocationDashboardProps) {
  const chartData = useMemo(
    () =>
      positions.map((p) => ({
        name: p.symbol,
        value: p.allocation,
        assetClass: p.assetClass,
      })),
    [positions]
  );

  const assetClassBreakdown = useMemo(() => {
    const breakdown: Record<string, number> = {};
    positions.forEach((p) => {
      breakdown[p.assetClass] = (breakdown[p.assetClass] || 0) + p.allocation;
    });
    return Object.entries(breakdown).sort((a, b) => b[1] - a[1]);
  }, [positions]);

  const COLORS: Record<string, string> = {
    Forex: "#3b82f6",
    Crypto: "#f59e0b",
    Commodities: "#ec4899",
    Indices: "#8b5cf6",
    Stocks: "#10b981",
  };

  const riskRating = useMemo(() => {
    if (diversificationScore >= 80) return { label: "Conservative", color: "text-emerald-600", bg: "bg-emerald-500/10" };
    if (diversificationScore >= 60) return { label: "Balanced", color: "text-blue-600", bg: "bg-blue-500/10" };
    if (diversificationScore >= 40) return { label: "Growth", color: "text-amber-600", bg: "bg-amber-500/10" };
    return { label: "Aggressive", color: "text-rose-600", bg: "bg-rose-500/10" };
  }, [diversificationScore]);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5 text-primary" />
                Portfolio Allocation
              </CardTitle>
              <CardDescription>Real-time distribution across asset classes</CardDescription>
            </div>
            <Badge variant="outline" className={riskRating.color}>
              {riskRating.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name} ${value}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[entry.assetClass as keyof typeof COLORS]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `${value}%`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Diversification Score</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Score</span>
                <span className="font-mono font-semibold">{diversificationScore}/100</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all"
                  style={{ width: `${diversificationScore}%` }}
                />
              </div>
            </div>
            <div className={`rounded-lg p-3 ${riskRating.bg}`}>
              <div className={`text-sm font-semibold ${riskRating.color}`}>
                {riskRating.label} Portfolio
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {diversificationScore >= 80
                  ? "Well-diversified across asset classes"
                  : diversificationScore >= 60
                  ? "Good diversification with moderate concentration"
                  : diversificationScore >= 40
                  ? "Consider diversifying further"
                  : "High concentration risk detected"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Asset Class Distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {assetClassBreakdown.map(([assetClass, allocation]) => (
              <div key={assetClass} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{
                        backgroundColor:
                          COLORS[assetClass as keyof typeof COLORS],
                      }}
                    />
                    {assetClass}
                  </span>
                  <span className="font-mono font-semibold">{allocation}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-primary/60"
                    style={{ width: `${allocation}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
