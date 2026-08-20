// /connect-wallet — mandatory wallet step after signup/login. User connects
// a wallet (incl. free-text provider) or explicitly skips (sets walletSkipped).
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useConnectExternalWallet,
  useConnectExchangeWallet,
  useGetBankAccounts,
  useGetConnectedWallets,
  useGetCurrentUser,
  useGetExchangeAvailability,
  useSkipWalletConnect,
  getGetConnectedWalletsQueryKey,
  getGetCurrentUserQueryKey,
  getGetSessionQueryKey,
  getGetWalletsQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ShieldCheck, Wallet, AlertTriangle, Building2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { EthereumProvider } from "@walletconnect/ethereum-provider";

declare global {
  interface Window {
    ethereum?: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> };
  }
}

type WalletChoice = "metamask" | "trust" | "coinbase" | "phantom" | "other";
export function ConnectWallet() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { data: connectedWallets, isLoading: walletsLoading } =
    useGetConnectedWallets();

  const connect = useConnectExternalWallet();
  const connectExchange = useConnectExchangeWallet();
  const skip = useSkipWalletConnect();
  const { data: availability } = useGetExchangeAvailability();
  const { data: currentUser } = useGetCurrentUser();
  const { data: banks } = useGetBankAccounts();
  const defaultBank = banks?.find((b) => b.isDefault) ?? banks?.[0] ?? null;

  const [choice, setChoice] = useState<WalletChoice>("metamask");
  const [customName, setCustomName] = useState("");
  const [address, setAddress] = useState("");
  const [walletError, setWalletError] = useState<string | null>(null);
  const walletConnectProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID?.trim() || "";

  // Exchange-wallet connect form state (separate from the self-custody form
  // above). Tile-based provider picker per spec.
  const [exchangeProvider, setExchangeProvider] = useState<
    "moonpay" | "coinbase" | null
  >(null);
  const [exchangeAddress, setExchangeAddress] = useState("");
  const moonpaySupported = availability?.moonpaySupported !== false;
  const moonpayReason = availability?.moonpayUnsupportedReason ?? null;

  // If they're not signed in, route them away. If they're already connected,
  // skip the interstitial entirely.
  useEffect(() => {
    if (authLoading || walletsLoading) return;
    if (!isAuthenticated) {
      setLocation("/login");
      return;
    }
    if ((connectedWallets?.length ?? 0) > 0) {
      setLocation("/");
    }
  }, [authLoading, walletsLoading, isAuthenticated, connectedWallets, setLocation]);

  const resolvedWalletType =
    choice === "other" ? customName.trim() || "custom" : choice;

  const canSubmit =
    address.trim().length > 0 &&
    (choice !== "other" || customName.trim().length > 0) &&
    !connect.isPending;

  const completeSiwe = async (walletAddress: string, provider: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> }) => {
    const apiUrl = import.meta.env.VITE_API_URL || window.location.origin;
    const nonceResponse = await fetch(`${apiUrl}/api/auth/siwe/nonce`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: walletAddress }),
    });
    const challenge = await nonceResponse.json();
    if (!nonceResponse.ok) throw new Error(challenge.error || "Unable to start wallet verification.");
    const signature = await provider.request({ method: "personal_sign", params: [challenge.message, walletAddress] });
    const verifyResponse = await fetch(`${apiUrl}/api/auth/siwe/verify`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nonce: challenge.nonce, message: challenge.message, signature }),
    });
    const verified = await verifyResponse.json();
    if (!verifyResponse.ok) throw new Error(verified.error || "Wallet signature verification failed.");
    setAddress(walletAddress);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: getGetConnectedWalletsQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getGetWalletsQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getGetSessionQueryKey() }),
    ]);
    toast({ title: "Wallet verified", description: `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)} is now linked.` });
    setLocation("/");
  };

  const handleInjectedConnect = async () => {
    setWalletError(null);
    if (!window.ethereum) {
      setWalletError("No injected wallet was found. Install MetaMask or use WalletConnect.");
      return;
    }
    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" }) as string[];
      const chainId = await window.ethereum.request({ method: "eth_chainId" });
      if (String(chainId).toLowerCase() !== "0x1") throw new Error("Switch your wallet to Ethereum mainnet and try again.");
      const walletAddress = accounts?.[0];
      if (!walletAddress) throw new Error("No wallet account was returned.");
      await completeSiwe(walletAddress, window.ethereum);
    } catch (error) {
      setWalletError(error instanceof Error ? error.message : "Wallet connection was rejected or unavailable.");
    }
  };

  const handleWalletConnect = async () => {
    setWalletError(null);
    if (!walletConnectProjectId) {
      setWalletError("WalletConnect is not configured. Use MetaMask or enter a public address.");
      return;
    }
    try {
      const provider = await EthereumProvider.init({
        projectId: walletConnectProjectId,
        chains: [1],
        showQrModal: true,
        metadata: { name: "XpressPro FX", description: "Wallet connection", url: window.location.origin, icons: [] },
      });
      await provider.connect();
      const walletAddress = provider.accounts?.[0];
      if (!walletAddress) throw new Error("WalletConnect did not return an account.");
      await completeSiwe(walletAddress, provider);
    } catch (error) {
      setWalletError(error instanceof Error ? error.message : "WalletConnect connection failed.");
    }
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await connect.mutateAsync({
        data: { address: address.trim(), walletType: resolvedWalletType },
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getGetConnectedWalletsQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetWalletsQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetSessionQueryKey() }),
      ]);
      toast({
        title: "Wallet connected",
        description: `Successfully linked your ${resolvedWalletType} wallet.`,
      });
      setLocation("/");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Could not connect wallet.";
      toast({ title: "Connection failed", description: message, variant: "destructive" });
    }
  };

  const handleConnectExchange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exchangeProvider || !exchangeAddress.trim()) return;
    try {
      await connectExchange.mutateAsync({
        data: {
          provider: exchangeProvider,
          address: exchangeAddress.trim(),
        },
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getGetConnectedWalletsQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetSessionQueryKey() }),
      ]);
      toast({
        title: "Exchange account linked",
        description: `${exchangeProvider === "moonpay" ? "MoonPay" : "Coinbase"} is now connected.`,
      });
      setLocation("/");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Could not link the exchange account.";
      toast({ title: "Connection failed", description: message, variant: "destructive" });
    }
  };

  const handleSkip = async () => {
    try {
      await skip.mutateAsync();
      await queryClient.invalidateQueries({ queryKey: getGetSessionQueryKey() });
      toast({
        title: "Wallet step skipped",
        description: "You can connect a wallet anytime from the Wallets page.",
      });
      setLocation("/");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Could not skip this step.";
      toast({ title: "Could not skip", description: message, variant: "destructive" });
    }
  };

  if (authLoading || walletsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background dark">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 dark">
      <div className="w-full max-w-xl space-y-4">
        <div className="text-center mb-6">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
            <Wallet className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-bold text-primary tracking-tight">
            Connect your wallet
          </h1>
          <p className="text-muted-foreground mt-2 text-sm max-w-md mx-auto">
            Link an external wallet to send, receive and withdraw crypto on
            XpressPro FX. You can skip this for now, but some features will be
            limited until a wallet is connected.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>External wallet</CardTitle>
            <CardDescription>
              Choose your provider, then provide a public wallet address only.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 mb-4">
              <Button type="button" onClick={handleInjectedConnect} variant="default" className="gap-2">
                <Wallet className="h-4 w-4" />
                Connect MetaMask
              </Button>
              <Button type="button" onClick={handleWalletConnect} variant="outline" className="gap-2" disabled={!walletConnectProjectId}>
                <Wallet className="h-4 w-4" />
                {walletConnectProjectId ? "Connect WalletConnect" : "WalletConnect not configured"}
              </Button>
            </div>
            {walletError && <p className="text-sm text-destructive mb-4" role="alert">{walletError}</p>}
            <form onSubmit={handleConnect} className="space-y-4">
              <div className="space-y-2">
                <Label>Wallet provider</Label>
                <Select value={choice} onValueChange={(v) => setChoice(v as WalletChoice)}>
                  <SelectTrigger data-testid="select-wallet-provider">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="metamask">MetaMask</SelectItem>
                    <SelectItem value="trust">Trust Wallet</SelectItem>
                    <SelectItem value="coinbase">Coinbase Wallet</SelectItem>
                    <SelectItem value="phantom">Phantom</SelectItem>
                    <SelectItem value="other">Other / Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {choice === "other" && (
                <div className="space-y-2">
                  <Label htmlFor="customName">Provider name</Label>
                  <Input
                    id="customName"
                    placeholder="e.g. Ledger, Rainbow, MyCustomWallet"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    maxLength={64}
                    data-testid="input-custom-wallet-name"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="wallet-address">Public wallet address</Label>
                <Input
                  id="wallet-address"
                  placeholder="0x..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  data-testid="input-wallet-address"
                />
                <p className="text-xs text-muted-foreground flex items-start gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                  Use a public address only. Never enter a seed phrase or private key.
                </p>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={!canSubmit}
                data-testid="button-connect-wallet"
              >
                {connect.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Connect wallet
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Connect Exchange Account Wallet</CardTitle>
            <CardDescription>
              Link a MoonPay or Coinbase account to pre-fill checkouts and
              verify your buy ability. This is separate from a self-custody
              wallet.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleConnectExchange} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => moonpaySupported && setExchangeProvider("moonpay")}
                  disabled={!moonpaySupported}
                  className={`text-left border rounded-lg p-3 transition ${
                    exchangeProvider === "moonpay"
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  } ${!moonpaySupported ? "opacity-50 cursor-not-allowed" : ""}`}
                  data-testid="tile-exchange-moonpay"
                >
                  <Building2 className="h-5 w-5 mb-1 text-primary" />
                  <div className="font-semibold text-sm">MoonPay</div>
                  <div className="text-[11px] text-muted-foreground mt-1">
                    {moonpaySupported
                      ? "Hosted on-ramp with KYC reuse"
                      : "Unavailable in your region"}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setExchangeProvider("coinbase")}
                  className={`text-left border rounded-lg p-3 transition ${
                    exchangeProvider === "coinbase"
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  }`}
                  data-testid="tile-exchange-coinbase"
                >
                  <Building2 className="h-5 w-5 mb-1 text-primary" />
                  <div className="font-semibold text-sm">Coinbase</div>
                  <div className="text-[11px] text-muted-foreground mt-1">
                    Coinbase hosted checkout
                  </div>
                </button>
              </div>
              {!moonpaySupported && moonpayReason && (
                <p
                  className="text-xs text-amber-500"
                  data-testid="text-connect-region-block"
                >
                  {moonpayReason}
                </p>
              )}
              {exchangeProvider && currentUser && (
                <div
                  className="rounded-md border border-border bg-muted/30 p-3 text-xs space-y-1"
                  data-testid="panel-connect-profile-sync"
                >
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Account profile to sync
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Your NeXTrade identity will be sent to{" "}
                    {exchangeProvider === "moonpay" ? "MoonPay" : "Coinbase"} so
                    KYC and checkouts pre-fill automatically.
                  </p>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2">
                    <span>Name:</span>
                    <span className="text-foreground">{currentUser.fullName}</span>
                    <span>Email:</span>
                    <span className="text-foreground">{currentUser.email}</span>
                    <span>Country:</span>
                    <span className="text-foreground">{currentUser.country}</span>
                    {defaultBank && (
                      <>
                        <span>Bank:</span>
                        <span className="text-foreground">
                          {defaultBank.bankName} ····{defaultBank.last4}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              )}
              {exchangeProvider && (
                <>
                  <div className="space-y-2">
                      <Label htmlFor="exchange-address">Public wallet address</Label>
                    <Input
                        id="exchange-address"
                        placeholder="0x..."
                        value={exchangeAddress}
                        onChange={(e) => setExchangeAddress(e.target.value)}
                        data-testid="input-exchange-address"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={
                        !exchangeAddress.trim() || connectExchange.isPending
                    }
                    data-testid="button-connect-exchange-wallet-page"
                  >
                    {connectExchange.isPending && (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    )}
                    Link {exchangeProvider === "moonpay" ? "MoonPay" : "Coinbase"} account
                  </Button>
                </>
              )}
            </form>
          </CardContent>
        </Card>

        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="py-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1 space-y-2">
              <div className="text-sm">
                <span className="font-medium">Need to do this later?</span>{" "}
                You can skip for now, but your wallet balances will appear as{" "}
                <span className="font-mono">——</span> and crypto withdrawals
                will be disabled until a wallet is connected.
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkip}
                disabled={skip.isPending}
                data-testid="button-skip-wallet"
              >
                {skip.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Skip for now
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
