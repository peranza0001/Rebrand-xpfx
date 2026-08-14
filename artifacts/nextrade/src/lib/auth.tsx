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
const WALLET_GATE_EXEMPT_PATHS = new Set<string>([
  "/connect-wallet",
  "/login",
  "/signup",
  "/verify-otp",
]);

export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, walletSkipped, isDemo } = useAuth();
  const [location, setLocation] = useLocation();
  const { data: connectedWallets, isLoading: isLoadingWallets } =
    useGetConnectedWallets({
      query: {
        enabled: isAuthenticated,
        queryKey: getGetConnectedWalletsQueryKey(),
      },
    });

  const hasConnectedWallet = (connectedWallets?.length ?? 0) > 0;
  // Demo accounts bypass the wallet gate.
  const needsWalletGate =
    isAuthenticated &&
    !isDemo &&
    !walletSkipped &&
    !hasConnectedWallet &&
    !WALLET_GATE_EXEMPT_PATHS.has(location);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      setLocation("/login");
      return;
    }
    if (needsWalletGate && !isLoadingWallets) {
      setLocation("/connect-wallet");
    }
  }, [
    isLoading,
    isAuthenticated,
    needsWalletGate,
    isLoadingWallets,
    setLocation,
  ]);

  if (isLoading || (isAuthenticated && isLoadingWallets)) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center gap-4 dark">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="text-muted-foreground text-sm">Loading session...</div>
      </div>
    );
  }

  if (!isAuthenticated) return null;
  if (needsWalletGate) return null;

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
    return <div className="h-screen w-screen flex items-center justify-center dark"><Skeleton className="h-12 w-12 rounded-full" /></div>;
  }

  if (!isAdmin) {
    return null;
  }

  return <>{children}</>;
}
