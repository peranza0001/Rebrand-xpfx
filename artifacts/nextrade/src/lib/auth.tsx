import { createContext, useContext, ReactNode, useEffect } from "react";
import {
  useGetSession,
  useGetConnectedWallets,
  getGetConnectedWalletsQueryKey,
  AuthSession,
} from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";

interface AuthContextType {
  session: AuthSession | undefined;
  user: AuthSession["user"] | null;
  role: AuthSession["role"] | "guest";
  isDemo: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  walletSkipped: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, isLoading, isError } = useGetSession();
  const resolvedSession = isError ? undefined : session;

  const value: AuthContextType = {
    session: resolvedSession,
    user: resolvedSession?.user ?? null,
    role: resolvedSession?.role ?? "guest",
    isDemo: resolvedSession?.isDemo ?? false,
    isLoading,
    isAuthenticated: !!resolvedSession?.user,
    isAdmin: resolvedSession?.role === "admin",
    walletSkipped: resolvedSession?.walletSkipped ?? false,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Routes exempt from the connect-wallet gate.
const _WALLET_GATE_EXEMPT_PATHS = new Set<string>([
  "/connect-wallet",
  "/login",
  "/signup",
  "/verify-otp",
]);

export function shouldEnforceWalletGate({
  isAuthenticated: _isAuthenticated,
  isDemo: _isDemo,
  walletSkipped: _walletSkipped,
  connectedWalletsCount: _connectedWalletsCount,
  location: _location,
}: {
  isAuthenticated: boolean;
  isDemo: boolean;
  walletSkipped: boolean;
  connectedWalletsCount: number;
  location: string;
}): boolean {
  // Wallet onboarding is optional in this app. Authenticated users should be
  // able to open the dashboard immediately; wallet linking can happen later.
  return false;
}

function RedirectingScreen({ message }: { message: string }) {
  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center gap-4 bg-background dark">
      <Skeleton className="h-12 w-12 rounded-full" />
      <div className="text-muted-foreground text-sm text-center">{message}</div>
    </div>
  );
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, walletSkipped: _walletSkipped, isDemo: _isDemo } = useAuth();
  const [, setLocation] = useLocation();
  const { data: connectedWallets, isLoading: isLoadingWallets } =
    useGetConnectedWallets({
      query: {
        enabled: isAuthenticated,
        queryKey: getGetConnectedWalletsQueryKey(),
      },
    });

  const _hasConnectedWallet = (connectedWallets?.length ?? 0) > 0;
  const needsWalletGate = false;

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      setLocation("/login");
      return;
    }
  }, [
    isLoading,
    isAuthenticated,
    setLocation,
  ]);

  if (isLoading || (isAuthenticated && isLoadingWallets)) {
    return <RedirectingScreen message="Loading your session..." />;
  }

  if (!isAuthenticated) {
    return <RedirectingScreen message="Redirecting to sign in..." />;
  }

  if (needsWalletGate) {
    return <RedirectingScreen message="Redirecting to wallet setup..." />;
  }

  return <>{children}</>;
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { isAdmin, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      setLocation("/");
    }
  }, [isLoading, isAdmin, setLocation]);

  if (isLoading) {
    return <RedirectingScreen message="Loading admin access..." />;
  }

  if (!isAdmin) {
    return <RedirectingScreen message="Redirecting to the dashboard..." />;
  }

  return <>{children}</>;
}
