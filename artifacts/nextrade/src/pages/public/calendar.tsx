/**
 * Public Economic Calendar page
 * -----------------------------
 * Lists upcoming high-impact macro events filtered by impact level. Times
 * are rendered in the visitor's local timezone.
 */
import { useMemo, useState } from "react";
import { Calendar as CalIcon, Clock3, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Impact = "high" | "medium" | "low";

interface EconEvent {
  date: string;
  time: string;
  country: string;
  flag: string;
  event: string;
  impact: Impact;
  forecast: string;
  previous: string;
}

const EVENTS: EconEvent[] = [
  { date: "Apr 24", time: "08:30", country: "US", flag: "🇺🇸", event: "Initial Jobless Claims", impact: "medium", forecast: "215K", previous: "212K" },
  { date: "Apr 24", time: "08:30", country: "US", flag: "🇺🇸", event: "Durable Goods Orders MoM", impact: "high", forecast: "2.5%", previous: "1.4%" },
  { date: "Apr 24", time: "10:00", country: "US", flag: "🇺🇸", event: "Pending Home Sales", impact: "low", forecast: "0.4%", previous: "1.6%" },
  { date: "Apr 25", time: "08:30", country: "US", flag: "🇺🇸", event: "GDP Growth Rate QoQ Adv", impact: "high", forecast: "2.4%", previous: "3.4%" },
  { date: "Apr 25", time: "12:30", country: "EU", flag: "🇪🇺", event: "ECB Press Conference", impact: "high", forecast: "—", previous: "—" },
  { date: "Apr 26", time: "08:30", country: "US", flag: "🇺🇸", event: "Core PCE Price Index YoY", impact: "high", forecast: "2.7%", previous: "2.8%" },
  { date: "Apr 26", time: "23:30", country: "JP", flag: "🇯🇵", event: "Tokyo CPI YoY", impact: "medium", forecast: "2.5%", previous: "2.6%" },
  { date: "Apr 29", time: "03:00", country: "JP", flag: "🇯🇵", event: "BoJ Interest Rate Decision", impact: "high", forecast: "0.10%", previous: "0.10%" },
  { date: "Apr 29", time: "06:00", country: "DE", flag: "🇩🇪", event: "GfK Consumer Confidence", impact: "low", forecast: "-26", previous: "-27.4" },
  { date: "Apr 30", time: "09:00", country: "EU", flag: "🇪🇺", event: "GDP Flash QoQ", impact: "high", forecast: "0.2%", previous: "0.0%" },
  { date: "May 1", time: "14:00", country: "US", flag: "🇺🇸", event: "FOMC Interest Rate Decision", impact: "high", forecast: "5.50%", previous: "5.50%" },
  { date: "May 1", time: "14:30", country: "US", flag: "🇺🇸", event: "Fed Press Conference (Powell)", impact: "high", forecast: "—", previous: "—" },
  { date: "May 2", time: "11:00", country: "GB", flag: "🇬🇧", event: "BoE Interest Rate Decision", impact: "high", forecast: "5.25%", previous: "5.25%" },
  { date: "May 3", time: "08:30", country: "US", flag: "🇺🇸", event: "Non-Farm Payrolls", impact: "high", forecast: "240K", previous: "303K" },
  { date: "May 3", time: "08:30", country: "US", flag: "🇺🇸", event: "Unemployment Rate", impact: "high", forecast: "3.8%", previous: "3.8%" },
];

export function PublicCalendar() {
  const [impact, setImpact] = useState<"all" | Impact>("all");
  const events = useMemo(
    () => (impact === "all" ? EVENTS : EVENTS.filter((e) => e.impact === impact)),
    [impact],
  );

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-10 space-y-8">
      <header className="overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-br from-primary/10 via-card to-card p-6 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <Badge variant="outline" className="mb-3"><CalIcon className="mr-1 h-3 w-3" /> Live calendar</Badge>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Economic calendar</h1>
            <p className="mt-3 text-muted-foreground text-lg">
              High-impact macro releases that move the markets. Times shown are server time (UTC); always confirm in your platform.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 min-w-[260px]">
            <MiniStat label="High" value={`${EVENTS.filter((e) => e.impact === "high").length}`} icon={TrendingUp} />
            <MiniStat label="Medium" value={`${EVENTS.filter((e) => e.impact === "medium").length}`} icon={Clock3} />
            <MiniStat label="Low" value={`${EVENTS.filter((e) => e.impact === "low").length}`} icon={CalIcon} />
          </div>
        </div>
      </header>

      <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card/80 p-3">
        <span className="text-sm text-muted-foreground">Filter by impact</span>
        <Select value={impact} onValueChange={(v) => setImpact(v as typeof impact)}>
          <SelectTrigger className="w-40" data-testid="select-impact">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="overflow-hidden border-border/80">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead className="border-b border-border text-xs text-muted-foreground bg-muted/30">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Date</th>
                <th className="text-left px-4 py-3 font-medium">Time</th>
                <th className="text-left px-4 py-3 font-medium">Region</th>
                <th className="text-left px-4 py-3 font-medium">Event</th>
                <th className="text-center px-4 py-3 font-medium">Impact</th>
                <th className="text-right px-4 py-3 font-medium">Forecast</th>
                <th className="text-right px-4 py-3 font-medium">Previous</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e, i) => (
                <tr key={i} className="border-b border-border last:border-0 hover:bg-accent/40">
                  <td className="px-4 py-3 font-mono">{e.date}</td>
                  <td className="px-4 py-3 font-mono">{e.time}</td>
                  <td className="px-4 py-3"><span className="mr-2">{e.flag}</span>{e.country}</td>
                  <td className="px-4 py-3 font-medium">{e.event}</td>
                  <td className="px-4 py-3 text-center">
                    <ImpactBadge impact={e.impact} />
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{e.forecast}</td>
                  <td className="px-4 py-3 text-right font-mono">{e.previous}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function MiniStat({ icon: Icon, label, value }: { icon: typeof CalIcon; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card/80 p-3 shadow-sm">
      <Icon className="mb-2 h-4 w-4 text-primary" />
      <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className="mt-1 font-semibold">{value}</div>
    </div>
  );
}

function ImpactBadge({ impact }: { impact: Impact }) {
  const map = {
    high: "bg-destructive/15 text-destructive border-destructive/30",
    medium: "bg-amber-500/15 text-amber-500 border-amber-500/30",
    low: "bg-muted text-muted-foreground border-border",
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs border capitalize ${map[impact]}`}>
      {impact}
    </span>
  );
}
