import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { LiveChatWidget } from "@/components/live-chat-widget";
import { Shell } from "@/components/layout/Shell";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { AuthProvider, RequireAuth, RequireAdmin, useAuth } from "@/lib/auth";

import { Dashboard } from "@/pages/dashboard";
import { Wallets } from "@/pages/wallets";
import { Trades } from "@/pages/trades";
import { P2PMarket } from "@/pages/p2p";
import { Managers } from "@/pages/managers";
import { Messages } from "@/pages/messages";
import { Assets } from "@/pages/assets";
import { Support } from "@/pages/support";
import { Settings } from "@/pages/settings";
import { Login } from "@/pages/login";
import { Signup } from "@/pages/signup";
import { VerifyOtp } from "@/pages/verify-otp";
import { ConnectWallet } from "@/pages/connect-wallet";
import { Kyc } from "@/pages/kyc";
import { Deposits } from "@/pages/deposits";
import { Withdrawals } from "@/pages/withdrawals";
import { Referrals } from "@/pages/referrals";
import { Banks } from "@/pages/banks";
import { Cards } from "@/pages/cards";
import { Promotions } from "@/pages/promotions";
import { Billing } from "@/pages/billing";
import { Admin } from "@/pages/admin";
import AdminLiveChat from "@/pages/admin-live-chat";
import { Education } from "@/pages/education";
import { SmartVest } from "@/pages/smartvest";
import { Statements } from "@/pages/statements";
import { DemoTradingPage } from "@/pages/demo-trading";
import { Trading } from "@/pages/trading";
import { InvestmentPlans } from "@/pages/investment-plans";
import { CopyTrading } from "@/pages/copy-trading";

import { PublicHome } from "@/pages/public/home";
import { PublicMarkets } from "@/pages/public/markets";
import { PublicEducation } from "@/pages/public/education";
import { PublicCalendar } from "@/pages/public/calendar";
import { PublicAbout } from "@/pages/public/about";
import { PublicContact } from "@/pages/public/contact";
import { PublicLegal } from "@/pages/public/legal";
import { ForgotPassword } from "@/pages/forgot-password";
import { ResetPassword } from "@/pages/reset-password";

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
          <Route path="/demo-trading" component={DemoTradingPage} />
          <Route path="/investment-plans" component={InvestmentPlans} />
          <Route path="/copy-trading" component={CopyTrading} />
          <Route path="/dashboard/markets" component={Dashboard} />
          <Route path="/dashboard/support" component={Support} />
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

      <Route path="/buy"><PublicPage><PublicMarkets /></PublicPage></Route>
      <Route path="/sell"><PublicPage><PublicMarkets /></PublicPage></Route>
      <Route path="/stocks"><PublicPage><PublicMarkets /></PublicPage></Route>
      <Route path="/shares"><PublicPage><PublicMarkets /></PublicPage></Route>
      <Route path="/commodities"><PublicPage><PublicMarkets /></PublicPage></Route>
      <Route path="/signals"><PublicPage><PublicHome /></PublicPage></Route>
      <Route path="/trade"><RequireAuth><Trading /></RequireAuth></Route>
      <Route path="/markets"><PublicPage><PublicMarkets /></PublicPage></Route>
      <Route path="/education"><PublicPage><PublicEducation /></PublicPage></Route>
      <Route path="/demo-trading" component={DemoTradingPage} />
      <Route path="/calendar"><PublicPage><PublicCalendar /></PublicPage></Route>
      <Route path="/about"><PublicPage><PublicAbout /></PublicPage></Route>
      <Route path="/contact"><PublicPage><PublicContact /></PublicPage></Route>
      <Route path="/legal"><PublicPage><PublicLegal /></PublicPage></Route>
      <Route path="/legal/privacy"><PublicPage><PublicLegal /></PublicPage></Route>
      <Route path="/legal/terms"><PublicPage><PublicLegal /></PublicPage></Route>
      <Route path="/dashboard/markets"><RequireAuth><Dashboard /></RequireAuth></Route>
      <Route path="/dashboard/support"><RequireAuth><Support /></RequireAuth></Route>

      <Route path="/" component={RootRoute} />
      <Route component={ProtectedShell} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <AppRoutes />
            <LiveChatWidget />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
