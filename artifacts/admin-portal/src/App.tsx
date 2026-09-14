import { useEffect, useState } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { LoginPage } from "@/pages/login";
import { DashboardPage } from "@/pages/dashboard";
import { UsersPage } from "@/pages/users";
import { UserDetailPage } from "@/pages/user-detail";
import { GasFeePage } from "@/pages/gas-fee";
import { LiveChatPage } from "@/pages/live-chat";
import { MailboxPage } from "@/pages/mailbox";
import { BillingPage } from "@/pages/billing-admin";
import { PlatformSettingsPage } from "@/pages/platform-settings";
import { AssetsPage } from "@/pages/assets";
import { TradesPage } from "@/pages/trades";
import { DepositsPage } from "@/pages/deposits";
import { KycPage } from "@/pages/kyc";
import { WithdrawalsPage } from "@/pages/withdrawals";
import { P2PMerchantsPage } from "@/pages/p2p-merchants";
import { AdminNotificationsPage } from "@/pages/admin-notifications";
import {
  DesktopSidebar,
  MobileSidebar,
  TopAppBar,
  getActivePage,
} from "@/components/sidebar";
import { useGetCurrentUser } from "@workspace/api-client-react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

function AdminLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [location] = useLocation();
  const active = getActivePage(location);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <DesktopSidebar />
      <MobileSidebar open={open} onOpenChange={setOpen} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopAppBar title={active.label} onMenu={() => setOpen(true)} />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading, isError } = useGetCurrentUser();
  const [, navigate] = useLocation();
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";

  useEffect(() => {
    if (!isLoading && (isError || !user || !isAdmin)) {
      navigate("/login");
    }
  }, [isLoading, isError, user, isAdmin, navigate]);

  if (isLoading || isError || !user || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground text-sm">Loading...</div>
      </div>
    );
  }

  return <>{children}</>;
}

function Protected({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <AdminLayout>{children}</AdminLayout>
    </AuthGuard>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/">
        {() => (
          <Protected>
            <DashboardPage />
          </Protected>
        )}
      </Route>
      <Route path="/users">
        {() => (
          <Protected>
            <UsersPage />
          </Protected>
        )}
      </Route>
      <Route path="/users/:userId">
        {(params) => (
          <Protected>
            <UserDetailPage userId={params.userId} />
          </Protected>
        )}
      </Route>
      <Route path="/gas-fee">
        {() => (
          <Protected>
            <GasFeePage />
          </Protected>
        )}
      </Route>
      <Route path="/live-chat">
        {() => (
          <Protected>
            <LiveChatPage />
          </Protected>
        )}
      </Route>
      <Route path="/mailbox">
        {() => (
          <Protected>
            <MailboxPage />
          </Protected>
        )}
      </Route>
      <Route path="/billing">
        {() => (
          <Protected>
            <BillingPage />
          </Protected>
        )}
      </Route>
      <Route path="/platform-settings">
        {() => (
          <Protected>
            <PlatformSettingsPage />
          </Protected>
        )}
      </Route>
      <Route path="/assets">
        {() => (
          <Protected>
            <AssetsPage />
          </Protected>
        )}
      </Route>
      <Route path="/trades">
        {() => (
          <Protected>
            <TradesPage />
          </Protected>
        )}
      </Route>
      <Route path="/deposits">
        {() => (
          <Protected>
            <DepositsPage />
          </Protected>
        )}
      </Route>
      <Route path="/kyc">
        {() => (
          <Protected>
            <KycPage />
          </Protected>
        )}
      </Route>
      <Route path="/withdrawals">
        {() => (
          <Protected>
            <WithdrawalsPage />
          </Protected>
        )}
      </Route>
      <Route path="/p2p-merchants">
        {() => (
          <Protected>
            <P2PMerchantsPage />
          </Protected>
        )}
      </Route>
      <Route path="/notifications">
        {() => (
          <Protected>
            <AdminNotificationsPage />
          </Protected>
        )}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
