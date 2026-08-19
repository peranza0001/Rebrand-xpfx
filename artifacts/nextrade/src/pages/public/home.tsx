/**
 * Public landing page (Home)
 * --------------------------
 * Marketing entry-point that introduces XpressPro FX, showcases the live
 * market ticker, account tiers, supported asset classes, platform features,
 * and social proof. Designed to be the first impression for prospects.
 */
import { Link } from "wouter";
import {
  TrendingUp, ShieldCheck, Zap, Globe2, BarChart3, Layers,
  Headphones, Award, Lock, Wallet, ArrowRight, Check, Briefcase,
  Landmark, Sparkles, Rocket, Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLiveMarkets, formatPrice } from "@/lib/market-data";

export function PublicHome() {
  const ticker = useLiveMarkets().slice(0, 12);

  return (
    <div>
      {/* Live ticker */}
      <div className="border-b border-border bg-card/40 overflow-hidden">
        <div className="flex gap-8 px-4 md:px-6 py-2 whitespace-nowrap animate-[scroll_40s_linear_infinite]">
          {[...ticker, ...ticker].map((t, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span className="font-mono font-semibold">{t.symbol}</span>
              <span className="font-mono">{formatPrice(t.bid)}</span>
              <span className={`font-mono text-xs ${t.changePct >= 0 ? "text-primary" : "text-destructive"}`}>
                {t.changePct >= 0 ? "+" : ""}{t.changePct.toFixed(2)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-16 md:py-24 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <Badge variant="outline" className="mb-4">Regulated multi-asset broker</Badge>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight">
              Trade the world's<br />
              markets, the smart way.
            </h1>
            <p className="mt-5 text-lg text-muted-foreground max-w-xl">
              Forex, crypto, stocks, indices and commodities — all on one account, with deep liquidity, ultra-tight spreads from 0.0 pips and lightning-fast execution.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" data-testid="button-hero-signup">
                <Link href="/signup">Open free account <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" data-testid="button-hero-demo">
                <Link href="/login?demo=1">Try demo account</Link>
              </Button>
            </div>
            <div className="mt-8 grid grid-cols-3 gap-4 max-w-md">
              <Stat value="2.5M+" label="Active traders" />
              <Stat value="180+" label="Countries" />
              <Stat value="$4.2B" label="Daily volume" />
            </div>
          </div>

          <div className="relative">
            <Card className="border-primary/20 shadow-2xl">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Live markets</CardTitle>
                  <Badge variant="secondary" className="font-mono">LIVE</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {ticker.slice(0, 6).map((t) => (
                    <div key={t.symbol} className="flex items-center justify-between px-4 py-3">
                      <div>
                        <div className="font-mono font-semibold text-sm">{t.symbol}</div>
                        <div className="text-xs text-muted-foreground">{t.name}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-sm">{formatPrice(t.bid)}</div>
                        <div className={`text-xs font-mono ${t.changePct >= 0 ? "text-primary" : "text-destructive"}`}>
                          {t.changePct >= 0 ? "+" : ""}{t.changePct.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <Section title="Demo account ready in seconds" subtitle="Launch a fully seeded trading demo with one click.">
        <div className="grid gap-4 md:grid-cols-[1.2fr_auto] items-center rounded-3xl border border-primary/10 bg-primary/5 p-8">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-primary font-semibold">Demo account</p>
            <h2 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight">
              Explore the platform with a pre-funded demo trading account.
            </h2>
            <p className="mt-4 text-muted-foreground max-w-xl">
              No deposit required. Start with a seeded portfolio, live charts, demo wallets, sample P2P orders and trades.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/login?demo=1">Start demo account</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/signup">Open live account</Link>
              </Button>
            </div>
          </div>
          <div className="grid gap-3">
            <Card className="border border-border bg-card">
              <CardContent className="p-6">
                <div className="text-sm font-semibold text-primary">Demo highlights</div>
                <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <Check className="mt-1 h-4 w-4 text-primary shrink-0" />
                    Access a fully seeded portfolio with demo balances.
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-1 h-4 w-4 text-primary shrink-0" />
                    View sample trades, orders, and P2P activity.
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-1 h-4 w-4 text-primary shrink-0" />
                    Keep the same user experience as live trading.
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </Section>

      {/* Asset classes */}
      <Section title="Markets you can trade" subtitle="One account, every major asset class.">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            { icon: Globe2, label: "Forex", desc: "60+ pairs" },
            { icon: BarChart3, label: "Crypto", desc: "200+ coins" },
            { icon: Layers, label: "Indices", desc: "Global indices" },
            { icon: TrendingUp, label: "US Stocks", desc: "3,000+ equities" },
            { icon: Award, label: "Commodities", desc: "Metals & energy" },
          ].map(({ icon: Icon, label, desc }) => (
            <Card key={label} className="hover-elevate">
              <CardContent className="p-5 text-center">
                <Icon className="h-8 w-8 text-primary mx-auto mb-2" />
                <div className="font-semibold">{label}</div>
                <div className="text-xs text-muted-foreground">{desc}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      <Section title="Professional investment plans" subtitle="A unified structure for forex trading, US stock investing, crypto exposure, and digital portfolio growth.">
        <div className="grid gap-4 lg:grid-cols-4">
          {INVESTMENT_PLANS.map((plan) => (
            <Card key={plan.name} className={plan.featured ? "border-primary shadow-xl shadow-primary/10 bg-gradient-to-b from-primary/8 to-background" : "border-border/70"}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <plan.icon className="h-4 w-4 text-primary" />
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                  </div>
                  {plan.featured && <Badge>Featured</Badge>}
                </div>
                <div className="mt-3 text-3xl font-bold">${plan.minDeposit}</div>
                <div className="text-xs text-muted-foreground">starting deposit</div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{plan.description}</p>
                <ul className="space-y-2 text-sm">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 text-primary shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button asChild className="w-full" variant={plan.featured ? "default" : "outline"}>
                  <Link href="/signup">Choose {plan.name}</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      <Section title="US stocks investment features" subtitle="A modern stock investing layer designed for long-term capital growth and active equity trading.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {US_STOCK_FEATURES.map(({ icon: Icon, title, text }) => (
            <Card key={title}>
              <CardContent className="p-6">
                <Icon className="h-6 w-6 text-primary mb-3" />
                <div className="font-semibold mb-2">{title}</div>
                <p className="text-sm text-muted-foreground">{text}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      {/* Why us */}
      <Section title="Why traders choose XpressPro FX" subtitle="Built for professionals, accessible to beginners.">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { icon: Zap, title: "Lightning execution", desc: "Average order execution under 14 ms with no requotes." },
            { icon: ShieldCheck, title: "Regulated & insured", desc: "Segregated client funds across tier-1 banks." },
            { icon: Wallet, title: "Tight spreads", desc: "Spreads from 0.0 pips on raw accounts." },
            { icon: Layers, title: "Deep liquidity", desc: "Aggregated quotes from 25+ tier-1 venues." },
            { icon: Headphones, title: "24/7 support", desc: "Multilingual specialists, every day of the year." },
            { icon: Lock, title: "Bank-grade security", desc: "2FA, biometric login, cold-storage custody." },
          ].map(({ icon: Icon, title, desc }) => (
            <Card key={title}>
              <CardContent className="p-6">
                <Icon className="h-6 w-6 text-primary mb-3" />
                <div className="font-semibold mb-1">{title}</div>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      {/* Account types */}
      <Section title="Choose your account" subtitle="Plans that scale with your trading style.">
        <div className="grid md:grid-cols-3 gap-4">
          {ACCOUNTS.map((a) => (
            <Card key={a.name} className={a.featured ? "border-primary shadow-lg" : ""}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{a.name}</CardTitle>
                  {a.featured && <Badge>Most popular</Badge>}
                </div>
                <div className="mt-2">
                  <div className="text-3xl font-bold">${a.minDeposit}</div>
                  <div className="text-xs text-muted-foreground">minimum deposit</div>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {a.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button asChild className="w-full mt-5" variant={a.featured ? "default" : "outline"}>
                  <Link href="/signup">Open {a.name}</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      {/* Platforms */}
      <Section title="Trade anywhere" subtitle="Web, desktop and mobile — your account, synchronized.">
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { title: "Web platform", desc: "Full-featured charting and order management in your browser. No download required." },
            { title: "Mobile app", desc: "Native iOS & Android apps with biometric login, push price alerts and one-tap trading." },
            { title: "MT4 / MT5 bridge", desc: "Connect your favorite MetaTrader build via our FIX/REST bridge." },
          ].map((p) => (
            <Card key={p.title}>
              <CardContent className="p-6">
                <div className="font-semibold mb-1">{p.title}</div>
                <p className="text-sm text-muted-foreground">{p.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      {/* Testimonials */}
      <Section title="Trusted by traders worldwide">
        <div className="grid md:grid-cols-3 gap-4">
          {TESTIMONIALS.map((t) => (
            <Card key={t.name}>
              <CardContent className="p-6">
                <div className="text-amber-400 mb-2">★★★★★</div>
                <p className="text-sm mb-4">"{t.quote}"</p>
                <div className="text-sm font-semibold">{t.name}</div>
                <div className="text-xs text-muted-foreground">{t.role}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      {/* CTA */}
      <section className="px-4 md:px-6 my-16">
        <div className="max-w-7xl mx-auto rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/15 to-transparent p-8 md:p-14 text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Ready to start trading?</h2>
          <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
            Open a free account in under 3 minutes. No commitment, no hidden fees.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 justify-center">
            <Button asChild size="lg"><Link href="/signup">Create live account</Link></Button>
            <Button asChild size="lg" variant="outline"><Link href="/login">Try demo</Link></Button>
          </div>
        </div>
      </section>

      <style>{`
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="px-4 md:px-6 py-12 md:py-16">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 text-center">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">{title}</h2>
          {subtitle && <p className="mt-2 text-muted-foreground">{subtitle}</p>}
        </div>
        {children}
      </div>
    </section>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

const INVESTMENT_PLANS = [
  {
    name: "Starter Growth",
    minDeposit: 250,
    featured: false,
    description: "Build confidence with diversified trading and long-term crypto, forex, and US stock exposure.",
    icon: Rocket,
    features: [
      "Multi-asset access across forex, crypto, indices and equities",
      "1:50 leverage for balanced risk management",
      "Recurring investment automation and dollar-cost averaging",
      "Paper trading simulator and guided setup",
      "Market commentary and weekly strategy briefings",
    ],
  },
  {
    name: "Standard Trader",
    minDeposit: 1500,
    featured: true,
    description: "Our flagship plan for active traders who want real-time execution across digital assets and equities.",
    icon: Briefcase,
    features: [
      "Access to 3,000+ US stocks and 60+ forex pairs",
      "Advanced charting with execution alerts and trade signals",
      "Priority support, risk dashboard and portfolio analytics",
      "1:200 leverage with tighter spreads on major instruments",
      "Automated stop-loss and profit-taking workflows",
    ],
  },
  {
    name: "Elite Investor",
    minDeposit: 10000,
    featured: false,
    description: "A premium portfolio plan with deeper capital markets exposure, structured risk controls, and analyst insight.",
    icon: Landmark,
    features: [
      "Portfolio rebalancing across stocks, ETFs, crypto and commodities",
      "Dedicated account manager and custom trading allocation models",
      "Expanded leverage and reduced commissions",
      "Private market updates and institutional research briefs",
      "Quarterly portfolio review with macro strategy guidance",
    ],
  },
  {
    name: "US Stocks Plus",
    minDeposit: 5000,
    featured: false,
    description: "Focused on long-term equity growth with dividend tracking, market sentiment tools, and recurring buy plans.",
    icon: Building2,
    features: [
      "Fractional shares on top NASDAQ and NYSE listings",
      "Dividend and earnings calendar tracking",
      "Recurring weekly or monthly investment automation",
      "Portfolio allocation for blue-chip growth and value names",
      "Institutional-grade risk scoring and buy-zone alerts",
    ],
  },
];

const US_STOCK_FEATURES = [
  {
    icon: TrendingUp,
    title: "Fractional investing",
    text: "Build exposure to leading US companies with flexible position sizing and recurring investment contributions.",
  },
  {
    icon: Sparkles,
    title: "AI trade signals",
    text: "Use momentum and trend filters to help identify ideal entry, hold, and exit zones across equities and ETFs.",
  },
  {
    icon: ShieldCheck,
    title: "Capital protection",
    text: "Set automated risk controls, alerts and diversified allocations that keep portfolio volatility under control.",
  },
  {
    icon: Globe2,
    title: "Global market access",
    text: "Trade US equities alongside forex, crypto, commodities and indices from a single enterprise-grade account structure.",
  },
];

const ACCOUNTS = [
  {
    name: "Standard",
    minDeposit: 100,
    featured: false,
    features: [
      "Spreads from 1.2 pips",
      "Up to 1:200 leverage",
      "All asset classes",
      "Free demo account",
      "Email support",
    ],
  },
  {
    name: "Pro",
    minDeposit: 1000,
    featured: true,
    features: [
      "Spreads from 0.2 pips",
      "Up to 1:500 leverage",
      "Priority execution",
      "Free VPS hosting",
      "24/7 priority support",
      "Personal account manager",
    ],
  },
  {
    name: "VIP",
    minDeposit: 25000,
    featured: false,
    features: [
      "Spreads from 0.0 pips",
      "Custom leverage",
      "Direct market access",
      "Dedicated dealer",
      "Reduced commissions",
      "Exclusive market reports",
    ],
  },
];

const TESTIMONIALS = [
  { name: "Sarah K.", role: "Day trader, UK", quote: "Execution speed is night-and-day vs my old broker. The mobile app is genuinely usable for managing live trades." },
  { name: "Marcus T.", role: "Swing trader, US", quote: "Tight spreads, fast withdrawals, no nonsense. I've been trading here for two years and have never had a payout delayed." },
  { name: "Aisha M.", role: "Crypto trader, UAE", quote: "Best of both worlds — I can hedge crypto positions against fiat pairs in the same account. Game changer." },
];
