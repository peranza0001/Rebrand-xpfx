/**
 * Public Markets page
 * -------------------
 * Tabbed list of every tradable instrument with simulated live bid/ask,
 * change %, daily high/low and a one-click "Trade" CTA that routes to
 * signup. Tabs are deep-linkable via the `?tab=` query param.
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useSearch } from "wouter";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLiveMarkets, formatPrice, MarketCategory } from "@/lib/market-data";

const TABS: { value: MarketCategory; label: string }[] = [
  { value: "forex", label: "Forex" },
  { value: "crypto", label: "Crypto" },
  { value: "indices", label: "Indices" },
  { value: "commodities", label: "Commodities" },
  { value: "stocks", label: "Stocks" },
];

export function PublicMarkets() {
  const search = useSearch();
  const initial = useMemo(() => {
    const t = new URLSearchParams(search).get("tab") as MarketCategory | null;
    return TABS.find((x) => x.value === t)?.value ?? "forex";
  }, [search]);

  const [tab, setTab] = useState<MarketCategory>(initial);
  const [q, setQ] = useState("");
  useEffect(() => setTab(initial), [initial]);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-10">
      <div className="mb-8 max-w-2xl">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Live markets</h1>
        <p className="mt-2 text-muted-foreground">
          Real-time bid/ask quotes across every asset class we offer. Tight spreads, 24/5 trading on FX, and 24/7 on crypto.
        </p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as MarketCategory)}>
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <TabsList className="flex-wrap h-auto">
            {TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value} data-testid={`tab-${t.value}`}>{t.label}</TabsTrigger>
            ))}
          </TabsList>
          <Input
            placeholder="Search symbol…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="sm:max-w-xs sm:ml-auto"
            data-testid="input-market-search"
          />
        </div>

        {TABS.map((t) => (
          <TabsContent key={t.value} value={t.value}>
            <MarketTable category={t.value} query={q} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function MarketTable({ category, query }: { category: MarketCategory; query: string }) {
  const ticks = useLiveMarkets(category);
  const filtered = ticks.filter(
    (t) => t.symbol.toLowerCase().includes(query.toLowerCase()) || t.name.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <Card>
      <CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="border-b border-border text-xs text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Symbol</th>
              <th className="text-right px-4 py-3 font-medium">Bid</th>
              <th className="text-right px-4 py-3 font-medium">Ask</th>
              <th className="text-right px-4 py-3 font-medium">Change</th>
              <th className="text-right px-4 py-3 font-medium hidden md:table-cell">High</th>
              <th className="text-right px-4 py-3 font-medium hidden md:table-cell">Low</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => {
              const up = t.changePct >= 0;
              return (
                <tr key={t.symbol} className="border-b border-border last:border-0 hover:bg-accent/40">
                  <td className="px-4 py-3">
                    <div className="font-mono font-semibold">{t.symbol}</div>
                    <div className="text-xs text-muted-foreground">{t.name}</div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{formatPrice(t.bid)}</td>
                  <td className="px-4 py-3 text-right font-mono">{formatPrice(t.ask)}</td>
                  <td className={`px-4 py-3 text-right font-mono ${up ? "text-primary" : "text-destructive"}`}>
                    <span className="inline-flex items-center gap-1 justify-end">
                      {up ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                      {up ? "+" : ""}{t.changePct.toFixed(2)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono hidden md:table-cell">{formatPrice(t.high)}</td>
                  <td className="px-4 py-3 text-right font-mono hidden md:table-cell">{formatPrice(t.low)}</td>
                  <td className="px-4 py-3 text-right">
                    <Button asChild size="sm" data-testid={`button-trade-${t.symbol}`}>
                      <Link href="/signup">Trade</Link>
                    </Button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No instruments match your search.</td></tr>
            )}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
