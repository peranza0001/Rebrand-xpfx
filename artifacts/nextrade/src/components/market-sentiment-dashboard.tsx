import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingUp, TrendingDown, Eye, Globe } from "lucide-react";

interface EconomicEvent {
  id: string;
  country: string;
  indicator: string;
  date: Date;
  time: string;
  forecast: number;
  previous: number;
  actual?: number;
  impact: "High" | "Medium" | "Low";
  sentiment: "Bullish" | "Bearish" | "Neutral";
}

interface MarketSentimentProps {
  events?: EconomicEvent[];
  sentimentIndex?: number;
  volatilityIndex?: number;
  marketMood?: "Bullish" | "Bearish" | "Neutral";
}

export function MarketSentimentDashboard({
  events = defaultEvents,
  sentimentIndex = 65,
  volatilityIndex = 28,
  marketMood = "Bullish",
}: MarketSentimentProps) {
  const upcomingEvents = useMemo(
    () => events.filter((e) => e.actual === undefined).slice(0, 6),
    [events]
  );

  const impactBadges = useMemo(() => {
    return events.reduce(
      (acc, event) => ({
        ...acc,
        [event.impact]: (acc[event.impact] || 0) + 1,
      }),
      {} as Record<string, number>
    );
  }, [events]);

  const sentimentColor = useMemo(() => {
    if (sentimentIndex >= 60)
      return { label: "Bullish", color: "text-emerald-600", bg: "bg-emerald-500/10" };
    if (sentimentIndex >= 40)
      return { label: "Neutral", color: "text-blue-600", bg: "bg-blue-500/10" };
    return { label: "Bearish", color: "text-rose-600", bg: "bg-rose-500/10" };
  }, [sentimentIndex]);

  const volatilityLevel = useMemo(() => {
    if (volatilityIndex >= 30) return { label: "High", color: "text-rose-600" };
    if (volatilityIndex >= 20) return { label: "Normal", color: "text-blue-600" };
    return { label: "Low", color: "text-emerald-600" };
  }, [volatilityIndex]);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Economic Calendar
          </CardTitle>
          <CardDescription>Upcoming high-impact economic events</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {upcomingEvents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No upcoming events scheduled
            </div>
          ) : (
            upcomingEvents.map((event) => (
              <div key={event.id} className="rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm">{event.country}</span>
                      <Badge
                        variant={
                          event.impact === "High"
                            ? "default"
                            : event.impact === "Medium"
                            ? "secondary"
                            : "outline"
                        }
                        className="text-xs"
                      >
                        {event.impact}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          event.sentiment === "Bullish"
                            ? "text-emerald-600 border-emerald-500/30"
                            : event.sentiment === "Bearish"
                            ? "text-rose-600 border-rose-500/30"
                            : "text-blue-600 border-blue-500/30"
                        }`}
                      >
                        {event.sentiment}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {event.indicator}
                    </p>
                    <div className="text-xs text-muted-foreground mt-1">
                      {event.date.toLocaleDateString()} at {event.time}
                    </div>
                  </div>
                  <div className="text-right text-xs font-mono flex-shrink-0">
                    <div className="text-muted-foreground">F: {event.forecast.toFixed(2)}</div>
                    <div className="text-muted-foreground">P: {event.previous.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Market Sentiment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={`rounded-lg p-4 ${sentimentColor.bg}`}>
              <div className={`text-2xl font-bold ${sentimentColor.color}`}>
                {sentimentColor.label}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Sentiment Index
              </div>
              <div className="mt-2 h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full ${
                    sentimentIndex >= 60
                      ? "bg-emerald-500"
                      : sentimentIndex >= 40
                      ? "bg-blue-500"
                      : "bg-rose-500"
                  }`}
                  style={{ width: `${sentimentIndex}%` }}
                />
              </div>
              <div className="text-sm font-mono mt-2">{sentimentIndex}/100</div>
            </div>

            <div className="rounded-lg border border-border p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Volatility Index</span>
                <span className={`text-sm font-bold ${volatilityLevel.color}`}>
                  {volatilityLevel.label}
                </span>
              </div>
              <div className="text-2xl font-mono font-bold">{volatilityIndex}</div>
              <div className="mt-2 h-1 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full ${
                    volatilityIndex >= 30
                      ? "bg-rose-500"
                      : volatilityIndex >= 20
                      ? "bg-blue-500"
                      : "bg-emerald-500"
                  }`}
                  style={{ width: `${(volatilityIndex / 40) * 100}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Event Impact Count</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-600" />
                High Impact
              </span>
              <span className="font-mono font-bold">{impactBadges["High"] || 0}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-amber-600" />
                Medium Impact
              </span>
              <span className="font-mono font-bold">{impactBadges["Medium"] || 0}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-blue-600" />
                Low Impact
              </span>
              <span className="font-mono font-bold">{impactBadges["Low"] || 0}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

const defaultEvents: EconomicEvent[] = [
  {
    id: "1",
    country: "US",
    indicator: "Non-Farm Payroll",
    date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    time: "13:30 EST",
    forecast: 200000,
    previous: 206000,
    impact: "High",
    sentiment: "Bullish",
  },
  {
    id: "2",
    country: "EUR",
    indicator: "ECB Interest Rate Decision",
    date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    time: "13:45 CET",
    forecast: 4.25,
    previous: 4.5,
    impact: "High",
    sentiment: "Bearish",
  },
  {
    id: "3",
    country: "GBP",
    indicator: "Retail Sales (YoY)",
    date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
    time: "09:00 GMT",
    forecast: 2.5,
    previous: 1.9,
    impact: "Medium",
    sentiment: "Bullish",
  },
  {
    id: "4",
    country: "JPY",
    indicator: "CPI (YoY)",
    date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
    time: "23:30 JST",
    forecast: 2.1,
    previous: 2.5,
    impact: "Medium",
    sentiment: "Neutral",
  },
  {
    id: "5",
    country: "CAD",
    indicator: "Employment Change",
    date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
    time: "12:30 EST",
    forecast: 25000,
    previous: 41000,
    impact: "High",
    sentiment: "Bearish",
  },
  {
    id: "6",
    country: "AUD",
    indicator: "Trade Balance",
    date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    time: "01:30 AEDT",
    forecast: 3.5,
    previous: 2.8,
    impact: "Low",
    sentiment: "Bullish",
  },
];
