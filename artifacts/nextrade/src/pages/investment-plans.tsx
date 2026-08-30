import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CartesianGrid, Legend, Line, LineChart, Tooltip, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { Shield, Zap, Target, AlertCircle, CheckCircle, Clock, Percent } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Custom fetch hooks for investment plans
function useGetInvestmentPlans() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await fetch("/api/investment-plans", {
          credentials: "include",
        });
        if (!response.ok) throw new Error("Failed to fetch investment plans");
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPlans();
  }, []);

  return { data, isLoading, error };
}

function useGetInvestmentPlanSubscriptions() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSubscriptions = async () => {
      try {
        const response = await fetch("/api/investment-plans/subscriptions", {
          credentials: "include",
        });
        if (!response.ok) throw new Error("Failed to fetch subscriptions");
        const result = await response.json();
        setData(result);
      } catch {
      } finally {
        setIsLoading(false);
      }
    };
    fetchSubscriptions();
  }, []);

  return { data, isLoading };
}

function useSubscribeInvestmentPlan() {
  const [isPending, setIsPending] = useState(false);

  const mutate = async (
    { planId, amount }: { planId: string; amount: number },
    callbacks: { onSuccess?: () => void; onError?: (error: any) => void }
  ) => {
    setIsPending(true);
    try {
      const response = await fetch(`/api/investment-plans/${planId}/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
        credentials: "include",
      });
      const result = await response.json();
      if (!response.ok) {
        callbacks.onError?.(result);
      } else {
        callbacks.onSuccess?.();
      }
    } catch (error) {
      callbacks.onError?.(error);
    } finally {
      setIsPending(false);
    }
  };

  return { mutate, isPending };
}

export function InvestmentPlans() {
  const { data: plansData, isLoading: isLoadingPlans } = useGetInvestmentPlans();
  const { data: subscriptionsData } = useGetInvestmentPlanSubscriptions();
  const subscribeMutation = useSubscribeInvestmentPlan();
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [subscriptionAmount, setSubscriptionAmount] = useState("");

  const getRiskTone = (riskLevel?: string) => {
    const value = (riskLevel ?? "low").toLowerCase();
    if (value.includes("extreme") || value.includes("very-high") || value.includes("high")) {
      return "bg-rose-500/10 text-rose-300 border-rose-400/30";
    }
    if (value.includes("med") || value.includes("medium")) {
      return "bg-amber-500/10 text-amber-300 border-amber-400/30";
    }
    return "bg-emerald-500/10 text-emerald-300 border-emerald-400/30";
  };

  const handleSubscribe = async (planId: string) => {
    if (!subscriptionAmount || isNaN(Number(subscriptionAmount))) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid subscription amount",
        variant: "destructive",
      });
      return;
    }

    subscribeMutation.mutate(
      { planId, amount: Number(subscriptionAmount) },
      {
        onSuccess: () => {
          toast({
            title: "Success",
            description: "Successfully subscribed to the investment plan",
          });
          setSelectedPlan(null);
          setSubscriptionAmount("");
        },
        onError: (error: any) => {
          toast({
            title: "Error",
            description: error.response?.data?.message || "Failed to subscribe",
            variant: "destructive",
          });
        },
      }
    );
  };

  if (isLoadingPlans) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-gray-200 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const activeSubscription = subscriptionsData?.subscriptions?.[0];
  const plans = plansData?.plans || [];
  const hasChecklist = plansData?.checklistRequired;

  return (
    <div className="space-y-8 max-w-7xl mx-auto p-4 md:p-6 bg-transparent">
      <section className="relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.18),_transparent_25%),linear-gradient(135deg,#081315_0%,#0b1220_45%,#111827_100%)] p-6 md:p-8 shadow-2xl shadow-emerald-950/20">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.04)_50%,transparent_100%)]" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <Badge className="border-emerald-400/30 bg-emerald-500/10 text-emerald-300">Capital allocation</Badge>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white">Investment Plans</h1>
            <p className="max-w-2xl text-sm md:text-base text-slate-300">
              Automated, managed investment strategies built for disciplined capital growth across twelve modern allocation tiers.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 min-w-[260px]">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Plans</div>
              <div className="mt-2 text-2xl font-bold text-white">{plans.length}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Mode</div>
              <div className="mt-2 text-lg font-bold text-emerald-300">Auto</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Risk</div>
              <div className="mt-2 text-lg font-bold text-amber-300">Managed</div>
            </div>
          </div>
        </div>
      </section>

      {/* Active Subscription Banner */}
      {activeSubscription && (
        <Card className="border-green-500/30 bg-green-500/5">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <CardTitle className="text-lg">Active Subscription</CardTitle>
                  <CardDescription>{activeSubscription.planName}</CardDescription>
                </div>
              </div>
              <Badge className="bg-green-600">{activeSubscription.status}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Initial Deposit</p>
                <p className="text-2xl font-bold">${activeSubscription.initialDeposit.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Current Balance</p>
                <p className="text-2xl font-bold">${activeSubscription.currentBalance.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Profit</p>
                <p className="text-2xl font-bold text-green-600">
                  ${activeSubscription.estimatedProfit.toFixed(2)} ({activeSubscription.estimatedProfitPct.toFixed(2)}%)
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Account Manager</p>
                <p className="font-semibold">{activeSubscription.accountManagerName || "Assigned"}</p>
              </div>
            </div>

            {/* Performance Chart */}
            <div className="mt-6">
              <h3 className="text-sm font-semibold mb-4">Performance Over Time</h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={[
                  { date: "Start", balance: activeSubscription.initialDeposit, profit: 0 },
                  { date: "Mid", balance: activeSubscription.initialDeposit + activeSubscription.estimatedProfit * 0.5, profit: activeSubscription.estimatedProfit * 0.5 },
                  { date: "Today", balance: activeSubscription.currentBalance, profit: activeSubscription.estimatedProfit },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value: any) => `$${value.toFixed(2)}`} />
                  <Legend />
                  <Line type="monotone" dataKey="balance" stroke="#3b82f6" name="Balance" strokeWidth={2} />
                  <Line type="monotone" dataKey="profit" stroke="#10b981" name="Profit" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Checklist Warning */}
      {hasChecklist && !activeSubscription && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="flex items-start gap-3 py-4">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-900">Account Setup Required</p>
              <p className="text-sm text-amber-800 mt-1">
                Complete your account checklist before subscribing to any investment plan.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plans Grid */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">Available Plans</TabsTrigger>
          <TabsTrigger value="comparison">Comparison</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {plans.map((plan: any) => (
              <Card
                key={plan.id}
                className={`group flex flex-col overflow-hidden border transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl ${
                  plan.id === "momentum_pulse"
                    ? "border-emerald-500/40 bg-gradient-to-b from-emerald-500/10 to-slate-950/60 shadow-emerald-900/20"
                    : "border-white/10 bg-slate-950/40"
                }`}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Plan #{plans.findIndex((item: any) => item.id === plan.id) + 1}</div>
                      <CardTitle className="mt-2 text-2xl text-white">{plan.name}</CardTitle>
                    </div>
                    <Badge className={getRiskTone(plan.riskLevel)}>{plan.riskLevel}</Badge>
                  </div>
                  <CardDescription className="line-clamp-3 min-h-[48px] text-slate-300">{plan.description}</CardDescription>
                </CardHeader>

                <CardContent className="flex-1 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 flex items-center gap-1">
                        <Target className="h-3 w-3" /> Min
                      </p>
                      <p className="mt-2 text-lg font-bold text-white">${plan.minDeposit}</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 flex items-center gap-1">
                        <Percent className="h-3 w-3" /> Return
                      </p>
                      <p className="mt-2 text-lg font-bold text-emerald-300">{plan.estimatedReturn}%</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Term
                      </p>
                      <p className="mt-2 text-lg font-bold text-white">{plan.tradingDuration}</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 flex items-center gap-1">
                        <Zap className="h-3 w-3" /> Leverage
                      </p>
                      <p className="mt-2 text-lg font-bold text-amber-300">{plan.leverage}x</p>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Core features</p>
                    <div className="flex flex-wrap gap-2">
                      {plan.assets?.slice(0, 3)?.map((asset: string) => (
                        <Badge key={asset} variant="outline" className="border-white/10 bg-white/5 text-slate-200">
                          {asset}
                        </Badge>
                      ))}
                      {plan.assets?.length > 3 && (
                        <Badge variant="outline" className="border-white/10 bg-white/5 text-slate-200">
                          +{plan.assets.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-white/10">
                    <ul className="space-y-2 text-sm text-slate-300">
                      <li className="flex items-center gap-2">
                        <Shield className="h-3.5 w-3.5 text-emerald-300" />
                        <span>Professional account manager</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Shield className="h-3.5 w-3.5 text-emerald-300" />
                        <span>Automated execution</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Shield className="h-3.5 w-3.5 text-emerald-300" />
                        <span>Daily performance monitoring</span>
                      </li>
                    </ul>
                  </div>
                </CardContent>

                <div className="px-6 py-4 border-t border-white/10 bg-slate-900/60">
                  {activeSubscription?.planId === plan.id ? (
                    <Button disabled className="w-full rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-400/20">
                      Currently Active
                    </Button>
                  ) : (
                    <Dialog open={selectedPlan === plan.id} onOpenChange={(open) => setSelectedPlan(open ? plan.id : null)}>
                      <DialogTrigger asChild>
                        <Button className="w-full rounded-full bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-lg shadow-emerald-500/20" disabled={hasChecklist || activeSubscription}>
                          Subscribe Now
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="border-white/10 bg-slate-950 text-white">
                        <DialogHeader>
                          <DialogTitle className="text-white">Subscribe to {plan.name}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="amount" className="text-slate-200">Investment Amount</Label>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-lg font-semibold text-white">$</span>
                              <Input
                                id="amount"
                                type="number"
                                placeholder={`Min: ${plan.minDeposit}`}
                                value={subscriptionAmount}
                                onChange={(e) => setSubscriptionAmount(e.target.value)}
                                min={plan.minDeposit}
                                className="flex-1 border-white/10 bg-white/5 text-white placeholder:text-slate-400"
                              />
                            </div>
                            <p className="text-xs text-slate-400 mt-2">
                              Minimum deposit: ${plan.minDeposit}
                            </p>
                          </div>

                          <div className="bg-white/5 p-3 rounded-lg space-y-2 text-sm border border-white/10">
                            <div className="flex justify-between text-slate-300">
                              <span>Initial Investment:</span>
                              <span className="font-semibold text-white">${subscriptionAmount || 0}</span>
                            </div>
                            <div className="flex justify-between text-emerald-300">
                              <span>Estimated Profit:</span>
                              <span className="font-semibold">
                                ${((Number(subscriptionAmount) || 0) * (plan.estimatedReturn / 100)).toFixed(2)}
                              </span>
                            </div>
                            <div className="flex justify-between border-t border-white/10 pt-2 font-bold text-white">
                              <span>Projected Balance:</span>
                              <span className="text-emerald-300">
                                ${(Number(subscriptionAmount) || 0 + (Number(subscriptionAmount) || 0) * (plan.estimatedReturn / 100)).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => setSelectedPlan(null)}
                            className="border-white/10 text-white hover:bg-white/5"
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={() => handleSubscribe(plan.id)}
                            disabled={subscribeMutation.isPending}
                            className="bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                          >
                            {subscribeMutation.isPending ? "Processing..." : "Confirm Subscription"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="comparison" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Plan Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-semibold">Feature</th>
                      {plans.map((plan: any) => (
                        <th key={plan.id} className="text-center py-3 px-4 font-semibold">
                          {plan.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">Minimum Deposit</td>
                      {plans.map((plan: any) => (
                        <td key={plan.id} className="text-center py-3 px-4">
                          ${plan.minDeposit}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">Estimated Return</td>
                      {plans.map((plan: any) => (
                        <td key={plan.id} className="text-center py-3 px-4 text-green-600 font-semibold">
                          {plan.estimatedReturn}%
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">Trading Duration</td>
                      {plans.map((plan: any) => (
                        <td key={plan.id} className="text-center py-3 px-4">
                          {plan.tradingDuration} days
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">Leverage</td>
                      {plans.map((plan: any) => (
                        <td key={plan.id} className="text-center py-3 px-4 font-semibold">
                          {plan.leverage}x
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">Risk Level</td>
                      {plans.map((plan: any) => (
                        <td key={plan.id} className="text-center py-3 px-4">
                          <Badge
                            variant={
                              plan.riskLevel === "low"
                                ? "default"
                                : plan.riskLevel === "medium"
                                  ? "secondary"
                                  : "destructive"
                            }
                          >
                            {plan.riskLevel}
                          </Badge>
                        </td>
                      ))}
                    </tr>
                    <tr className="hover:bg-muted/50">
                      <td className="py-3 px-4">Account Manager</td>
                      {plans.map((plan: any) => (
                        <td key={plan.id} className="text-center py-3 px-4">
                          <CheckCircle className="h-4 w-4 mx-auto text-green-600" />
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Risk Education */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Risk Disclosure
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p>
                All investment plans involve risk. Past performance is not indicative of future results. Your investment capital may be
                at risk, and you may not recover your entire initial investment.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="font-semibold text-blue-900">Low Risk</p>
                  <p className="text-xs text-blue-800 mt-1">Conservative strategies with lower leverage and exposure</p>
                </div>
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="font-semibold text-amber-900">Medium Risk</p>
                  <p className="text-xs text-amber-800 mt-1">Balanced approach with moderate leverage and diversification</p>
                </div>
                <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                  <p className="font-semibold text-red-900">High Risk</p>
                  <p className="text-xs text-red-800 mt-1">Aggressive strategies with higher leverage and market exposure</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
