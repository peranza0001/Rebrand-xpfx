/**
 * Public About page
 * -----------------
 * Company story, mission, headline numbers, leadership and regulatory
 * footprint. Pure marketing content.
 */
import { Building2, Globe2, ShieldCheck, TrendingUp, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function PublicAbout() {
  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-10 space-y-14">
      <header className="overflow-hidden rounded-3xl border border-border/80 bg-linear-to-br from-primary/10 via-card to-card p-6 md:p-8">
        <div className="max-w-3xl">
          <Badge variant="outline" className="mb-3">About us</Badge>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Building a better trading experience</h1>
          <p className="mt-3 text-muted-foreground text-lg">
            XpressPro FX was founded in 2014 by a team of ex-institutional traders and engineers with a simple mission: bring the speed, transparency and tooling of professional trading desks to every retail trader.
          </p>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: Users, value: "2.5M+", label: "Active clients" },
          { icon: Globe2, value: "180+", label: "Countries served" },
          { icon: Building2, value: "12", label: "Global offices" },
          { icon: ShieldCheck, value: "5", label: "Tier-1 licenses" },
        ].map(({ icon: Icon, value, label }) => (
          <Card key={label} className="border-border/80 bg-card/80">
            <CardContent className="p-6 text-center">
              <Icon className="mx-auto mb-2 h-7 w-7 text-primary" />
              <div className="text-2xl font-bold">{value}</div>
              <div className="text-xs text-muted-foreground">{label}</div>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="mb-4 text-2xl font-bold tracking-tight">Our mission</h2>
          <p className="mb-4 text-muted-foreground">
            We believe the global financial markets should be fair, fast and accessible. Whether you're placing your first trade or running a quantitative desk, you deserve the same quality of execution and transparency that institutional clients have enjoyed for decades.
          </p>
          <p className="text-muted-foreground">
            That's why we obsess over latency, push for ever-tighter spreads, and invest heavily in education and tooling. Markets reward preparation — we make sure you have what you need to be prepared.
          </p>
        </div>

        <Card className="border-border/80 bg-card/80">
          <CardContent className="p-6">
            <h3 className="mb-3 font-semibold">Regulatory footprint</h3>
            <ul className="space-y-3 text-sm">
              {[
                { region: "United Kingdom", body: "FCA — Financial Conduct Authority" },
                { region: "Australia", body: "ASIC — Australian Securities & Investments Commission" },
                { region: "Cyprus", body: "CySEC — Cyprus Securities and Exchange Commission" },
                { region: "South Africa", body: "FSCA — Financial Sector Conduct Authority" },
                { region: "Seychelles", body: "FSA — Financial Services Authority" },
              ].map((r) => (
                <li key={r.region} className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 text-primary" />
                  <div>
                    <div className="font-medium">{r.region}</div>
                    <div className="text-xs text-muted-foreground">{r.body}</div>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>

      <section>
        <h2 className="mb-6 text-2xl font-bold tracking-tight">Why we exist</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {VALUES.map(({ title, body, icon: Icon }) => (
            <Card key={title} className="border-border/80 bg-card/80">
              <CardContent className="p-5">
                <Icon className="mb-3 h-5 w-5 text-primary" />
                <div className="mb-2 font-semibold">{title}</div>
                <p className="text-sm text-muted-foreground">{body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-6 text-2xl font-bold tracking-tight">Leadership</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {LEADERS.map((l) => (
            <Card key={l.name} className="border-border/80 bg-card/80">
              <CardContent className="p-5 text-center">
                <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 text-lg font-bold text-primary">
                  {l.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div className="font-semibold">{l.name}</div>
                <div className="text-xs text-muted-foreground">{l.role}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

const VALUES = [
  { title: "Execution quality", body: "We engineered low-latency routing and transparent pricing for confident trading decisions.", icon: TrendingUp },
  { title: "Client-first access", body: "Our platform is built to support first-time traders and active professionals with equal care.", icon: Users },
  { title: "Operational trust", body: "From risk controls to support coverage, every workflow is designed around disciplined reliability.", icon: ShieldCheck },
];

const LEADERS = [
  { name: "Jonathan Reyes", role: "Chief Executive Officer" },
  { name: "Priya Anand", role: "Chief Technology Officer" },
  { name: "Marcus Lindqvist", role: "Chief Risk Officer" },
  { name: "Sofia Martinelli", role: "Head of Trading" },
];
