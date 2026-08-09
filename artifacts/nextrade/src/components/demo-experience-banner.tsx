import { Link } from "wouter";
import { Sparkles, ArrowRight, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function DemoExperienceBanner() {
  const { isDemo } = useAuth();

  if (isDemo) {
    return (
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-primary/10 p-2 text-primary">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-semibold">Demo account is active</div>
              <p className="text-sm text-muted-foreground">
                Explore the platform with seeded balances, sample trades, and a ready-made portfolio.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/login">
                <ShieldCheck className="h-4 w-4" />
                Switch to real account
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-amber-500/10 p-2 text-amber-600">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-semibold">Try the free demo</div>
            <p className="text-sm text-muted-foreground">
              Launch a pre-funded demo session to explore trading, wallets, and market data without a deposit.
            </p>
          </div>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/login?demo=1">
            Start demo
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
