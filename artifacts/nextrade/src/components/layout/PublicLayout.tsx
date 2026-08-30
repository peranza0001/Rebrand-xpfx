/**
 * PublicLayout
 * ------------
 * Marketing-site chrome used by every public (unauthenticated) page.
 * Provides the top navigation, mobile drawer, and the global footer with
 * regulatory disclosure. The layout never assumes the user is logged in,
 * but if they are, the CTA buttons swap to "Open dashboard".
 */
import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/markets", label: "Markets" },
  { href: "/education", label: "Education" },
  { href: "/calendar", label: "Calendar" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function PublicLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    setOpen(false);
  }, [location]);

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.16),_transparent_30%),linear-gradient(180deg,#07120d_0%,#0b1220_35%,#0f172a_100%)] text-foreground">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/75 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg text-white" data-testid="link-home-brand">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30">
              <TrendingUp className="h-4 w-4" />
            </span>
            <span>XpressPro <span className="text-emerald-400">FX</span></span>
          </Link>

          <nav className="hidden lg:flex items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1">
            {NAV.map((n) => {
              const active = location === n.href;
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={`px-3 py-2 rounded-full text-sm font-medium transition-all ${
                    active ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30" : "text-slate-300 hover:bg-white/5 hover:text-white"
                  }`}
                  data-testid={`link-nav-${n.label.toLowerCase()}`}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>

          <div className="hidden md:flex items-center gap-2">
            {isAuthenticated ? (
              <Button asChild className="rounded-full bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-lg shadow-emerald-500/20" data-testid="button-dashboard">
                <Link href="/dashboard">Open dashboard</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/5" data-testid="button-login">
                  <Link href="/login">Log in</Link>
                </Button>
                <Button asChild className="rounded-full bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-lg shadow-emerald-500/20" data-testid="button-signup">
                  <Link href="/signup">Get started</Link>
                </Button>
              </>
            )}
          </div>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden text-white hover:bg-white/5" data-testid="button-menu">
                {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[85vw] max-w-sm bg-slate-950 text-white border-l border-white/10">
              <div className="flex flex-col gap-1 mt-8">
                {NAV.map((n) => (
                  <Link
                    key={n.href}
                    href={n.href}
                    className="px-3 py-3 rounded-md text-base font-medium text-slate-200 hover:bg-white/5 hover:text-white"
                  >
                    {n.label}
                  </Link>
                ))}
                <div className="border-t border-white/10 mt-3 pt-3 flex flex-col gap-2">
                  {isAuthenticated ? (
                    <Button asChild className="w-full rounded-full bg-emerald-500 text-slate-950 hover:bg-emerald-400">
                      <Link href="/dashboard">Open dashboard</Link>
                    </Button>
                  ) : (
                    <>
                      <Button asChild variant="outline" className="w-full rounded-full border-white/20 text-white hover:bg-white/5">
                        <Link href="/login">Log in</Link>
                      </Button>
                      <Button asChild className="w-full rounded-full bg-emerald-500 text-slate-950 hover:bg-emerald-400">
                        <Link href="/signup">Get started</Link>
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-white/10 bg-slate-950/80 mt-16">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-12 grid gap-8 grid-cols-2 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <div className="font-bold text-lg mb-3 text-white">XpressPro FX</div>
            <p className="text-sm text-slate-300">
              Multi-asset broker offering forex, crypto, indices, commodities, and stocks for retail and professional clients.
            </p>
          </div>
          <FooterCol title="Trade" links={[
            { href: "/markets", label: "Markets" },
            { href: "/markets?tab=forex", label: "Forex" },
            { href: "/markets?tab=crypto", label: "Crypto" },
            { href: "/markets?tab=indices", label: "Indices" },
            { href: "/markets?tab=commodities", label: "Commodities" },
          ]} />
          <FooterCol title="Company" links={[
            { href: "/about", label: "About us" },
            { href: "/education", label: "Education" },
            { href: "/calendar", label: "Economic calendar" },
            { href: "/contact", label: "Contact" },
          ]} />
          <FooterCol title="Legal" links={[
            { href: "/legal?tab=terms", label: "Terms of service" },
            { href: "/legal?tab=privacy", label: "Privacy policy" },
            { href: "/legal?tab=risk", label: "Risk disclosure" },
            { href: "/legal?tab=aml", label: "AML policy" },
          ]} />
        </div>
        <div className="border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 text-xs text-slate-300 space-y-2">
            <p>
              <strong className="text-white">Risk warning:</strong> Trading leveraged products such as CFDs, forex, and cryptocurrencies carries a high level of risk and may not be suitable for all investors. You may lose more than your initial deposit. Please ensure you fully understand the risks involved.
            </p>
            <p>© {new Date().getFullYear()} XpressPro FX. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FooterCol({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <div className="font-semibold mb-3 text-sm">{title}</div>
      <ul className="space-y-2 text-sm">
        {links.map((l) => (
          <li key={l.href + l.label}>
            <Link href={l.href} className="text-muted-foreground hover:text-foreground">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
