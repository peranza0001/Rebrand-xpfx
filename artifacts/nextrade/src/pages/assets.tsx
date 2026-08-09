import {
  useGetAssetCatalog,
  usePurchaseAsset,
  useSendFromConnectedWallet,
  useGetPlatformReceivingAddress,
  getGetWalletsQueryKey,
  getGetTransactionsQueryKey,
  getGetConnectedWalletBalanceQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, ShoppingCart, Loader2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { PaymentSourceSelector, type PaymentSource } from "@/components/payment-source-selector";
import { ManualTxHashInput } from "@/components/manual-tx-hash-input";
import { DemoExperienceBanner } from "@/components/demo-experience-banner";

export function Assets() {
  const { data: assets, isLoading } = useGetAssetCatalog();

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Market Assets</h1>
        <p className="text-muted-foreground mt-1">Browse and purchase available cryptocurrencies</p>
      </div>

      <DemoExperienceBanner />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 md:gap-6">
        {isLoading ? (
          [1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-48 w-full" />)
        ) : (
          assets?.map(asset => (
            <Card key={asset.id} className="hover:border-primary/50 transition-colors">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    {asset.logoUrl ? (
                      <img src={asset.logoUrl} alt={asset.symbol} className="w-10 h-10 rounded-full" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center font-bold text-secondary-foreground">
                        {asset.symbol.slice(0, 2)}
                      </div>
                    )}
                    <div>
                      <CardTitle className="text-lg">{asset.name}</CardTitle>
                      <span className="text-sm text-muted-foreground font-medium">{asset.symbol}</span>
                    </div>
                  </div>
                  <div className={`flex items-center gap-1 text-sm font-medium ${asset.change24h >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {asset.change24h >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                    {Math.abs(asset.change24h)}%
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Current Price</div>
                    <div className="text-2xl font-bold">${asset.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}</div>
                  </div>
                  <PurchaseAssetDialog asset={asset} />
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

function PurchaseAssetDialog({ asset }: { asset: any }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [source, setSource] = useState<PaymentSource | null>(null);
  const [settlementAsset, setSettlementAsset] = useState<"USDT" | "USDC" | "DAI">("USDT");
  const [manualTxHash, setManualTxHash] = useState("");
  const purchase = usePurchaseAsset();
  const sendFromWallet = useSendFromConnectedWallet();
  const { data: platform } = useGetPlatformReceivingAddress();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Map the unified PaymentSource into the purchase endpoint's
  // paymentMethod enum. Platform → main_wallet, banks → bank_transfer,
  // external wallets → external_wallet (settled on-chain by calling
  // /wallets/connected/{id}/send to the platform's receiving address
  // *before* posting the purchase).
  const paymentMethod: "main_wallet" | "card" | "bank_transfer" | "external_wallet" =
    source?.kind === "platform_wallet"
      ? "main_wallet"
      : source?.kind === "external_wallet"
        ? "external_wallet"
        : source?.kind === "bank"
          ? "bank_transfer"
          : "card";

  const totalCost = (Number(amount) || 0) * asset.price;

  const handlePurchase = async () => {
    if (!source) {
      toast({
        title: "Pick a funding source",
        description: "Choose a wallet or bank to pay with.",
        variant: "destructive",
      });
      return;
    }
    let externalWalletId: string | null = null;
    let txHash: string | null = null;
    if (source.kind === "external_wallet") {
      const reusedHash = manualTxHash.trim();
      if (reusedHash) {
        externalWalletId = source.id;
        txHash = reusedHash;
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
            data: {
              to: platform.address,
              asset: settlementAsset,
              amount: totalCost,
            },
          });
          if (!send.success || !send.hash) {
            toast({
              title: "On-chain payment failed",
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
              description: `Tx ${send.hash.slice(0, 14)}… broadcast. Click Confirm again once it confirms — the hash is now saved for retry.`,
            });
            return;
          }
          externalWalletId = source.id;
          txHash = send.hash;
          queryClient.invalidateQueries({
            queryKey: getGetConnectedWalletBalanceQueryKey(source.id),
          });
          toast({
            title: "On-chain payment confirmed",
            description: `Tx ${send.hash.slice(0, 14)}… Settling purchase.`,
          });
        } catch (err: unknown) {
          toast({
            title: "On-chain payment failed",
            description: err instanceof Error ? err.message : "Could not send on-chain payment.",
            variant: "destructive",
          });
          return;
        }
      }
    }
    purchase.mutate(
      {
        data: {
          assetId: asset.id,
          amount: Number(amount),
          paymentMethod,
          externalWalletId,
          txHash,
          settlementAsset: source.kind === "external_wallet" ? settlementAsset : null,
        },
      },
      {
        onSuccess: (res) => {
          toast({
            title: res.success ? "Purchase Successful" : "Purchase Failed",
            description: `${res.message} (paid via ${source.label})`,
            variant: res.success ? "default" : "destructive",
          });
          queryClient.invalidateQueries({ queryKey: getGetWalletsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetTransactionsQueryKey() });
          if (res.success) {
            setOpen(false);
            setAmount("");
            setManualTxHash("");
          }
        },
        onError: () => {
          toast({ title: "Purchase Failed", description: "Could not complete the transaction.", variant: "destructive" });
        },
      },
    );
  };

  const isExternal = source?.kind === "external_wallet";
  const inFlight = purchase.isPending || sendFromWallet.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={!asset.available}><ShoppingCart className="h-4 w-4 mr-2" /> Buy</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Buy {asset.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="p-4 bg-muted rounded-lg flex justify-between items-center">
            <span className="font-medium text-muted-foreground">Price</span>
            <span className="font-bold">${asset.price.toLocaleString()}</span>
          </div>
          <div className="space-y-2">
            <Label>Amount ({asset.symbol})</Label>
            <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" min="0" step="0.0001" />
          </div>
          <PaymentSourceSelector
            value={source}
            onChange={setSource}
            label="Payment source"
            showLiveBalance
            testId="select-purchase-payment-source"
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
                    data-testid="select-settlement-asset"
                  >
                    <option value="USDT">USDT</option>
                    <option value="USDC">USDC</option>
                    <option value="DAI">DAI</option>
                  </select>
                </div>
                <div className="text-muted-foreground">
                  {platform?.address ? (
                    <>
                      Sends ${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {settlementAsset} on-chain to platform address{" "}
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
                testId="input-purchase-manual-tx-hash"
              />
            </>
          )}
          <div className="pt-4 border-t flex justify-between items-center">
            <span className="font-semibold">Total Cost</span>
            <span className="text-xl font-bold">${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            onClick={handlePurchase}
            disabled={!amount || Number(amount) <= 0 || inFlight || !source || (isExternal && !manualTxHash.trim() && !platform?.address)}
            data-testid="button-confirm-purchase"
          >
            {inFlight && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {sendFromWallet.isPending
              ? "Broadcasting on-chain…"
              : purchase.isPending
                ? "Settling…"
                : isExternal && manualTxHash.trim()
                  ? "Settle with tx hash"
                  : "Confirm Purchase"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
