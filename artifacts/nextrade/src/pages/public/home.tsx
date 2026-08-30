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
            <Badge variant="outline" className="mb-4 border-emerald-400/30 bg-emerald-500/10 text-emerald-300">Regulated multi-asset broker</Badge>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight text-white">
              Trade the world's<br />
              markets, the smart way.
            </h1>
            <p className="mt-5 text-lg text-slate-300 max-w-xl">
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
            <Card className="border-white/10 bg-slate-950/60 shadow-2xl shadow-emerald-950/10">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base text-white">Live markets</CardTitle>
                  <Badge variant="secondary" className="font-mono border-emerald-400/30 bg-emerald-500/10 text-emerald-300">LIVE</Badge>
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
            <Card key={plan.name} className={plan.featured ? "border-emerald-400/30 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.18),_transparent_30%),linear-gradient(180deg,rgba(15,23,42,0.96),rgba(9,14,22,0.98))] shadow-xl shadow-emerald-950/15" : "border-white/10 bg-slate-950/40 shadow-lg shadow-slate-950/10"}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <plan.icon className="h-4 w-4 text-emerald-300" />
                    <CardTitle className="text-lg text-white">{plan.name}</CardTitle>
                  </div>
                  {plan.featured && <Badge className="border-emerald-400/30 bg-emerald-500/10 text-emerald-300">Featured</Badge>}
                </div>
                <div className="mt-3 text-3xl font-bold text-white">${plan.minDeposit}</div>
                <div className="text-xs text-slate-400">starting deposit</div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-slate-300">{plan.description}</p>
                <ul className="space-y-2 text-sm text-slate-200">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 text-emerald-300 shrink-0" />
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
                      <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
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
        <div className="max-w-7xl mx-auto rounded-[28px] border border-emerald-400/30 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.18),_transparent_30%),linear-gradient(135deg,rgba(5,12,16,0.98),rgba(15,23,42,0.92))] p-8 md:p-14 text-center shadow-2xl shadow-emerald-950/10">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white">Ready to start trading?</h2>
          <p className="mt-3 text-slate-300 max-w-xl mx-auto">
            Open a free account in under 3 minutes. No commitment, no hidden fees.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 justify-center">
            <Button asChild size="lg" className="bg-emerald-500 text-slate-950 hover:bg-emerald-400"><Link href="/signup">Create live account</Link></Button>
            <Button asChild size="lg" variant="outline" className="border-white/15 text-white hover:bg-white/5"><Link href="/login">Try demo</Link></Button>
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
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white">{title}</h2>
          {subtitle && <p className="mt-2 text-slate-300">{subtitle}</p>}
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
    name: "Starter Spark",
    minDeposit: 300,
    featured: false,
    description: "Low-volatility entry strategy for new investors seeking steady compounding and a clear onboarding path.",
    icon: Rocket,
    features: [
      "Exclusive new-user pricing",
      "Locked daily profit accrual",
      "Low-volatility compounding",
      "Passive strategy automation",
      "Beginner-friendly onboarding",
    ],
  },
  {
    name: "Growth Core",
    minDeposit: 3000,
    featured: false,
    description: "A balanced growth engine built for consistent capital acceleration and portfolio diversification.",
    icon: Briefcase,
    features: [
      "Core capital acceleration",
      "Portfolio balancing",
      "Weekly strategy automation",
      "Low to medium risk profile",
      "Multi-asset execution",
    ],
  },
  {
    name: "Momentum Pulse",
    minDeposit: 10000,
    featured: true,
    description: "Momentum-driven allocation strategy optimized for traders who want stronger acceleration with controlled exposure.",
    icon: TrendingUp,
    features: [
      "Momentum trading execution",
      "$10k+ efficiency boost",
      "Short-cycle re-entry logic",
      "Precision market timing",
      "Active monitoring",
    ],
  },
  {
    name: "Alpha Forge",
    minDeposit: 25000,
    featured: false,
    description: "High-conviction signal model that scales with disciplined risk controls and active allocation management.",
    icon: Zap,
    features: [
      "Scaling model exposure",
      "Risk-managed compounding",
      "Alpha signal overlay",
      "Higher-frequency execution",
      "Managed trader oversight",
    ],
  },
  {
    name: "Precision Nexus",
    minDeposit: 60000,
    featured: false,
    description: "Multi-factor portfolio management designed for precision execution and stronger compounding power.",
    icon: BarChart3,
    features: [
      "Multi-factor strategy",
      "Higher frequency compounding",
      "Precision execution control",
      "Professional risk scoring",
      "Targeted rebalance model",
    ],
  },
  {
    name: "Quant Dominion",
    minDeposit: 150000,
    featured: false,
    description: "Institutional-grade automation focused on daily generation and scalable quantitative control.",
    icon: Landmark,
    features: [
      "Institutional-grade automation",
      "Quantitative signal layering",
      "Higher daily generation",
      "Advanced portfolio controls",
      "Performance rebalancing",
    ],
  },
  {
    name: "Institutional Apex",
    minDeposit: 350000,
    featured: false,
    description: "Apex-level program for larger capital allocations with extended duration and strategic oversight.",
    icon: ShieldCheck,
    features: [
      "Institutional reallocation",
      "Extended duration capital efficiency",
      "Strategic account oversight",
      "Optimized execution mix",
      "Significant capital deployment",
    ],
  },
  {
    name: "Sovereign Vector",
    minDeposit: 800000,
    featured: false,
    description: "High-capacity capital strategy tuned for sovereign-level throughput and long-horizon efficiency.",
    icon: Building2,
    features: [
      "Sovereign capital allocation",
      "Maximum throughput efficiency",
      "Long-horizon programming",
      "High-value portfolio strategy",
      "Dedicated trading oversight",
    ],
  },
  {
    name: "Elite Horizon",
    minDeposit: 2000000,
    featured: false,
    description: "Elite long-horizon strategy engineered for exceptional compounding across a larger runway.",
    icon: Briefcase,
    features: [
      "Elite compounding runway",
      "High-capital efficiency",
      "Long-duration exposure",
      "Senior strategy management",
      "Enhanced capital deployment",
    ],
  },
  {
    name: "Apex Legacy",
    minDeposit: 5000000,
    featured: false,
    description: "Legacy apex allocation for high-net-worth participants seeking extended capital efficiency and premium priority.",
    icon: Landmark,
    features: [
      "Legacy apex tier",
      "High-net-worth prioritization",
      "Maximum daily efficiency",
      "Priority account handling",
      "Premium allocation review",
    ],
  },
  {
    name: "Titan Reserve",
    minDeposit: 10000000,
    featured: false,
    description: "Reserve-tier strategy for large capital positions seeking long-duration return optimization.",
    icon: Rocket,
    features: [
      "Reserve capital expansion",
      "Extended multi-quarter runway",
      "Peak efficiency tier",
      "Capital preservation strategy",
      "Long-term rebalancing",
    ],
  },
  {
    name: "Infinity Protocol",
    minDeposit: 20000000,
    featured: false,
    description: "Flagship long-horizon strategy built for the ultimate tier of capital efficiency and strategic execution.",
    icon: ShieldCheck,
    features: [
      "Flagship long-horizon strategy",
      "Ultimate efficiency",
      "Maximum tier performance",
      "Institutional reserve flow",
      "Executive-level oversight",
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
