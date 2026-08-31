import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, BarChart3, TrendingUp, UserRound, ShieldCheck, RefreshCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type CopyLeader = {
  id: string;
  displayName: string;
  strategy: string;
  riskLevel: string;
  monthlyReturn: number;
  winRate: number;
  maxDrawdown: number;
  followerCount?: number;
  suspended?: boolean;
};

type CopyEvent = {
  id: string;
  symbol: string;
  side: string;
  notional: number;
  createdAt?: string;
  simulated?: boolean;
  status?: string;
};

function getRiskTone(riskLevel: string) {
  const value = (riskLevel ?? "moderate").toLowerCase();
  if (value.includes("high")) return "bg-rose-500/10 text-rose-300 border-rose-400/30";
  if (value.includes("moderate") || value.includes("medium")) return "bg-amber-500/10 text-amber-300 border-amber-400/30";
  return "bg-emerald-500/10 text-emerald-300 border-emerald-400/30";
}

export function CopyTrading() {
  const { toast } = useToast();
  const [leaders, setLeaders] = useState<CopyLeader[]>([]);
  const [events, setEvents] = useState<CopyEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null);
  const [selectedLeaderId, setSelectedLeaderId] = useState<string | null>(null);
  const [allocation, setAllocation] = useState("10");

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [leadersRes, historyRes] = await Promise.all([
        fetch("/api/copy-trading/leaders", { credentials: "include" }),
        fetch("/api/copy-trading/history", { credentials: "include" }),
      ]);

      if (!leadersRes.ok) throw new Error("Unable to fetch copy-trading leaders.");
      const leadersJson = await leadersRes.json();
      const historyJson = historyRes.ok ? await historyRes.json() : { events: [] };

      setLeaders(leadersJson.leaders ?? []);
      setEvents(historyJson.events ?? []);
      if (leadersJson.leaders?.[0]?.id) setSelectedLeaderId(leadersJson.leaders[0].id);
    } catch (error) {
      toast({
        title: "Copy trading unavailable",
        description: error instanceof Error ? error.message : "Could not load copy-trading data.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  const selectedLeader = useMemo(
    () => leaders.find((leader) => leader.id === selectedLeaderId) ?? leaders[0] ?? null,
    [leaders, selectedLeaderId],
  );

  const followSelectedLeader = async () => {
    if (!selectedLeader) return;
    const pct = Number(allocation);
    if (!Number.isFinite(pct) || pct < 1 || pct > 100) {
      toast({ title: "Invalid allocation", description: "Choose a value between 1% and 100%.", variant: "destructive" });
      return;
    }

    setIsSubmitting(selectedLeader.id);
    try {
      const response = await fetch(`/api/copy-trading/leaders/${selectedLeader.id}/follow`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allocationPct: pct }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "Could not follow this leader.");
      toast({ title: "Copy setup saved", description: `You are now copying ${selectedLeader.displayName} at ${pct}% allocation.` });
      await fetchData();
    } catch (error) {
      toast({ title: "Follow failed", description: error instanceof Error ? error.message : "Unable to follow this leader.", variant: "destructive" });
    } finally {
      setIsSubmitting(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto p-4 md:p-6">
        <Skeleton className="h-40 w-full" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 md:p-6">
      <section className="rounded-3xl border border-emerald-500/20 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_30%),linear-gradient(135deg,#081315_0%,#0b1220_45%,#111827_100%)] p-6 md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <Badge className="border-emerald-400/30 bg-emerald-500/10 text-emerald-300">Social trading</Badge>
            <h1 className="mt-3 text-3xl md:text-4xl font-black tracking-tight text-white">Copy Trading</h1>
            <p className="mt-2 max-w-2xl text-sm md:text-base text-slate-300">
              Follow vetted strategies, cap risk with allocation limits, and monitor simulated copy activity in real time.
            </p>
          </div>
          <Button variant="outline" onClick={() => void fetchData()} className="border-white/10 bg-white/5 text-white hover:bg-white/10">
            <RefreshCcw className="h-4 w-4 mr-2" /> Refresh
          </Button>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-emerald-400" /> Popular traders</CardTitle>
            <CardDescription>Choose a leader and allocate a percentage of your capital.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {leaders.map((leader) => (
              <button
                key={leader.id}
                type="button"
                onClick={() => setSelectedLeaderId(leader.id)}
                className={`w-full rounded-2xl border p-4 text-left transition-colors ${
                  selectedLeader?.id === leader.id ? "border-emerald-400/60 bg-emerald-500/5" : "border-border bg-card hover:border-primary/50"
                }`}
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                        {leader.displayName.split(" ").map((part) => part[0]).slice(0, 2).join("")}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{leader.displayName}</p>
                        <p className="text-xs text-muted-foreground">{leader.strategy}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getRiskTone(leader.riskLevel)}>{leader.riskLevel}</Badge>
                    <Badge variant="secondary">{leader.winRate}% win rate</Badge>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-border bg-muted/40 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Monthly return</p>
                    <p className="mt-1 text-lg font-bold text-emerald-400">+{leader.monthlyReturn}%</p>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/40 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Max drawdown</p>
                    <p className="mt-1 text-lg font-bold text-amber-300">{leader.maxDrawdown}%</p>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/40 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Followers</p>
                    <p className="mt-1 text-lg font-bold text-foreground">{leader.followerCount ?? 0}</p>
                  </div>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> Risk controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedLeader ? (
              <>
                <div className="rounded-2xl border border-border bg-muted/30 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Selected strategy</p>
                  <p className="mt-2 text-xl font-semibold">{selectedLeader.displayName}</p>
                  <p className="text-sm text-muted-foreground">{selectedLeader.strategy}</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Allocation percentage</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={allocation}
                    onChange={(event) => setAllocation(event.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none ring-0 focus:border-primary"
                  />
                </div>

                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-emerald-400" /> Simulated copy events only</li>
                  <li className="flex items-center gap-2"><UserRound className="h-4 w-4 text-emerald-400" /> Allocation is capped at 100%</li>
                  <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-400" /> Past performance is not a guarantee</li>
                </ul>

                <Button
                  className="w-full"
                  onClick={() => void followSelectedLeader()}
                  disabled={isSubmitting !== null && isSubmitting !== selectedLeader.id}
                >
                  {isSubmitting === selectedLeader.id ? "Saving..." : `Follow ${selectedLeader.displayName}`}
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No leader selected.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ArrowRight className="h-4 w-4 text-primary" /> Recent copy activity</CardTitle>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">No copy activity yet. Follow a leader to begin.</p>
          ) : (
            <div className="space-y-3">
              {events.map((event) => (
                <div key={event.id} className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-3 py-2">
                  <div>
                    <p className="font-medium text-foreground">{event.symbol} {event.side.toUpperCase()}</p>
                    <p className="text-xs text-muted-foreground">{event.simulated ? "Simulated" : "Live"} · {event.status ?? "Queued"}</p>
                  </div>
                  <p className="font-semibold text-emerald-400">${Number(event.notional ?? 0).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
