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
import { ArrowUpRight, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth";

const NAV = [{ href: "/markets", label: "Markets" }, { href: "/education", label: "Learn" }, { href: "/about", label: "Company" }, { href: "/contact", label: "Support" }];

export function PublicLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    setOpen(false);
  }, [location]);

  return (
    <div className="public-site min-h-dvh flex flex-col bg-background text-foreground">
      <header className="public-header sticky top-0 z-40">
        <div className="public-container flex h-19 items-center justify-between gap-6">
          <Link href="/" className="public-brand" data-testid="link-home-brand">
            <span className="public-brand-mark">xp</span><span>XpressPro <em>FX</em></span>
          </Link>

          <nav className="hidden md:flex items-center gap-8" aria-label="Primary navigation">
            {NAV.map((n) => <Link key={n.href} href={n.href} className={`public-nav-link ${location === n.href ? "is-active" : ""}`}>{n.label}</Link>)}
          </nav>

          <div className="hidden md:flex items-center gap-2">
            {isAuthenticated ? (
              <Button asChild className="public-button public-button-solid"><Link href="/dashboard">Open platform <ArrowUpRight /></Link></Button>
            ) : (
              <>
                <Link href="/login" className="public-nav-link">Log in</Link>
                <Button asChild className="public-button public-button-solid"><Link href="/signup">Get started <ArrowUpRight /></Link></Button>
              </>
            )}
          </div>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden text-foreground" aria-label="Open navigation" data-testid="button-menu">
                {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="public-mobile-menu">
              <div className="flex flex-col gap-2 mt-10">
                {NAV.map((n) => <Link key={n.href} href={n.href} className="public-mobile-link">{n.label}</Link>)}
                <div className="border-t border-white/10 mt-5 pt-5 flex flex-col gap-3">
                  {isAuthenticated ? (
                    <Button asChild className="public-button public-button-solid w-full"><Link href="/dashboard">Open platform</Link></Button>
                  ) : (
                    <>
                      <Button asChild variant="outline" className="w-full"><Link href="/login">Log in</Link></Button>
                      <Button asChild className="public-button public-button-solid w-full"><Link href="/signup">Get started <ArrowUpRight /></Link></Button>
                    </>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="public-footer">
        <div className="public-container grid gap-12 py-16 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <div className="public-brand mb-5"><span className="public-brand-mark">xp</span><span>XpressPro <em>FX</em></span></div>
            <p className="max-w-xs text-sm leading-6 text-white/45">A clearer way to explore global markets, built around disciplined decisions and transparent tools.</p>
          </div>
          <FooterCol title="Explore" links={[["/markets", "Markets"], ["/education", "Education"], ["/calendar", "Market calendar"]]} />
          <FooterCol title="Company" links={[["/about", "About us"], ["/contact", "Contact"], ["/legal", "Legal centre"]]} />
          <FooterCol title="Account" links={[["/login", "Log in"], ["/signup", "Open account"], ["/demo-trading", "Demo trading"]]} />
        </div>
        <div className="public-container border-t border-white/10 py-6 text-xs leading-5 text-white/35">Trading involves risk. The value of investments can go down as well as up. Review the risk disclosure and product terms before making an investment decision.<br />© {new Date().getFullYear()} XpressPro FX. All rights reserved.</div>
      </footer>
    </div>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) { return <div><h3 className="mb-5 text-xs font-semibold uppercase tracking-[0.2em] text-white/40">{title}</h3><div className="space-y-3">{links.map(([href, label]) => <Link key={href} href={href} className="block text-sm text-white/65 transition-colors hover:text-primary">{label}</Link>)}</div></div>; }
