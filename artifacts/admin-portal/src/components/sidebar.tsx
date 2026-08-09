import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Fuel,
  MessageCircle,
  Mail,
  CreditCard,
  LogOut,
  Shield,
  Settings,
  Coins,
  TrendingUp,
  Store,
  Bell,
  Menu,
  Banknote,
  BadgeCheck,
  HandCoins,
} from "lucide-react";
import {
  useLogout,
  useGetCurrentUser,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { ThemeToggle } from "@/components/theme-toggle";

export const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/users", label: "Users", icon: Users },
  { href: "/trades", label: "Trades", icon: TrendingUp },
  { href: "/deposits", label: "Deposits", icon: Banknote },
  { href: "/withdrawals", label: "Withdrawals", icon: HandCoins },
  { href: "/kyc", label: "KYC", icon: BadgeCheck },
  { href: "/assets", label: "Assets", icon: Coins },
  { href: "/p2p-merchants", label: "P2P Merchants", icon: Store },
  { href: "/gas-fee", label: "Gas Fee", icon: Fuel },
  { href: "/live-chat", label: "Live Chat", icon: MessageCircle },
  { href: "/mailbox", label: "Mailbox", icon: Mail },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/billing", label: "Billing", icon: CreditCard },
  { href: "/platform-settings", label: "Settings", icon: Settings },
] as const;

export function getActivePage(location: string) {
  return (
    NAV.find(({ href }) =>
      href === "/" ? location === "/" : location.startsWith(href),
    ) ?? NAV[0]
  );
}

type Variant = "full" | "rail";

function NavList({
  variant,
  onNavigate,
}: {
  variant: Variant;
  onNavigate?: () => void;
}) {
  const [location, navigate] = useLocation();
  return (
    <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active =
          href === "/" ? location === "/" : location.startsWith(href);
        const go = () => {
          navigate(href);
          onNavigate?.();
        };
        if (variant === "rail") {
          return (
            <button
              key={href}
              onClick={go}
              title={label}
              aria-label={label}
              className={cn(
                "flex h-10 w-full items-center justify-center rounded-md transition-colors",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon className="h-4.5 w-4.5" />
            </button>
          );
        }
        return (
          <button
            key={href}
            onClick={go}
            className={cn(
              "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function SidebarBody({
  variant,
  onNavigate,
}: {
  variant: Variant;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      {variant === "full" ? (
        <div className="flex items-center gap-2.5 border-b border-sidebar-border px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Shield className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold leading-tight text-sidebar-foreground">
              XpressPro FX
            </p>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Admin Portal
            </p>
          </div>
        </div>
      ) : (
        <div className="flex h-14 items-center justify-center border-b border-sidebar-border">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Shield className="h-4 w-4 text-primary-foreground" />
          </div>
        </div>
      )}
      <NavList variant={variant} onNavigate={onNavigate} />
    </div>
  );
}

/** Persistent rail on tablet (icons only) and full sidebar on desktop. */
export function DesktopSidebar() {
  return (
    <>
      <aside className="hidden w-16 flex-shrink-0 border-r border-sidebar-border md:block lg:hidden">
        <SidebarBody variant="rail" />
      </aside>
      <aside className="hidden w-60 flex-shrink-0 border-r border-sidebar-border lg:block">
        <SidebarBody variant="full" />
      </aside>
    </>
  );
}

export function MobileSidebar({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div
        className="absolute inset-0 bg-black/70"
        onClick={() => onOpenChange(false)}
      />
      <div className="absolute inset-y-0 left-0 w-64 max-w-[85vw] border-r border-sidebar-border shadow-2xl">
        <SidebarBody
          variant="full"
          onNavigate={() => onOpenChange(false)}
        />
      </div>
    </div>
  );
}

function EnvPill() {
  const env = (import.meta.env.MODE ?? "development").toLowerCase();
  const isProd = env === "production";
  return (
    <span
      className={cn(
        "hidden items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider sm:inline-flex",
        isProd
          ? "border-primary/30 bg-primary/10 text-primary"
          : "border-yellow-500/30 bg-yellow-500/10 text-yellow-400",
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          isProd ? "bg-primary" : "bg-yellow-400",
        )}
      />
      {isProd ? "Live" : "Sandbox"}
    </span>
  );
}

function UserMenu() {
  const { data: user } = useGetCurrentUser();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [, navigate] = useLocation();
  const logoutMutation = useLogout();
  const qc = useQueryClient();

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
    qc.clear();
    navigate("/login");
  };

  const u = (user as { user?: { fullName?: string; email?: string } })?.user;
  const name = u?.fullName ?? "Administrator";
  const email = u?.email ?? "";
  const initial = (name[0] ?? "A").toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-md p-1 pr-2 hover:bg-accent"
        aria-label="Account menu"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
          {initial}
        </div>
        <div className="hidden text-left sm:block">
          <p className="max-w-[140px] truncate text-xs font-semibold leading-tight text-foreground">
            {name}
          </p>
          <p className="max-w-[140px] truncate text-[11px] leading-tight text-muted-foreground">
            {email}
          </p>
        </div>
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-56 overflow-hidden rounded-md border border-border bg-popover shadow-lg">
          <div className="border-b border-border px-3 py-2 sm:hidden">
            <p className="truncate text-xs font-semibold text-foreground">{name}</p>
            <p className="truncate text-[11px] text-muted-foreground">{email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent"
          >
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        </div>
      )}
    </div>
  );
}

/** Persistent top app bar across mobile/tablet/desktop. */
export function TopAppBar({
  title,
  onMenu,
}: {
  title: string;
  onMenu: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/95 px-3 backdrop-blur sm:px-5">
      <button
        type="button"
        onClick={onMenu}
        className="-ml-1 flex h-9 w-9 items-center justify-center rounded-md text-foreground hover:bg-accent md:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>
      <div className="flex items-center gap-2 md:hidden">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
          <Shield className="h-3.5 w-3.5 text-primary-foreground" />
        </div>
      </div>
      <h1 className="truncate text-sm font-semibold text-foreground md:text-base">
        {title}
      </h1>
      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <ThemeToggle />
        <EnvPill />
        <UserMenu />
      </div>
    </header>
  );
}

