import { useEffect, useState } from "react";
import { Briefcase, TrendingUp, Sparkles, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fetchFeatureAccess, getFeatureAccess, type FeatureAccessState } from "@/lib/account-access";

const DISCLAIMER =
  "SmartVest is a simulated educational account, not a TFSA, FHSA, investment product, or registered account.";
type Plan = "conservative" | "balanced" | "growth";

export function SmartVest() {
  const [plan, setPlan] = useState<Plan>("balanced");
  const [portfolio, setPortfolio] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [featureAccess, setFeatureAccess] = useState<FeatureAccessState>(getFeatureAccess({}));

  async function load() {
    const response = await fetch("/api/smartvest", { credentials: "include" });
    if (response.ok) setPortfolio(await response.json());
    setLoading(false);
  }

  useEffect(() => {
    void load();
    void fetchFeatureAccess()
      .then(setFeatureAccess)
      .catch(() => setFeatureAccess(getFeatureAccess({})));
  }, []);

  async function createAccount() {
    setSaving(true);
    const response = await fetch("/api/smartvest", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan, disclaimerAcknowledged: true }),
    });
    if (response.ok) setPortfolio(await response.json());
    setSaving(false);
  }

  const account = portfolio?.account;
  if (!featureAccess.canAccessSmartVest) {
    return (
      <div className="space-y-6 p-4 md:p-6 max-w-5xl mx-auto">
        <header>
          <div className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold">SmartVest</h1>
            <Badge variant="secondary">Simulation</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl">A portfolio tracking view for learning and planning. It does not create, hold, or promise real investments.</p>
        </header>

        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="py-6 text-sm space-y-3">
            <p>SmartVest is available once your account reaches the KYC-ready tier.</p>
            <Button asChild>
              <a href="/kyc">Complete KYC to unlock</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-5xl mx-auto">
      <header>
        <div className="flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold">SmartVest</h1>
          <Badge variant="secondary">Simulation</Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl">A portfolio tracking view for learning and planning. It does not create, hold, or promise real investments.</p>
      </header>

      <Card className="border-amber-500/40 bg-amber-500/5">
        <CardContent className="py-4 text-sm">{DISCLAIMER}</CardContent>
      </Card>

      {loading ? <Card><CardContent className="py-8 text-sm text-muted-foreground">Loading portfolio...</CardContent></Card> : account ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-base">Portfolio value</CardTitle><CardDescription>Derived from your existing simulated wallet balance.</CardDescription></CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">${account.portfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <div className="text-sm text-emerald-600 mt-2 flex items-center gap-1"><TrendingUp className="h-4 w-4" /> {account.returnPercent.toFixed(2)}% simulated return</div>
              <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground"><Sparkles className="h-4 w-4" /> Suggested contribution: ${account.suggestedContribution.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">{account.planLabel} allocation</CardTitle><CardDescription>{account.description}</CardDescription></CardHeader>
            <CardContent className="space-y-3 text-sm">{Object.entries(account.allocation).map(([name, value]) => <div key={name} className="flex justify-between"><span className="capitalize">{name}</span><span className="font-medium">{value}%</span></div>)}</CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardHeader><CardTitle className="text-base">Create your simulation</CardTitle><CardDescription>Choose a planning profile. Your existing simulated balance remains the only balance source.</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-3">{(["conservative", "balanced", "growth"] as Plan[]).map((option) => <Button key={option} type="button" variant={plan === option ? "default" : "outline"} onClick={() => setPlan(option)}>{option}</Button>)}</div>
            <Button onClick={() => void createAccount()} disabled={saving}>{saving ? "Creating..." : "Create simulation"}</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}