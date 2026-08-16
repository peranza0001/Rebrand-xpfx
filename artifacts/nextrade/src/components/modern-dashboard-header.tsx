// Modern fintech dashboard header with key performance metrics
import { TrendingUp, TrendingDown, BarChart3, Zap, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface DashboardHeaderProps {
  accountName?: string;
  accountType?: "live" | "demo";
  equity: number;
  totalBalance: number;
  openPnL: number;
  usedMargin: number;
  freeMargin: number;
  marginLevel: number;
  balancesMasked: boolean;
  onToggleBalance?: () => void;
}

export function ModernDashboardHeader({
  accountName,
  accountType = "live",
  equity,
  totalBalance,
  openPnL,
  usedMargin,
  freeMargin,
  marginLevel,
  balancesMasked,
  onToggleBalance,
}: DashboardHeaderProps) {
  const isProfitable = openPnL >= 0;
  const marginAlert = marginLevel < 200;
  const marginCritical = marginLevel < 100;

  const formatCurrency = (value: number) => {
    if (balancesMasked) return "••••••";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  return (
    <div className="space-y-4 border-b border-border/50 pb-6">
      {/* Account name and type */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {accountName || "Trading Account"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <Badge
            variant={accountType === "demo" ? "secondary" : "outline"}
            className="h-fit"
          >
            {accountType === "demo" ? "📊 Demo" : "🔒 Live"}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleBalance}
          className="text-muted-foreground hover:text-foreground"
        >
          {balancesMasked ? (
            <EyeOff className="h-5 w-5" />
          ) : (
            <Eye className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Key metrics grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Equity */}
        <div className="space-y-2 p-4 rounded-lg border border-border/50 bg-card/50 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Equity
            </label>
            <BarChart3 className="h-4 w-4 text-primary/60" />
          </div>
          <div className="text-2xl font-bold">{formatCurrency(equity)}</div>
          <div className="text-xs text-muted-foreground">Account value + P&L</div>
        </div>

        {/* Open P&L */}
        <div className="space-y-2 p-4 rounded-lg border border-border/50 bg-card/50 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Open P&L
            </label>
            {isProfitable ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </div>
          <div
            className={`text-2xl font-bold ${
              isProfitable ? "text-green-600" : "text-red-600"
            }`}
          >
            {formatCurrency(openPnL)}
          </div>
          <div className="text-xs text-muted-foreground">
            {isProfitable ? "+" : ""}{((openPnL / totalBalance) * 100).toFixed(2)}% return
          </div>
        </div>

        {/* Used Margin */}
        <div className="space-y-2 p-4 rounded-lg border border-border/50 bg-card/50 backdrop-blur-sm">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Used Margin
          </label>
          <div className="text-2xl font-bold">{formatCurrency(usedMargin)}</div>
          <div className="text-xs text-muted-foreground">
            {((usedMargin / equity) * 100).toFixed(1)}% of equity
          </div>
        </div>

        {/* Free Margin */}
        <div className="space-y-2 p-4 rounded-lg border border-border/50 bg-card/50 backdrop-blur-sm">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Free Margin
          </label>
          <div className="text-2xl font-bold">{formatCurrency(freeMargin)}</div>
          <div className="text-xs text-muted-foreground">Available to trade</div>
        </div>

        {/* Margin Level */}
        <div className="space-y-2 p-4 rounded-lg border border-border/50 bg-card/50 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Margin Level
            </label>
            {marginCritical ? (
              <Zap className="h-4 w-4 text-red-600" />
            ) : marginAlert ? (
              <Zap className="h-4 w-4 text-amber-600" />
            ) : (
              <Zap className="h-4 w-4 text-green-600" />
            )}
          </div>
          <div
            className={`text-2xl font-bold ${
              marginCritical
                ? "text-red-600"
                : marginAlert
                  ? "text-amber-600"
                  : "text-green-600"
            }`}
          >
            {marginLevel.toFixed(0)}%
          </div>
          <div className="w-full h-2 rounded-full bg-muted/60 overflow-hidden mt-2">
            <div
              className={`h-full ${
                marginCritical
                  ? "bg-red-600"
                  : marginAlert
                    ? "bg-amber-600"
                    : "bg-green-600"
              }`}
              style={{
                width: `${Math.min(marginLevel, 100)}%`,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
