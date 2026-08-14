import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, X, AlertTriangle, TrendingUp, TrendingDown, Clock, CheckCircle } from "lucide-react";

interface Alert {
  id: string;
  type: "price" | "economic" | "trade" | "risk" | "signal";
  title: string;
  message: string;
  severity: "critical" | "warning" | "info";
  timestamp: Date;
  read: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface RealTimeAlertsProps {
  alerts?: Alert[];
  onDismiss?: (alertId: string) => void;
  maxVisible?: number;
}

export function RealTimeAlerts({
  alerts = defaultAlerts,
  onDismiss,
  maxVisible = 5,
}: RealTimeAlertsProps) {
  const [visibleAlerts, setVisibleAlerts] = useState(alerts.slice(0, maxVisible));
  const [readAlerts, setReadAlerts] = useState<Set<string>>(new Set());

  useEffect(() => {
    setVisibleAlerts(alerts.slice(0, maxVisible));
  }, [alerts, maxVisible]);

  const handleDismiss = (alertId: string) => {
    setVisibleAlerts((prev) => prev.filter((a) => a.id !== alertId));
    setReadAlerts((prev) => new Set([...prev, alertId]));
    onDismiss?.(alertId);
  };

  const unreadCount = visibleAlerts.filter((a) => !a.read && !readAlerts.has(a.id)).length;
  const criticalCount = visibleAlerts.filter((a) => a.severity === "critical" && !readAlerts.has(a.id)).length;

  const getIcon = (type: string) => {
    switch (type) {
      case "price":
        return <TrendingUp className="h-4 w-4" />;
      case "economic":
        return <AlertTriangle className="h-4 w-4" />;
      case "trade":
        return <CheckCircle className="h-4 w-4" />;
      case "risk":
        return <TrendingDown className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300";
      case "warning":
        return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
      default:
        return "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300";
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Bell className="h-5 w-5 text-primary" />
            {unreadCount > 0 && (
              <span className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-rose-600 text-white text-xs flex items-center justify-center font-bold">
                {unreadCount}
              </span>
            )}
          </div>
          <div>
            <CardTitle className="text-base">Real-Time Alerts</CardTitle>
          </div>
        </div>
        {criticalCount > 0 && (
          <Badge variant="destructive" className="animate-pulse">
            {criticalCount} Critical
          </Badge>
        )}
      </CardHeader>

      <CardContent className="space-y-3">
        {visibleAlerts.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">All caught up! No alerts at the moment.</p>
          </div>
        ) : (
          visibleAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`rounded-lg border p-3 transition-all ${getSeverityColor(
                alert.severity
              )} ${readAlerts.has(alert.id) ? "opacity-60" : ""}`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-start gap-2 flex-1">
                  <div className="mt-0.5">{getIcon(alert.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">{alert.title}</div>
                    <p className="text-xs mt-1 opacity-90">{alert.message}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleDismiss(alert.id)}
                  className="text-current hover:opacity-70 transition-opacity flex-shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex items-center justify-between mt-2 text-xs opacity-75">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatTime(alert.timestamp)}
                </div>
                {alert.action && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-auto p-0 text-xs underline"
                    onClick={() => {
                      alert.action?.onClick();
                      handleDismiss(alert.id);
                    }}
                  >
                    {alert.action.label}
                  </Button>
                )}
              </div>
            </div>
          ))
        )}

        {alerts.length > maxVisible && (
          <Button variant="outline" className="w-full text-xs" size="sm">
            View All {alerts.length} Alerts
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function formatTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

const defaultAlerts: Alert[] = [
  {
    id: "1",
    type: "critical",
    title: "⚠️ High Impact Economic Event",
    message: "US Non-Farm Payroll report in 30 minutes. Expect high volatility.",
    severity: "critical",
    timestamp: new Date(Date.now() - 5 * 60 * 1000),
    read: false,
    action: {
      label: "View Calendar",
      onClick: () => console.log("Navigate to calendar"),
    },
  },
  {
    id: "2",
    type: "price",
    title: "🎯 Price Target Reached",
    message: "EUR/USD reached your take profit level at 1.0920",
    severity: "info",
    timestamp: new Date(Date.now() - 15 * 60 * 1000),
    read: false,
    action: {
      label: "Close Trade",
      onClick: () => console.log("Close position"),
    },
  },
  {
    id: "3",
    type: "risk",
    title: "⚡ Margin Level Warning",
    message: "Your margin level has dropped to 145%. Consider closing positions.",
    severity: "warning",
    timestamp: new Date(Date.now() - 25 * 60 * 1000),
    read: false,
    action: {
      label: "Manage Positions",
      onClick: () => console.log("Navigate to positions"),
    },
  },
  {
    id: "4",
    type: "signal",
    title: "💡 AI Trading Signal",
    message: "Strong BUY signal generated for GBP/JPY on 4H chart (82% confidence)",
    severity: "info",
    timestamp: new Date(Date.now() - 45 * 60 * 1000),
    read: false,
    action: {
      label: "View Signal",
      onClick: () => console.log("View AI analysis"),
    },
  },
  {
    id: "5",
    type: "trade",
    title: "✓ Order Executed",
    message: "Your BUY order for 1.5 EUR/USD has been executed at 1.0854",
    severity: "info",
    timestamp: new Date(Date.now() - 60 * 60 * 1000),
    read: true,
  },
  {
    id: "6",
    type: "economic",
    title: "📊 Economic Calendar Update",
    message: "ECB Interest Rate Decision: Kept rates unchanged at 4.25%",
    severity: "warning",
    timestamp: new Date(Date.now() - 120 * 60 * 1000),
    read: true,
  },
];
