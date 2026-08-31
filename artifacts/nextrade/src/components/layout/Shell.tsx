/**
 * Shell
 * -----
 * Application chrome shared by every authenticated page. Renders:
 *
 *   - A vertical sidebar with three nav groups (primary, account, admin),
 *     plus a Settings link pinned to the bottom.
 *   - A top header with the demo-mode badge, the signed-in user's avatar,
 *     and a logout button.
 *   - A scrollable main content area into which the active route renders.
 *
 * Responsive behaviour
 * --------------------
 * The sidebar is permanently visible from the `md` breakpoint upwards. On
 * smaller screens it collapses entirely and is replaced by a hamburger
 * button in the header that opens the same nav inside a `Sheet` drawer.
 * This keeps a single source of truth for the navigation structure
 * (`primaryNav`, `accountNav`) while still working on phones.
 */
import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Wallet,
  LineChart,
  FileText,
  ArrowLeftRight,
  Users,
  MessageSquare,
  Package,
  LifeBuoy,
  Settings,
  ShieldCheck,
  ArrowDownToLine,
  ArrowUpToLine,
  Gift,
  Landmark,
  CreditCard,
  Sparkles,
  ShieldAlert,
  LogOut,
  Menu,
  Receipt,
  BarChart3,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import {
  useLogout,
  useGetP2PNotifications,
  getGetSessionQueryKey,
  getGetP2PNotificationsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme-toggle";

/** Type of a single sidebar navigation entry. */
type NavItem = {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

/** A labelled group of navigation entries shown in the sidebar. */
type NavGroup = {
  label: string;
  items: NavItem[];
};

/**
 * Sidebar navigation, grouped by purpose. The order here defines the
 * order shown on screen. Each group renders with a small caption header
 * to aid scanning.
 */
const navGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { name: "Dashboard", href: "/", icon: LayoutDashboard },
      { name: "Wallets", href: "/wallets", icon: Wallet },
      { name: "Assets", href: "/assets", icon: Package },
      { name: "Statements", href: "/statements", icon: FileText },
    ],
  },
  {
    label: "Trading",
    items: [
      { name: "Trades", href: "/trades", icon: LineChart },
      { name: "Demo Trading", href: "/demo-trading", icon: BarChart3 },
      { name: "Copy Trading", href: "/copy-trading", icon: TrendingUp },
      { name: "P2P Market", href: "/p2p", icon: ArrowLeftRight },
      { name: "Trade Manager", href: "/managers", icon: Users },
      { name: "Messages", href: "/messages", icon: MessageSquare },
    ],
  },
  {
    label: "Funds",
    items: [
      { name: "Deposits", href: "/deposits", icon: ArrowDownToLine },
      { name: "Withdrawals", href: "/withdrawals", icon: ArrowUpToLine },
      { name: "Bank Accounts", href: "/banks", icon: Landmark },
      { name: "Cards", href: "/cards", icon: CreditCard },
      { name: "Monthly Billing", href: "/billing", icon: Receipt },
    ],
  },
  {
    label: "Account",
    items: [
      { name: "KYC", href: "/kyc", icon: ShieldCheck },
      { name: "Promotions", href: "/promotions", icon: Sparkles },
      { name: "Referrals", href: "/referrals", icon: Gift },
      { name: "Support", href: "/support", icon: LifeBuoy },
    ],
  },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { user, isDemo, isAdmin } = useAuth();
  const logoutMutation = useLogout();
  const queryClient = useQueryClient();
  const { data: p2pNotifsResp } = useGetP2PNotifications({
    query: {
      enabled: !!user,
      refetchInterval: 30000,
      queryKey: getGetP2PNotificationsQueryKey(),
    },
  });
  const p2pUnread = p2pNotifsResp?.unreadCount ?? 0;
  // Controls the mobile drawer. Closed automatically whenever a link is
  // clicked, so the user lands on the new page without an open sheet.
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
    } finally {
      await queryClient.invalidateQueries({ queryKey: getGetSessionQueryKey() });
      setLocation("/login");
    }
  };

  const initials = (user?.fullName ?? "U")
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  /**
   * Renders one nav section. `onNavigate` is invoked after a link is
   * clicked; the mobile drawer uses it to close itself.
   */
  const renderNav = (items: NavItem[], onNavigate?: () => void) =>
    items.map((item) => {
      const isActive =
        location === item.href || (item.href !== "/" && location.startsWith(item.href));
      const showP2PBadge = item.href === "/p2p" && p2pUnread > 0;
      return (
        <Link
          key={item.name}
          href={item.href}
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
            isActive
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
          )}
          data-testid={item.href === "/p2p" ? "nav-p2p" : undefined}
        >
          <item.icon className="h-4 w-4" />
          <span className="flex-1">{item.name}</span>
          {showP2PBadge && (
            <Badge
              variant="default"
              className="ml-auto h-5 min-w-5 px-1.5 text-[10px] tabular-nums"
              data-testid="badge-p2p-unread"
            >
              {p2pUnread > 99 ? "99+" : p2pUnread}
            </Badge>
          )}
        </Link>
      );
    });

  /**
   * Shared sidebar body, used by both the persistent desktop sidebar and
   * the mobile sheet. `onNavigate` is forwarded so mobile taps close the
   * drawer.
   */
  const sidebarContent = (onNavigate?: () => void) => (
    <>
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {navGroups.map((group, idx) => (
          <div
            key={group.label}
            className={cn("space-y-1", idx > 0 && "mt-4 pt-4 border-t border-border")}
          >
            <div className="px-3 pt-1 pb-1.5 text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold">
              {group.label}
            </div>
            {renderNav(group.items, onNavigate)}
          </div>
        ))}
        {isAdmin && (
          <div className="mt-4 pt-4 border-t border-border space-y-1">
            <div className="px-3 pt-1 pb-1.5 text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold">
              Admin
            </div>
            <Link
              href="/admin"
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                location.startsWith("/admin")
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
              data-testid="link-admin-console"
            >
              <ShieldAlert className="h-4 w-4" />
              Admin console
            </Link>
          </div>
        )}
      </nav>
      <div className="p-4 border-t border-border">
        <Link
          href="/settings"
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
            location.startsWith("/settings")
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
          )}
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
      </div>
    </>
  );

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.20),transparent_18%),linear-gradient(180deg,#07120d_0%,#0b1220_28%,#0f172a_100%)] text-white">
      {/* Desktop sidebar (hidden below md) */}
      <aside className="hidden md:flex w-72 border-r border-white/10 bg-slate-950/70 backdrop-blur-xl flex-col">
        <div className="h-16 flex items-center px-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30">
              <BarChart3 className="h-4 w-4" />
            </div>
            <div>
              <div className="text-lg font-bold tracking-tight text-white">XpressPro</div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-emerald-300/80">FX</div>
            </div>
          </div>
        </div>
        {sidebarContent()}
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden min-w-0 bg-slate-950/20">
        <header className="h-16 border-b border-white/10 bg-slate-950/40 backdrop-blur-xl flex items-center justify-between px-4 md:px-6 gap-3">
          {/* Mobile menu button + brand */}
          <div className="flex items-center gap-3 md:hidden min-w-0">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Open navigation"
                  className="text-white hover:bg-white/5"
                  data-testid="button-mobile-menu"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0 flex flex-col bg-slate-950 text-white border-r border-white/10">
                <SheetHeader className="h-16 border-b border-white/10 px-6 flex items-center justify-start">
                  <SheetTitle className="text-white text-lg font-bold tracking-tight text-left">
                    XpressPro FX
                  </SheetTitle>
                </SheetHeader>
                {sidebarContent(() => setMobileOpen(false))}
              </SheetContent>
            </Sheet>
            <span className="text-base font-bold text-white tracking-tight truncate">
              XpressPro FX
            </span>
          </div>

          <div className="flex items-center gap-2 md:gap-4 ml-auto">
            <ThemeToggle />
            {isDemo && (
              <Badge
                variant="secondary"
                className="uppercase tracking-wider hidden sm:inline-flex border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
              >
                Demo mode
              </Badge>
            )}
            {user && (
              <div className="flex items-center gap-2 min-w-0 rounded-full border border-white/10 bg-white/5 px-2 py-1.5">
                <div className="h-8 w-8 shrink-0 rounded-full bg-emerald-500/15 ring-1 ring-emerald-400/30 flex items-center justify-center text-emerald-300 font-bold text-xs">
                  {initials}
                </div>
                <div className="hidden md:flex flex-col leading-tight min-w-0">
                  <span className="text-sm font-medium truncate text-white">
                    {user.fullName}
                  </span>
                  <span className="text-[11px] text-slate-300 truncate">
                    {user.email}
                  </span>
                </div>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
              className="text-slate-200 hover:bg-white/5 hover:text-white"
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Logout</span>
            </Button>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto bg-transparent">{children}</div>
      </main>
    </div>
  );
}
