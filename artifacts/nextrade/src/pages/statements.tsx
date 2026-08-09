import { useEffect, useState } from "react";
import { FileText, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

interface StatementSummary {
  statementId: string;
  generatedAt: string;
  accountHolder: string;
  totals: {
    walletBalance: number;
    deposits: number;
    withdrawals: number;
    netFlow: number;
    openTrades: number;
  };
  recentActivity: Array<{
    id: string;
    label: string;
    amount: number;
    currency: string;
    createdAt: string;
  }>;
  summary: {
    status: string;
    note: string;
  };
}

export function Statements() {
  const [statement, setStatement] = useState<StatementSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/statements", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setStatement(data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-6xl mx-auto">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Statements</h1>
          <p className="text-sm text-muted-foreground">Review a concise account summary and recent activity.</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard">
            Back to dashboard <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </header>

      {loading ? (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">Generating statement…</CardContent>
        </Card>
      ) : statement ? (
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" /> {statement.statementId}
              </CardTitle>
              <CardDescription>Generated {new Date(statement.generatedAt).toLocaleString()}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border bg-muted/40 p-4">
                <div className="text-sm font-semibold">{statement.accountHolder}</div>
                <div className="text-sm text-muted-foreground">{statement.summary.status}</div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border p-3">
                  <div className="text-xs uppercase text-muted-foreground">Wallet balance</div>
                  <div className="text-lg font-semibold">${statement.totals.walletBalance.toFixed(2)}</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-xs uppercase text-muted-foreground">Net flow</div>
                  <div className="text-lg font-semibold">${statement.totals.netFlow.toFixed(2)}</div>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">{statement.summary.note}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Recent activity</CardTitle>
              <CardDescription>Latest account activity on record</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {statement.recentActivity.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  <div>
                    <div className="font-medium">{item.label}</div>
                    <div className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</div>
                  </div>
                  <div className="font-semibold">${item.amount.toFixed(2)}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">No statement was available right now.</CardContent>
        </Card>
      )}
    </div>
  );
}
