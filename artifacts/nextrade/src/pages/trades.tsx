import {
  useGetTrades,
  useGetSocialTradingWallet,
  useReleaseTradeFunds,
  useCreateDeposit,
  useSendFromConnectedWallet,
  useGetPlatformReceivingAddress,
  getGetTradesQueryKey,
  getGetSocialTradingWalletQueryKey,
  getGetDepositsQueryKey,
  getGetConnectedWalletBalanceQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  LockKeyhole,
  ArrowRightCircle,
  Wallet as WalletIcon,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PaymentSourceSelector, type PaymentSource } from "@/components/payment-source-selector";
import { ManualTxHashInput } from "@/components/manual-tx-hash-input";
import { DemoExperienceBanner } from "@/components/demo-experience-banner";

export function Trades() {
  const { data: trades, isLoading: isLoadingTrades } = useGetTrades();
  const { data: socialWallet, isLoading: isLoadingSocial } = useGetSocialTradingWallet();
  const releaseFunds = useReleaseTradeFunds();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleRelease = (tradeId: string) => {
    releaseFunds.mutate({ tradeId }, {
      onSuccess: () => {
        toast({ title: "Funds Released", description: "Profits transferred to your main wallet." });
        queryClient.invalidateQueries({ queryKey: getGetTradesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetSocialTradingWalletQueryKey() });
      },
      onError: () => {
        toast({ title: "Release Failed", description: "Failed to release funds. Try again.", variant: "destructive" });
      }
    });
  };

  const activeTrades = trades?.filter(t => t.status === 'active') || [];
  const pastTrades = trades?.filter(t => t.status !== 'active') || [];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Trading Desk</h1>
        <p className="text-muted-foreground mt-1">Monitor active positions and social trading performance</p>
      </div>

      <DemoExperienceBanner />

      <div className="grid gap-6 md:grid-cols-4">
        {/* Social Trading Summary Panel */}
        <div className="md:col-span-1 space-y-6">
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <UsersIcon className="h-5 w-5 text-primary" />
                Social Wallet
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoadingSocial ? (
                <div className="space-y-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-full" /></div>
              ) : (
                <>
                  <div>
                    <div className="text-sm text-muted-foreground">Total Profits</div>
                    <div className="text-2xl font-bold text-success">
                      +${socialWallet?.totalProfits.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Pending</div>
                    <div className="text-lg font-semibold">
                      ${socialWallet?.pendingProfits.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Status</span>
                    {socialWallet?.locked ? (
                      <Badge variant="outline" className="text-warning border-warning"><LockKeyhole className="h-3 w-3 mr-1" /> Locked</Badge>
                    ) : (
                      <Badge variant="outline" className="text-success border-success"><CheckCircle2 className="h-3 w-3 mr-1" /> Active</Badge>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <FundTradingWalletPanel />
        </div>

        {/* Trades List */}
        <div className="md:col-span-3 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Active Positions</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingTrades ? (
                <div className="space-y-4"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div>
              ) : activeTrades.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No active positions.</div>
              ) : (
                <div className="space-y-4">
                  {activeTrades.map(trade => (
                    <TradeItem key={trade.id} trade={trade} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>History</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingTrades ? (
                 <div className="space-y-4"><Skeleton className="h-16 w-full" /></div>
              ) : pastTrades.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No past trades.</div>
              ) : (
                <div className="space-y-4">
                  {pastTrades.map(trade => (
                    <TradeItem key={trade.id} trade={trade} onRelease={() => handleRelease(trade.id)} isReleasing={releaseFunds.isPending} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function FundTradingWalletPanel() {
  const [amount, setAmount] = useState("");
  const [source, setSource] = useState<PaymentSource | null>(null);
  const [settlementAsset, setSettlementAsset] = useState<"USDT" | "USDC" | "DAI">("USDT");
  const [manualTxHash, setManualTxHash] = useState("");
  const createDeposit = useCreateDeposit();
  const sendFromWallet = useSendFromConnectedWallet();
  const { data: platform } = useGetPlatformReceivingAddress();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isExternal = source?.kind === "external_wallet";
  const inFlight = createDeposit.isPending || sendFromWallet.isPending;

  const handleAllocate = async () => {
    const value = Number(amount);
    if (!source) {
      toast({
        title: "Pick a funding source",
        description: "Choose where the trading capital should come from.",
        variant: "destructive",
      });
      return;
    }
    if (!Number.isFinite(value) || value <= 0) {
      toast({
        title: "Enter an amount",
        description: "Allocation must be greater than zero.",
        variant: "destructive",
      });
      return;
    }
    let externalWalletId: string | null = null;
    let txHash: string | null = null;
    let depositCurrency = "USD";
    let depositMethod: "bank_transfer" | "card" | "crypto_wallet" =
      source.kind === "bank" ? "bank_transfer" : "card";
    if (isExternal) {
      const reusedHash = manualTxHash.trim();
      if (reusedHash) {
        externalWalletId = source.id;
        txHash = reusedHash;
        depositCurrency = settlementAsset;
        depositMethod = "crypto_wallet";
      } else {
        if (!platform?.address) {
          toast({
            title: "Platform receiving address unavailable",
            description: "Try again in a moment.",
            variant: "destructive",
          });
          return;
        }
        try {
          const send = await sendFromWallet.mutateAsync({
            walletId: source.id,
            data: { to: platform.address, asset: settlementAsset, amount: value },
          });
          if (!send.success || !send.hash) {
            toast({
              title: "On-chain allocation failed",
              description: send.message ?? "Could not broadcast the on-chain transfer.",
              variant: "destructive",
            });
            return;
          }
          if (send.status !== 1) {
            setManualTxHash(send.hash);
            queryClient.invalidateQueries({
              queryKey: getGetConnectedWalletBalanceQueryKey(source.id),
            });
            toast({
              title: "Awaiting on-chain confirmation",
              description: `Tx ${send.hash.slice(0, 14)}… broadcast. Click Allocate again once it confirms — the hash is now saved for retry.`,
            });
            return;
          }
          externalWalletId = source.id;
          txHash = send.hash;
          depositCurrency = settlementAsset;
          depositMethod = "crypto_wallet";
          queryClient.invalidateQueries({
            queryKey: getGetConnectedWalletBalanceQueryKey(source.id),
          });
        } catch (err: unknown) {
          toast({
            title: "On-chain allocation failed",
            description: err instanceof Error ? err.message : "Could not send on-chain payment.",
            variant: "destructive",
          });
          return;
        }
      }
    }
    try {
      await createDeposit.mutateAsync({
        data: {
          amount: value,
          currency: depositCurrency,
          method: depositMethod,
          reference: `Trading capital via ${source.label}`,
          externalWalletId,
          txHash,
        },
      });
      queryClient.invalidateQueries({ queryKey: getGetDepositsQueryKey() });
      toast({
        title: "Allocation submitted",
        description: txHash
          ? `On-chain tx ${txHash.slice(0, 14)}… recorded. Capital credited after settlement.`
          : `Funding via ${source.label}. Funds will appear after settlement.`,
      });
      setAmount("");
      setManualTxHash("");
    } catch (err: unknown) {
      toast({
        title: "Allocation failed",
        description: err instanceof Error ? err.message : "Could not record the allocation.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card data-testid="card-fund-trading-wallet">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <WalletIcon className="h-5 w-5 text-primary" />
          Allocate Capital
        </CardTitle>
        <CardDescription>
          Top up your trading wallet from any source.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="trade-allocate-amount">Amount</Label>
          <Input
            id="trade-allocate-amount"
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            data-testid="input-trade-allocate-amount"
          />
        </div>
        <PaymentSourceSelector
          value={source}
          onChange={setSource}
          label="Funding source"
          showLiveBalance
          testId="select-trade-funding-source"
        />
        {isExternal && (
          <>
            <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3 text-xs">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Settle in</Label>
                <select
                  className="bg-background border border-input rounded px-2 py-1 text-xs"
                  value={settlementAsset}
                  onChange={(e) => setSettlementAsset(e.target.value as "USDT" | "USDC" | "DAI")}
                  data-testid="select-trade-settlement-asset"
                >
                  <option value="USDT">USDT</option>
                  <option value="USDC">USDC</option>
                  <option value="DAI">DAI</option>
                </select>
              </div>
              <div className="text-muted-foreground">
                {platform?.address ? (
                  <>
                    Broadcasts on-chain to platform address{" "}
                    <span className="font-mono">{platform.address.slice(0, 8)}…{platform.address.slice(-6)}</span>.
                  </>
                ) : (
                  "Loading platform receiving address…"
                )}
              </div>
            </div>
            <ManualTxHashInput
              value={manualTxHash}
              onChange={setManualTxHash}
              testId="input-trade-manual-tx-hash"
            />
          </>
        )}
        <Button
          className="w-full"
          onClick={handleAllocate}
          disabled={inFlight || !source || (isExternal && !manualTxHash.trim() && !platform?.address)}
          data-testid="button-trade-allocate"
        >
          {inFlight && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {sendFromWallet.isPending
            ? "Broadcasting on-chain…"
            : createDeposit.isPending
              ? "Allocating…"
              : isExternal && manualTxHash.trim()
                ? "Settle with tx hash"
                : "Allocate"}
        </Button>
      </CardContent>
    </Card>
  );
}

function TradeItem({ trade, onRelease, isReleasing }: { trade: any, onRelease?: () => void, isReleasing?: boolean }) {
  const isLong = trade.type === 'long';
  const isProfitable = trade.profit > 0;
  const isCompleted = trade.status === 'completed';

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg bg-card/50 gap-4">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-full ${isLong ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'}`}>
          {isLong ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg">{trade.pair}</span>
            <Badge variant="secondary" className="uppercase text-xs">{trade.type}</Badge>
            {trade.managerId && <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">Social</Badge>}
          </div>
          <div className="text-sm text-muted-foreground mt-1 flex gap-4">
            <span>Entry: ${trade.entryPrice.toLocaleString()}</span>
            <span>Current: ${trade.currentPrice.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end">
        <div className="text-right">
          <div className="text-xs text-muted-foreground mb-1">P/L</div>
          <div className={`font-bold text-lg ${isProfitable ? 'text-success' : trade.profit < 0 ? 'text-destructive' : ''}`}>
            {isProfitable ? '+' : ''}{trade.profit.toLocaleString()} {trade.currency}
          </div>
        </div>

        {isCompleted && onRelease && (
          <Button size="sm" onClick={onRelease} disabled={isReleasing}>
            Release Funds <ArrowRightCircle className="ml-2 h-4 w-4" />
          </Button>
        )}
        {!isCompleted && (
          <div className="text-right">
            <div className="text-xs text-muted-foreground mb-1">Target</div>
            <div className="font-medium">${trade.targetPrice.toLocaleString()}</div>
          </div>
        )}
      </div>
    </div>
  );
}

function UsersIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

