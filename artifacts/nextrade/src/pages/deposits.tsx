import { useEffect, useState } from "react";
import { Link } from "wouter";
import {
  useGetDeposits,
  useCreateDeposit,
  useGetBankAccounts,
  useSendFromConnectedWallet,
  useGetPlatformReceivingAddress,
  getGetDepositsQueryKey,
  getGetConnectedWalletBalanceQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Loader2, Plus, Download, Lock, Building2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PaymentSourceSelector, type PaymentSource } from "@/components/payment-source-selector";
import { ManualTxHashInput } from "@/components/manual-tx-hash-input";
import { DigitalPaymentMethods } from "@/components/digital-payment-methods";

export function Deposits() {
  const { data: deposits, isLoading } = useGetDeposits();
  const { data: banks } = useGetBankAccounts();
  const { data: platform } = useGetPlatformReceivingAddress();
  const createMutation = useCreateDeposit();
  const sendFromWallet = useSendFromConnectedWallet();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const verifiedBanks = banks?.filter((b) => b.verified) ?? [];
  const hasVerifiedBank = verifiedBanks.length > 0;
  const hasAnyBank = (banks?.length ?? 0) > 0;

  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [source, setSource] = useState<PaymentSource | null>(null);
  const [reference, setReference] = useState("");
  const [settlementAsset, setSettlementAsset] = useState<"USDT" | "USDC" | "DAI">("USDT");
  const [manualTxHash, setManualTxHash] = useState("");
  // Two-step confirm flow with 10s countdown — mirrors the withdrawal UX.
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [countdown, setCountdown] = useState(10);
  useEffect(() => {
    if (!confirmOpen) return;
    if (countdown <= 0) {
      void runDeposit();
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [confirmOpen, countdown]);

  // Map the unified PaymentSource into the deposit endpoint's method enum.
  // External wallets fund via on-chain transfer (crypto_wallet); banks
  // fund via wire/ACH (bank_transfer); platform wallets are treated as
  // an internal transfer (card path is the closest enum value).
  const depositMethod: "bank_transfer" | "card" | "crypto_wallet" =
    source?.kind === "external_wallet"
      ? "crypto_wallet"
      : source?.kind === "bank"
        ? "bank_transfer"
        : "card";
  const bankBlocked = depositMethod === "bank_transfer" && !hasVerifiedBank;
  const isExternal = source?.kind === "external_wallet";
  const inFlight = createMutation.isPending || sendFromWallet.isPending;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!source) {
      toast({
        title: "Pick a funding source",
        description: "Choose a wallet or bank to deposit from.",
        variant: "destructive",
      });
      return;
    }
    if (bankBlocked) {
      toast({
        title: "Link a verified bank first",
        description: "Bank-transfer deposits require at least one verified bank account.",
        variant: "destructive",
      });
      return;
    }
    if (!amount || Number(amount) <= 0) {
      toast({
        title: "Enter a valid amount",
        description: "Deposit amount must be greater than zero.",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Review your deposit",
      description: "Confirm the source — submission will start in 10 seconds.",
    });
    setCountdown(10);
    setConfirmOpen(true);
  };

  const runDeposit = async () => {
    setConfirmOpen(false);
    if (!source) return;
    let externalWalletId: string | null = null;
    let txHash: string | null = null;
    if (isExternal) {
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
              amount: Number(amount),
            },
          });
          if (!send.success || !send.hash) {
            toast({
              title: "On-chain deposit failed",
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
        } catch (err: unknown) {
          toast({
            title: "On-chain deposit failed",
            description: err instanceof Error ? err.message : "Could not send on-chain payment.",
            variant: "destructive",
          });
          return;
        }
      }
    }
    try {
      await createMutation.mutateAsync({
        data: {
          amount: Number(amount),
          currency: isExternal ? settlementAsset : "USD",
          method: depositMethod,
          reference: reference || `via ${source.label}`,
          externalWalletId,
          txHash,
        },
      });
      queryClient.invalidateQueries({ queryKey: getGetDepositsQueryKey() });
      toast({
        title: "Deposit submitted",
        description: txHash
          ? `On-chain tx ${txHash.slice(0, 14)}… recorded. Funds credited after verification.`
          : `Funding from ${source.label}. Follow the instructions to complete the transfer.`,
      });
      setIsOpen(false);
      setAmount("");
      setReference("");
      setManualTxHash("");
    } catch (error: unknown) {
      toast({
        title: "Deposit failed",
        description: error instanceof Error ? error.message : "Failed to create deposit request.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Deposits</h1>
          <p className="text-muted-foreground mt-1">Fund your account to start trading.</p>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> New Deposit</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Make a Deposit</DialogTitle>
              <DialogDescription>Add funds to your USD wallet.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount ({isExternal ? settlementAsset : "USD"})</Label>
                <Input id="amount" type="number" min="0.000001" step="0.000001" value={amount} onChange={(e) => setAmount(e.target.value)} required />
              </div>
              <PaymentSourceSelector
                value={source}
                onChange={setSource}
                label="Funding source"
                showLiveBalance
                testId="select-deposit-source"
              />
              {isExternal && (
                <>
                  <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3 text-xs">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Send asset</Label>
                      <select
                        className="bg-background border border-input rounded px-2 py-1 text-xs"
                        value={settlementAsset}
                        onChange={(e) => setSettlementAsset(e.target.value as "USDT" | "USDC" | "DAI")}
                        data-testid="select-deposit-settlement-asset"
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
                    testId="input-deposit-manual-tx-hash"
                  />
                </>
              )}
              {bankBlocked && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  Bank transfers require a verified bank account.{" "}
                  <Link href="/banks" className="underline">
                    {hasAnyBank ? "Verify bank" : "Link a bank"}
                  </Link>
                </p>
              )}
              <div className="space-y-2">
                <Label htmlFor="reference">Reference / TxHash (Optional)</Label>
                <Input id="reference" value={reference} onChange={(e) => setReference(e.target.value)} />
              </div>
              <div className="pt-4 flex justify-end">
                <Button
                  type="submit"
                  disabled={inFlight || bankBlocked || !source || (isExternal && !manualTxHash.trim() && !platform?.address)}
                  data-testid="button-confirm-deposit"
                >
                  {inFlight && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Continue
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        {confirmOpen && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            data-testid="modal-deposit-confirm"
          >
            <div className="bg-card border border-border rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
              <div>
                <h3 className="text-lg font-semibold">Confirm deposit</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Submitting in <span className="font-mono text-amber-500" data-testid="text-deposit-confirm-countdown">{countdown}</span> second{countdown === 1 ? "" : "s"}. Cancel now if anything looks wrong.
                </p>
              </div>
              <div className="rounded-md bg-muted/30 p-3 text-sm space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-medium">{Number(amount).toLocaleString()} {isExternal ? settlementAsset : "USD"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Source</span>
                  <span>{source?.label}</span>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setConfirmOpen(false)}
                  data-testid="button-deposit-confirm-cancel"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => void runDeposit()}
                  data-testid="button-deposit-confirm-submit-now"
                >
                  Submit now
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {!hasVerifiedBank && (
        <Card className="border-amber-500/40 bg-amber-500/5" data-testid="card-bank-locked">
          <CardContent className="py-4 flex items-center gap-3">
            <Lock className="h-5 w-5 text-amber-500" />
            <div className="flex-1">
              <div className="font-medium flex items-center gap-2">
                <Building2 className="h-4 w-4" /> Bank-transfer deposits are locked
              </div>
              <div className="text-sm text-muted-foreground">
                {hasAnyBank
                  ? "You've added a bank account but it isn't verified yet — bank deposits unlock once verification completes."
                  : "Link and verify a bank account to enable wire/ACH deposits. Card and crypto deposits remain available in the meantime."}
              </div>
            </div>
            <Link href="/banks">
              <Button size="sm" variant="secondary">{hasAnyBank ? "View banks" : "Link bank"}</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Digital Payment Methods Section */}
      <DigitalPaymentMethods />

      <Card>
        <CardHeader>
          <CardTitle>Deposit History</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : deposits?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground flex flex-col items-center">
              <Download className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p>No deposits found. Make your first deposit to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deposits?.map((dep) => (
                  <TableRow key={dep.id}>
                    <TableCell>{format(new Date(dep.createdAt), "MMM d, yyyy HH:mm")}</TableCell>
                    <TableCell className="capitalize">{dep.method.replace('_', ' ')}</TableCell>
                    <TableCell className="font-mono text-xs">{dep.reference || "-"}</TableCell>
                    <TableCell className="font-semibold">${dep.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell>
                      <Badge variant={dep.status === "completed" ? "outline" : dep.status === "failed" ? "destructive" : "secondary"}
                             className={dep.status === "completed" ? "border-success text-success bg-success/10" : ""}>
                        {dep.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
