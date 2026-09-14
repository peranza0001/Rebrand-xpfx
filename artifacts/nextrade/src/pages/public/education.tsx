/**
 * Public Education page
 * ---------------------
 * Trader academy with course tracks, market insight articles and a glossary
 * accordion. All content is curated marketing copy — no backend required.
 */
import { Link } from "wouter";
import { GraduationCap, BookOpen, PlayCircle, TrendingUp, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export function PublicEducation() {
  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-10 space-y-12">
      <header className="max-w-2xl">
        <Badge variant="outline" className="mb-3 border-emerald-400/30 bg-emerald-500/10 text-emerald-300">Academy</Badge>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">Learn to trade with confidence</h1>
        <p className="mt-2 text-slate-300">
          Free courses, weekly market insights and a complete glossary — built by professional traders for traders at every level.
        </p>
      </header>

      <section>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-white"><GraduationCap className="h-5 w-5 text-emerald-300" /> Course tracks</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {COURSES.map((c) => (
            <Card key={c.title} className="border-white/10 bg-slate-950/40 hover:border-emerald-400/30 transition-colors">
              <CardHeader>
                <div className="flex items-center justify-between mb-1">
                  <Badge variant="secondary" className="border-emerald-400/30 bg-emerald-500/10 text-emerald-300">{c.level}</Badge>
                  <span className="text-xs text-slate-400 inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {c.duration}
                  </span>
                </div>
                <CardTitle className="text-lg text-white">{c.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-300 mb-4">{c.desc}</p>
                <Button asChild variant="outline" className="w-full border-white/20 text-white hover:bg-white/5">
                  <Link href="/signup"><PlayCircle className="h-4 w-4 mr-2" /> Start course</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-white"><BookOpen className="h-5 w-5 text-emerald-300" /> Latest market insights</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ARTICLES.map((a) => (
            <Card key={a.title} className="border-white/10 bg-slate-950/40 hover:border-emerald-400/30 transition-colors">
              <CardContent className="p-5">
                <div className="text-xs text-slate-400 mb-2 inline-flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" /> {a.category} · {a.date}
                </div>
                <div className="font-semibold mb-2 text-white">{a.title}</div>
                <p className="text-sm text-slate-300">{a.excerpt}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4 text-white">Glossary</h2>
        <Card className="border-white/10 bg-slate-950/40">
          <CardContent className="p-2">
            <Accordion type="single" collapsible>
              {GLOSSARY.map((g) => (
                <AccordionItem key={g.term} value={g.term}>
                  <AccordionTrigger className="px-3 hover:text-white text-slate-300">{g.term}</AccordionTrigger>
                  <AccordionContent className="px-3 text-sm text-slate-400">{g.def}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

const COURSES = [
  { title: "Forex foundations", level: "Beginner", duration: "2h 30m", desc: "Currency pairs, pips, lot sizes, leverage and how to read a quote." },
  { title: "Technical analysis 101", level: "Beginner", duration: "3h 10m", desc: "Trends, support/resistance, candlestick patterns and core indicators." },
  { title: "Risk management mastery", level: "Intermediate", duration: "1h 45m", desc: "Position sizing, R-multiples, stop placement and drawdown control." },
  { title: "Crypto trading deep-dive", level: "Intermediate", duration: "2h 50m", desc: "Spot vs perpetuals, on-chain metrics, sentiment and order-flow basics." },
  { title: "Algorithmic strategies", level: "Advanced", duration: "4h 20m", desc: "Backtesting, mean-reversion vs momentum, walk-forward optimization." },
  { title: "Macro & central banks", level: "Advanced", duration: "2h 15m", desc: "Rate decisions, yield curves, dollar cycles and inter-market analysis." },
];

const ARTICLES = [
  { category: "FX", date: "Apr 22", title: "EUR/USD coils ahead of ECB", excerpt: "The pair is squeezing into a four-week range as traders position for Lagarde's tone shift." },
  { category: "Crypto", date: "Apr 21", title: "Bitcoin halving: what changed", excerpt: "Post-halving supply dynamics, miner economics and what historical cycles can — and can't — tell us." },
  { category: "Indices", date: "Apr 19", title: "Earnings week guide", excerpt: "Mega-cap tech reports incoming. Key levels to watch on US100 and breadth signals." },
  { category: "Commodities", date: "Apr 18", title: "Gold breaks $2,400", excerpt: "Real yields, central-bank buying and geopolitical risk — the three pillars of the rally." },
  { category: "Strategy", date: "Apr 16", title: "The 1% rule, revisited", excerpt: "Why fixed-fractional sizing still beats most discretionary approaches over the long run." },
  { category: "FX", date: "Apr 15", title: "Yen at the brink", excerpt: "Intervention math, MoF rhetoric and what a USD/JPY top would actually look like." },
];

const GLOSSARY = [
  { term: "Pip", def: "The smallest standardized price move for a currency pair, typically 0.0001 (or 0.01 for JPY pairs)." },
  { term: "Spread", def: "The difference between the bid (sell) price and ask (buy) price quoted by your broker." },
  { term: "Leverage", def: "Borrowed capital that allows you to control a larger position with a smaller deposit. Amplifies both gains and losses." },
  { term: "Margin", def: "The collateral you must deposit to open and maintain a leveraged position." },
  { term: "Slippage", def: "The difference between the expected price of a trade and the price at which it's actually executed." },
  { term: "Lot", def: "A standardized contract size. A standard lot in FX equals 100,000 units of the base currency." },
  { term: "Liquidity", def: "How easily an asset can be bought or sold without moving its price." },
  { term: "Drawdown", def: "The peak-to-trough decline in account equity over a period." },
];
