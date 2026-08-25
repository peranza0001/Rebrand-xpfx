// Wallet-required banner: shown to authed users without a connected wallet.
// Dismissible per tab (sessionStorage) but reappears on reload.
import { useState } from "react";
import { Link } from "wouter";
import { AlertTriangle, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useGetConnectedWallets } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";

const DISMISS_KEY = "nextrade.walletBanner.dismissed";

export function useShouldMaskBalances(): boolean {
  const { isAuthenticated } = useAuth();
  const { data: connectedWallets } = useGetConnectedWallets();
  return isAuthenticated && (connectedWallets?.length ?? 0) === 0;
}

export function maskValue<T>(masked: boolean, value: T): T | "——" {
  return masked ? "——" : value;
}

export function WalletRequiredBanner() {
  const { isAuthenticated, walletSkipped } = useAuth();
  const { data: connectedWallets } = useGetConnectedWallets();
  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.sessionStorage.getItem(DISMISS_KEY) === "1";
  });

  if (!isAuthenticated) return null;
  if ((connectedWallets?.length ?? 0) > 0) return null;
  if (dismissed) return null;

  const message = walletSkipped
    ? "You skipped the wallet step. Connect a wallet to see real balances and enable crypto withdrawals."
    : "You don't have a wallet connected yet. Connect one to see your balances and unlock crypto features.";

  const handleDismiss = () => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(DISMISS_KEY, "1");
    }
    setDismissed(true);
  };

  return (
    <Card
      className="border-amber-500/40 bg-amber-500/5"
      data-testid="banner-wallet-required"
    >
      <CardContent className="py-3 flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
        <div className="flex-1 text-sm">{message}</div>
        <Button asChild size="sm" variant="secondary">
          <Link href="/connect-wallet">
            Connect wallet <ArrowRight className="h-3 w-3 ml-1" />
          </Link>
        </Button>
        <Button
          size="icon"
          variant="ghost"
          aria-label="Dismiss until next reload"
          onClick={handleDismiss}
          data-testid="button-dismiss-wallet-banner"
        >
          <X className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
