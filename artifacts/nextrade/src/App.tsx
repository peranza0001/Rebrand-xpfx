import React, { Component, lazy, Suspense, type ErrorInfo, type ReactNode } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { LiveChatWidget } from "@/components/live-chat-widget";
import { Shell } from "@/components/layout/Shell";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { AuthProvider, RequireAuth, RequireAdmin, useAuth } from "@/lib/auth";

const Dashboard = lazy(() => import("@/pages/dashboard").then((module) => ({ default: module.Dashboard })));
const Wallets = lazy(() => import("@/pages/wallets").then((module) => ({ default: module.Wallets })));
const Trades = lazy(() => import("@/pages/trades").then((module) => ({ default: module.Trades })));
const P2PMarket = lazy(() => import("@/pages/p2p").then((module) => ({ default: module.P2PMarket })));
const Managers = lazy(() => import("@/pages/managers").then((module) => ({ default: module.Managers })));
const Messages = lazy(() => import("@/pages/messages").then((module) => ({ default: module.Messages })));
const Assets = lazy(() => import("@/pages/assets").then((module) => ({ default: module.Assets })));
const Support = lazy(() => import("@/pages/support").then((module) => ({ default: module.Support })));
const Settings = lazy(() => import("@/pages/settings").then((module) => ({ default: module.Settings })));
const Login = lazy(() => import("@/pages/login").then((module) => ({ default: module.Login })));
const Signup = lazy(() => import("@/pages/signup").then((module) => ({ default: module.Signup })));
const VerifyOtp = lazy(() => import("@/pages/verify-otp").then((module) => ({ default: module.VerifyOtp })));
const ConnectWallet = lazy(() => import("@/pages/connect-wallet").then((module) => ({ default: module.ConnectWallet })));
const Kyc = lazy(() => import("@/pages/kyc").then((module) => ({ default: module.Kyc })));
const Deposits = lazy(() => import("@/pages/deposits").then((module) => ({ default: module.Deposits })));
const Withdrawals = lazy(() => import("@/pages/withdrawals").then((module) => ({ default: module.Withdrawals })));
const Referrals = lazy(() => import("@/pages/referrals").then((module) => ({ default: module.Referrals })));
const Banks = lazy(() => import("@/pages/banks").then((module) => ({ default: module.Banks })));
const Cards = lazy(() => import("@/pages/cards").then((module) => ({ default: module.Cards })));
const Promotions = lazy(() => import("@/pages/promotions").then((module) => ({ default: module.Promotions })));
const Billing = lazy(() => import("@/pages/billing").then((module) => ({ default: module.Billing })));
const Admin = lazy(() => import("@/pages/admin").then((module) => ({ default: module.Admin })));
const AdminLiveChat = lazy(() => import("@/pages/admin-live-chat"));
const Education = lazy(() => import("@/pages/education").then((module) => ({ default: module.Education })));
const SmartVest = lazy(() => import("@/pages/smartvest").then((module) => ({ default: module.SmartVest })));
const Statements = lazy(() => import("@/pages/statements").then((module) => ({ default: module.Statements })));
const DemoTradingPage = lazy(() => import("@/pages/demo-trading").then((module) => ({ default: module.DemoTradingPage })));
const Trading = lazy(() => import("@/pages/trading").then((module) => ({ default: module.Trading })));
const InvestmentPlans = lazy(() => import("@/pages/investment-plans").then((module) => ({ default: module.InvestmentPlans })));
const CopyTrading = lazy(() => import("@/pages/copy-trading").then((module) => ({ default: module.CopyTrading })));

const PublicHome = lazy(() => import("@/pages/public/home").then((module) => ({ default: module.PublicHome })));
const PublicMarkets = lazy(() => import("@/pages/public/markets").then((module) => ({ default: module.PublicMarkets })));
const PublicEducation = lazy(() => import("@/pages/public/education").then((module) => ({ default: module.PublicEducation })));
const PublicCalendar = lazy(() => import("@/pages/public/calendar").then((module) => ({ default: module.PublicCalendar })));
const PublicAbout = lazy(() => import("@/pages/public/about").then((module) => ({ default: module.PublicAbout })));
const PublicContact = lazy(() => import("@/pages/public/contact").then((module) => ({ default: module.PublicContact })));
const PublicLegal = lazy(() => import("@/pages/public/legal").then((module) => ({ default: module.PublicLegal })));
const ForgotPassword = lazy(() => import("@/pages/forgot-password").then((module) => ({ default: module.ForgotPassword })));
const ResetPassword = lazy(() => import("@/pages/reset-password").then((module) => ({ default: module.ResetPassword })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedShell() {
  return (
    <RequireAuth>
      <Shell>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/wallets" component={Wallets} />
          <Route path="/trades" component={Trades} />
          <Route path="/p2p" component={P2PMarket} />
          <Route path="/managers" component={Managers} />
          <Route path="/messages" component={Messages} />
          <Route path="/assets" component={Assets} />
          <Route path="/support" component={Support} />
          <Route path="/settings" component={Settings} />
          <Route path="/kyc" component={Kyc} />
          <Route path="/deposits" component={Deposits} />
          <Route path="/withdrawals" component={Withdrawals} />
          <Route path="/referrals" component={Referrals} />
          <Route path="/banks" component={Banks} />
          <Route path="/cards" component={Cards} />
          <Route path="/promotions" component={Promotions} />
          <Route path="/billing" component={Billing} />
          <Route path="/smartvest" component={SmartVest} />
          <Route path="/statements" component={Statements} />
          <Route path="/trading" component={Trading} />
          <Route path="/trade" component={Trading} />
          <Route path="/copy-trading" component={CopyTrading} />
          <Route path="/demo-trading" component={DemoTradingPage} />
          <Route path="/investment-plans" component={InvestmentPlans} />
          <Route path="/education/*" component={Education} />
          <Route path="/admin">
            <RequireAdmin>
              <Admin />
            </RequireAdmin>
          </Route>
          <Route path="/admin/live-chat">
            <RequireAdmin>
              <AdminLiveChat />
            </RequireAdmin>
          </Route>
          <Route component={NotFound} />
        </Switch>
      </Shell>
    </RequireAuth>
  );
}

/**
 * Renders the marketing landing page for visitors and the dashboard shell
 * for authenticated users — all behind the `/` route.
 */
function RootRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) {
    return (
      <PublicLayout>
        <PublicHome />
      </PublicLayout>
    );
  }
  if (isAuthenticated) return <ProtectedShell />;
  return (
    <PublicLayout>
      <PublicHome />
    </PublicLayout>
  );
}

function PublicPage({ children }: { children: React.ReactNode }) {
  return <PublicLayout>{children}</PublicLayout>;
}

function PublicMarketAlias({ tab }: { tab: string }) {
  return (
    <PublicPage>
      <PublicMarkets defaultTab={tab as "forex" | "crypto" | "indices" | "commodities" | "stocks"} />
    </PublicPage>
  );
}

function AppRoutes() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      <Route path="/register" component={Signup} />
      <Route path="/verify-otp" component={VerifyOtp} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/connect-wallet">
        <RequireAuth>
          <ConnectWallet />
        </RequireAuth>
      </Route>

      <Route path="/stocks"><PublicMarketAlias tab="stocks" /></Route>
      <Route path="/shares"><PublicMarketAlias tab="stocks" /></Route>
      <Route path="/commodities"><PublicMarketAlias tab="commodities" /></Route>
      <Route path="/signals"><PublicMarketAlias tab="indices" /></Route>
      <Route path="/dashboard/markets"><PublicMarketAlias tab="forex" /></Route>
      <Route path="/dashboard/support">
        <RequireAuth><Support /></RequireAuth>
      </Route>
      <Route path="/trade">
        <RequireAuth><Trading /></RequireAuth>
      </Route>
      <Route path="/buy">
        <RequireAuth><Trading /></RequireAuth>
      </Route>
      <Route path="/sell">
        <RequireAuth><Trading /></RequireAuth>
      </Route>
      <Route path="/copy-trading">
        <RequireAuth><CopyTrading /></RequireAuth>
      </Route>

      <Route path="/markets"><PublicPage><PublicMarkets /></PublicPage></Route>
      <Route path="/education"><PublicPage><PublicEducation /></PublicPage></Route>
      <Route path="/demo-trading" component={DemoTradingPage} />
      <Route path="/calendar"><PublicPage><PublicCalendar /></PublicPage></Route>
      <Route path="/about"><PublicPage><PublicAbout /></PublicPage></Route>
      <Route path="/contact"><PublicPage><PublicContact /></PublicPage></Route>
      <Route path="/legal"><PublicPage><PublicLegal /></PublicPage></Route>

      <Route path="/" component={RootRoute} />
      <Route component={ProtectedShell} />
    </Switch>
  );
}

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  hasError: boolean;
};

class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Application render error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
          <div className="max-w-md rounded-lg border border-border bg-card p-8 text-center shadow-sm">
            <div className="mb-4 text-4xl">⚠️</div>
            <h1 className="text-xl font-semibold">Something went wrong</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              The app failed to render. Please refresh the page and try again.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AuthProvider>
              <Suspense
                fallback={
                  <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
                    Loading...
                  </div>
                }
              >
                <AppRoutes />
              </Suspense>
              <LiveChatWidget />
            </AuthProvider>
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </AppErrorBoundary>
  );
}

export default App;
