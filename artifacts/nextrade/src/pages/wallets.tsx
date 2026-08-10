import { useState } from "react";
import {
  useGetWallets,
  useGetTransactions,
  useConnectExternalWallet,
  useConnectExchangeWallet,
  useDisconnectExchangeWallet,
  useGetConnectedWallets,
  useGetBankAccounts,
  useGetCurrentUser,
  useGetExchangeAvailability,
  getGetWalletsQueryKey,
  getGetConnectedWalletsQueryKey,
  getGetCurrentUserQueryKey,
} from "@workspace/api-client-react";
import { WalletRequiredBanner } from "@/components/wallet-required-banner";
import { ConnectedWalletCard } from "@/components/ConnectedWalletCard";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Wallet,
  ArrowDownToLine,
  ArrowUpFromLine,
  RefreshCcw,
  ArrowRightLeft,
  Link as LinkIcon,
  Lock,
  Landmark,
} from "lucide-react";
import type { ConnectedWallet } from "@workspace/api-client-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { BuyCryptoDialog } from "@/components/BuyCryptoDialog";

export function Wallets() {
  const { data: wallets, isLoading: isLoadingWallets } = useGetWallets();
  const { data: transactions, isLoading: isLoadingTransactions } = useGetTransactions();
  const { data: connectedWallets } = useGetConnectedWallets();
  const { data: banks } = useGetBankAccounts();
  const balancesMasked = (connectedWallets?.length ?? 0) === 0;
  const hasVerifiedBank = (banks?.filter((b) => b.verified).length ?? 0) > 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 md:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Wallets</h1>
          <p className="text-muted-foreground mt-1">Manage your funds and external connections</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <BuyCryptoDialog banks={banks} />
          <ConnectWalletDialog />
          <ConnectExchangeWalletDialog />
        </div>
      </div>

      <WalletRequiredBanner />
      <BuyVerificationBanner />

      {!hasVerifiedBank && (
        <Card className="border-amber-500/40 bg-amber-500/5" data-testid="card-fiat-bank-locked-wallets">
          <CardContent className="py-3 flex items-center gap-3">
            <Lock className="h-4 w-4 text-amber-500 flex-shrink-0" />
            <div className="flex-1 text-sm">
              Fiat (USD) wallets are read-only until you link and verify a bank account.
            </div>
            <Link href="/banks">
              <Button size="sm" variant="secondary">{(banks?.length ?? 0) > 0 ? "View banks" : "Link bank"}</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {isLoadingWallets ? (
          <>
            <Skeleton className="h-[140px] w-full" />
            <Skeleton className="h-[140px] w-full" />
            <Skeleton className="h-[140px] w-full" />
          </>
        ) : (
          wallets?.map((wallet) => (
            <Card key={wallet.id} className={wallet.type === 'main' ? 'border-primary shadow-sm' : ''}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium capitalize">{wallet.label}</CardTitle>
                <Wallet className={`h-4 w-4 ${wallet.type === 'main' ? 'text-primary' : 'text-muted-foreground'}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid={`wallet-balance-${wallet.id}`}>
                  {balancesMasked
                    ? "——"
                    : `${wallet.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} ${wallet.currency}`}
                </div>
                {!balancesMasked && wallet.pendingBalance > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Pending: {wallet.pendingBalance.toLocaleString()} {wallet.currency}
                  </p>
                )}
                <div className="text-xs text-muted-foreground mt-4 font-mono truncate" title={wallet.address}>
                  {wallet.address.slice(0, 8)}...{wallet.address.slice(-6)}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {(banks?.length ?? 0) > 0 && (
        <Card data-testid="card-fiat-balances">
          <CardHeader>
            <CardTitle>Bank Fiat Balances</CardTitle>
            <CardDescription>
              Available cash held in your linked bank accounts. Use the
              Banks page to update the amount or buy crypto with MoonPay.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
              {banks!.map((b) => {
                const isVerified = b.verified;
                const hasBalance = (b.fiatBalance ?? 0) > 0;
                return (
                  <div
                    key={b.id}
                    className="border rounded-lg p-4 bg-card/50 flex items-center justify-between"
                    data-testid={`fiat-balance-${b.id}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 shrink-0 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                        <Landmark className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold truncate">
                          {b.bankName} ····{b.last4}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {b.accountHolder}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {!isVerified ? (
                        <>
                          <div
                            className="text-xs font-medium text-amber-600 dark:text-amber-400"
                            data-testid={`fiat-balance-unverified-${b.id}`}
                          >
                            Verification required
                          </div>
                          <Link
                            href="/banks"
                            className="text-[11px] text-primary hover:underline"
                          >
                            Verify bank →
                          </Link>
                        </>
                      ) : !hasBalance ? (
                        <>
                          <div
                            className="text-sm font-medium text-muted-foreground"
                            data-testid={`fiat-balance-empty-${b.id}`}
                          >
                            No balance set
                          </div>
                          <Link
                            href="/banks"
                            className="text-[11px] text-primary hover:underline"
                          >
                            Add balance →
                          </Link>
                        </>
                      ) : (
                        <>
                          <div
                            className="text-lg font-bold font-mono"
                            data-testid={`fiat-balance-amount-${b.id}`}
                          >
                            {b.fiatBalance.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}{" "}
                            {b.fiatCurrency || b.currency}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Available cash
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 text-xs text-muted-foreground">
              <Link href="/banks" className="text-primary hover:underline">
                Update bank balances →
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {(banks?.length ?? 0) === 0 && (
        <Card data-testid="card-fiat-balances-empty">
          <CardHeader>
            <CardTitle>Bank Fiat Balances</CardTitle>
            <CardDescription>
              Link a bank account to track your available cash and unlock
              MoonPay purchases.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/banks">
              <Button size="sm" variant="secondary">
                Link a bank
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {(() => {
        const selfCustody =
          connectedWallets?.filter((w) => w.provider === "self_custody") ?? [];
        const exchangeWallets =
          connectedWallets?.filter((w) => w.provider !== "self_custody") ?? [];
        return (
          <>
            {selfCustody.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Connected External Wallets</CardTitle>
                  <CardDescription>
                    Live on-chain balance, send & receive — powered by ethers.js.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selfCustody.map((w) => (
                    <ConnectedWalletCard key={w.id} wallet={w} />
                  ))}
                </CardContent>
              </Card>
            )}
            {exchangeWallets.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Connected Exchange Accounts</CardTitle>
                  <CardDescription>
                    MoonPay and Coinbase accounts you've linked. We sync your
                    profile so checkouts pre-fill your details.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {exchangeWallets.map((w) => (
                    <ExchangeWalletRow key={w.id} wallet={w} />
                  ))}
                </CardContent>
              </Card>
            )}
          </>
        );
      })()}

      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>Recent deposits, withdrawals, and transfers</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingTransactions ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : transactions?.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">No transactions found</div>
          ) : (
            <div className="space-y-4">
              {transactions?.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-4 border rounded-lg bg-card/50">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-full ${
                      tx.type === 'deposit' || tx.type === 'trade_profit' || tx.type === 'p2p_sell' 
                        ? 'bg-success/20 text-success' 
                        : tx.type === 'withdrawal' || tx.type === 'p2p_buy'
                        ? 'bg-destructive/20 text-destructive'
                        : 'bg-info/20 text-info'
                    }`}>
                      {tx.type === 'deposit' ? <ArrowDownToLine className="h-4 w-4" /> :
                       tx.type === 'withdrawal' ? <ArrowUpFromLine className="h-4 w-4" /> :
                       tx.type === 'transfer' ? <ArrowRightLeft className="h-4 w-4" /> :
                       <RefreshCcw className="h-4 w-4" />}
                    </div>
                    <div>
                      <div className="font-medium capitalize">{tx.description}</div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(tx.createdAt), 'MMM d, yyyy HH:mm')} • 
                        <span className={`ml-1 capitalize ${
                          tx.status === 'completed' ? 'text-success' :
                          tx.status === 'pending' ? 'text-warning' : 'text-destructive'
                        }`}> {tx.status}</span>
                      </div>
                    </div>
                  </div>
                  <div className={`font-bold ${
                      tx.type === 'deposit' || tx.type === 'trade_profit' || tx.type === 'p2p_sell' 
                        ? 'text-success' 
                        : tx.type === 'withdrawal' || tx.type === 'p2p_buy'
                        ? 'text-foreground'
                        : ''
                    }`}>
                    {tx.type === 'withdrawal' || tx.type === 'p2p_buy' || tx.type === 'transfer' ? '-' : '+'}
                    {tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} {tx.currency}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


function BuyVerificationBanner() {
  const { data: user } = useGetCurrentUser();
  if (!user || user.buyVerified === true) return null;
  return (
    <Card
      className="border-amber-500/40 bg-amber-500/10"
      data-testid="banner-wallets-buy-verification"
    >
      <CardContent className="py-4 flex items-start sm:items-center gap-3 flex-col sm:flex-row">
        <div className="flex-1">
          <div className="font-semibold text-sm">
            Complete your buy verification
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Make your first crypto purchase via MoonPay or Coinbase to unlock
            full account features.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function ExchangeWalletRow({ wallet }: { wallet: ConnectedWallet }) {
  const disconnect = useDisconnectExchangeWallet();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const profile = wallet.syncedProfile ?? null;
  const providerLabel = wallet.provider === "moonpay" ? "MoonPay" : "Coinbase";
  const onDisconnect = () => {
    disconnect.mutate(
      { walletId: wallet.id },
      {
        onSuccess: () => {
          toast({
            title: "Exchange account disconnected",
            description: `Removed your ${providerLabel} link.`,
          });
          queryClient.invalidateQueries({ queryKey: getGetConnectedWalletsQueryKey() });
        },
        onError: () => {
          toast({
            title: "Could not disconnect",
            description: "Please try again in a moment.",
            variant: "destructive",
          });
        },
      },
    );
  };
  return (
    <div
      className="border rounded-lg p-4 bg-card/50 space-y-2"
      data-testid={`exchange-wallet-${wallet.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold">{providerLabel}</span>
            {wallet.label && (
              <span className="text-xs text-muted-foreground">— {wallet.label}</span>
            )}
            <span className="inline-flex items-center text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/15 text-primary">
              exchange
            </span>
          </div>
          <p className="text-xs text-muted-foreground font-mono break-all mt-1">
            {wallet.address}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onDisconnect}
          disabled={disconnect.isPending}
          data-testid={`button-disconnect-exchange-${wallet.id}`}
        >
          Disconnect
        </Button>
      </div>
      {profile && (
        <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground border-t pt-2">
          <span className="col-span-2 text-[11px] uppercase tracking-wider">
            Synced profile
          </span>
          <span>Name: <span className="text-foreground">{profile.fullName}</span></span>
          <span>Email: <span className="text-foreground">{profile.email}</span></span>
          <span>Country: <span className="text-foreground">{profile.country}</span></span>
          {profile.bankName && (
            <span>
              Bank: <span className="text-foreground">{profile.bankName} {profile.bankLast4 ? `••${profile.bankLast4}` : ""}</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function ConnectExchangeWalletDialog() {
  const [open, setOpen] = useState(false);
  const [provider, setProvider] = useState<"moonpay" | "coinbase">("moonpay");
  const [address, setAddress] = useState("");
  const [label, setLabel] = useState("");
  const connect = useConnectExchangeWallet();
  const { data: availability } = useGetExchangeAvailability();
  const { data: currentUser } = useGetCurrentUser();
  const { data: banks } = useGetBankAccounts();
  const defaultBank =
    banks?.find((b) => b.isDefault) ?? banks?.[0] ?? null;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const moonpaySupported = availability?.moonpaySupported !== false;
  const moonpayReason = availability?.moonpayUnsupportedReason ?? null;

  const submit = () => {
    if (!address.trim()) return;
    connect.mutate(
      {
        data: {
          provider,
            address: address.trim(),
          label: label.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          toast({
            title: "Exchange account linked",
            description: `Your ${provider === "moonpay" ? "MoonPay" : "Coinbase"} account is now connected.`,
          });
          queryClient.invalidateQueries({ queryKey: getGetConnectedWalletsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
          setOpen(false);
            setAddress("");
          setLabel("");
        },
        onError: (err: unknown) => {
          const msg =
            err instanceof Error
              ? err.message
              : "Could not link the exchange account.";
          toast({ title: "Connection failed", description: msg, variant: "destructive" });
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" data-testid="button-connect-exchange-wallet">
          <LinkIcon className="h-4 w-4 mr-2" /> Connect Exchange Account
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connect Exchange Account Wallet</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Exchange provider</Label>
            <Select
              value={provider}
              onValueChange={(v) => setProvider(v as typeof provider)}
            >
              <SelectTrigger data-testid="select-exchange-provider">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="moonpay" disabled={!moonpaySupported}>
                  MoonPay{!moonpaySupported ? " — unavailable in your region" : ""}
                </SelectItem>
                <SelectItem value="coinbase">Coinbase</SelectItem>
              </SelectContent>
            </Select>
            {!moonpaySupported && moonpayReason && (
              <p
                className="text-xs text-amber-500"
                data-testid="text-exchange-region-block"
              >
                {moonpayReason}
              </p>
            )}
          </div>
          {currentUser && (
            <div
              className="rounded-md border border-border bg-muted/30 p-3 text-xs space-y-1"
              data-testid="panel-exchange-profile-sync"
            >
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Account profile to sync
              </div>
              <p className="text-[11px] text-muted-foreground">
                The exchange will receive this identity so checkouts pre-fill.
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
          <div className="space-y-2">
            <Label htmlFor="exchange-label">Label (optional)</Label>
            <Input
              id="exchange-label"
              placeholder={provider === "moonpay" ? "MoonPay account" : "Coinbase account"}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              maxLength={64}
              data-testid="input-exchange-label"
            />
          </div>
          <div className="space-y-2">
              <Label htmlFor="exchange-address-dialog">Public wallet address</Label>
            <Input
                id="exchange-address-dialog"
                placeholder="0x..."
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                data-testid="input-exchange-address"
            />
            <p className="text-[11px] text-muted-foreground">
              Your details (name, email, country, default bank) will be synced
              to the exchange so checkouts pre-fill automatically.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={submit}
              disabled={!address.trim() || connect.isPending || (provider === "moonpay" && !moonpaySupported)}
            data-testid="button-submit-exchange-connect"
          >
            {connect.isPending ? "Connecting..." : "Link account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ConnectWalletDialog() {
  const [open, setOpen] = useState(false);
  // Free-form wallet provider: presets + "other" with custom name.
  const [walletChoice, setWalletChoice] = useState<
    'metamask' | 'trust' | 'coinbase' | 'phantom' | 'other'
  >('metamask');
  const [customWalletName, setCustomWalletName] = useState("");
  const [address, setAddress] = useState("");
  const connect = useConnectExternalWallet();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const resolvedWalletType =
    walletChoice === 'other' ? customWalletName.trim() || 'custom' : walletChoice;
  const requiresCustomName = walletChoice === 'other';
  const canSubmit =
    !!address.trim() && (!requiresCustomName || customWalletName.trim().length > 0);

  const handleConnect = () => {
    connect.mutate(
      { data: { address: address.trim(), walletType: resolvedWalletType } },
      {
        onSuccess: () => {
          toast({ title: "Wallet connected", description: "Successfully linked external wallet." });
          queryClient.invalidateQueries({ queryKey: getGetWalletsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetConnectedWalletsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
          setOpen(false);
            setAddress("");
          setCustomWalletName("");
        },
        onError: () => {
          toast({
            title: "Connection failed",
            description: "Could not connect wallet. Please verify your details.",
            variant: "destructive",
          });
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><LinkIcon className="h-4 w-4 mr-2" /> Connect External</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connect External Wallet</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Wallet Provider</Label>
            <Select
              value={walletChoice}
              onValueChange={(v) => setWalletChoice(v as typeof walletChoice)}
            >
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
          {requiresCustomName && (
            <div className="space-y-2">
              <Label htmlFor="customWalletName">Provider name</Label>
              <Input
                id="customWalletName"
                placeholder="e.g. Ledger, Rainbow, MyCustomWallet"
                value={customWalletName}
                onChange={(e) => setCustomWalletName(e.target.value)}
                maxLength={64}
                data-testid="input-custom-wallet-name"
              />
            </div>
          )}
          <div className="space-y-2">
              <Label htmlFor="wallet-address-dialog">Public wallet address</Label>
            <Input
                id="wallet-address-dialog"
                placeholder="0x..."
                value={address}
                onChange={e => setAddress(e.target.value)}
                data-testid="input-wallet-address"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleConnect} disabled={!canSubmit || connect.isPending}>
            {connect.isPending ? "Connecting..." : "Connect Wallet"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
