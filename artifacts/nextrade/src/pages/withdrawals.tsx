import { useEffect, useState } from "react";
import { Link } from "wouter";
import {
  useGetWithdrawals,
  useRequestWithdrawal,
  useGetKycStatus,
  useGetWallets,
  useGetBankAccounts,
  useGetConnectedWallets,
  useGetWithdrawalGasFee,
  useMarkWithdrawalGasFeeFunded,
  useCancelMyWithdrawal,
  getGetWithdrawalsQueryKey,
  getGetWalletsQueryKey,
  getGetTransactionsQueryKey,
  getGetConnectedWalletBalanceQueryKey,
} from "@workspace/api-client-react";
import { useDefaultBank } from "@/hooks/use-default-bank";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Loader2, Send, ShieldAlert, Fuel, Lock, Building2 } from "lucide-react";
import { EnhancedWithdrawalFlow } from "@/components/enhanced-withdrawal-flow";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  approved: "default",
  rejected: "destructive",
  awaiting_gas_fee: "outline",
  cancelled: "outline",
  expired: "destructive",
};

function GasFeeCountdown({ deadlineAt }: { deadlineAt: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const remaining = Math.max(0, Date.parse(deadlineAt) - now);
  if (remaining <= 0) return <span className="text-xs text-destructive">Expired</span>;
  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  return (
    <span className="text-xs font-mono text-amber-500" data-testid="text-gas-countdown">
      {mins}m {secs.toString().padStart(2, "0")}s
    </span>
  );
}

export function Withdrawals() {
  const { data: withdrawals, isLoading } = useGetWithdrawals();
  const { data: kyc } = useGetKycStatus();
  const { data: wallets } = useGetWallets();
  const { data: banks } = useGetBankAccounts();
  const { data: connectedWallets } = useGetConnectedWallets();
  const { data: gasFee } = useGetWithdrawalGasFee();
  const requestMutation = useRequestWithdrawal();
  const markFundedMutation = useMarkWithdrawalGasFeeFunded();
  const cancelMutation = useCancelMyWithdrawal();
  const queryClient = useQueryClient();
  const [txHashByWd, setTxHashByWd] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const [defaultBankId] = useDefaultBank();

  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"bank_transfer" | "crypto_wallet">("bank_transfer");
  const [destination, setDestination] = useState("");
  const [destinationTouched, setDestinationTouched] = useState(false);
  // When set, the withdrawal is funded by an on-chain transfer FROM this
  // connected wallet (rather than from the platform main balance). Only
  // available when method === "crypto_wallet".
  const [sourceWalletId] = useState<string>("platform");
  const [withdrawalAsset, setWithdrawalAsset] = useState<"ETH" | "USDT" | "USDC" | "DAI">("USDT");

  const main = wallets?.find((w) => w.type === "main");
  const kycApproved = kyc?.status === "approved";
  const hasConnectedWallet = (connectedWallets?.length ?? 0) > 0;
  const verifiedBanks = banks?.filter((b) => b.verified) ?? [];
  const hasVerifiedBank = verifiedBanks.length > 0;
  const cryptoBlocked = method === "crypto_wallet" && !hasConnectedWallet;
  const bankBlocked = method === "bank_transfer" && !hasVerifiedBank;
  const gasFeeBlocked = gasFee?.enabled && !gasFee?.sufficient;

  // Auto-fill the destination from the user's chosen default bank account.
  // We only fill while the user hasn't typed anything themselves and the
  // chosen method is bank_transfer, so a manual entry is never overwritten.
  const defaultBank = banks?.find((b) => b.id === defaultBankId);
  const firstConnectedWallet = connectedWallets?.[0];
  useEffect(() => {
    if (destinationTouched) return;
    if (method === "bank_transfer" && defaultBank) {
      setDestination(`${defaultBank.bankName} ••${defaultBank.last4}`);
    } else if (method === "crypto_wallet" && firstConnectedWallet) {
      setDestination(firstConnectedWallet.address);
    }
  }, [defaultBank, firstConnectedWallet, method, destinationTouched]);

  // Two-step confirm flow: clicking "Continue" validates and opens a
  // 10-second countdown modal. The actual mutation only fires once the
  // countdown reaches zero (or the user clicks "Submit now" inside the
  // modal). Cancel aborts the countdown without sending anything.
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [countdown, setCountdown] = useState(10);

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    if (cryptoBlocked) {
      toast({
        title: "Connect an external wallet first",
        description: "Crypto withdrawals must be sent to a wallet you have connected to your account.",
        variant: "destructive",
      });
      return;
    }
    if (bankBlocked) {
      toast({
        title: "Verified bank required",
        description: "Bank-transfer withdrawals require at least one verified bank account.",
        variant: "destructive",
      });
      return;
    }
    if (gasFeeBlocked) {
      toast({
        title: "Insufficient ETH for gas fees",
        description: gasFee?.message ?? "You need ETH in a connected wallet to cover gas fees.",
        variant: "destructive",
      });
      return;
    }
    if (!amount || Number(amount) <= 0) {
      toast({
        title: "Enter a valid amount",
        description: "Withdrawal amount must be greater than zero.",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Review your withdrawal",
      description: "Confirm the destination — submission will start in 10 seconds.",
    });
    setCountdown(10);
    setConfirmOpen(true);
  };

  // Tick the countdown while the modal is open. When it hits zero, fire
  // the actual mutation.
  useEffect(() => {
    if (!confirmOpen) return;
    if (countdown <= 0) {
      void submitWithdrawal();
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [confirmOpen, countdown]);

  const submitWithdrawal = async () => {
    const isOnChain = method === "crypto_wallet" && sourceWalletId !== "platform";
    setConfirmOpen(false);
    try {
      await requestMutation.mutateAsync({
        data: {
          amount: Number(amount),
          currency: isOnChain ? withdrawalAsset : "USD",
          method,
          destination,
          sourceWalletId: isOnChain ? sourceWalletId : null,
        },
      });
      await queryClient.invalidateQueries({ queryKey: getGetWithdrawalsQueryKey() });
      await queryClient.invalidateQueries({ queryKey: getGetWalletsQueryKey() });
      await queryClient.invalidateQueries({ queryKey: getGetTransactionsQueryKey() });
      if (isOnChain) {
        await queryClient.invalidateQueries({
          queryKey: getGetConnectedWalletBalanceQueryKey(sourceWalletId),
        });
      }
      toast({
        title: isOnChain ? "On-chain withdrawal broadcast" : "Withdrawal submitted",
        description: isOnChain
          ? "Funds sent on-chain from your connected wallet."
          : "Your request is pending admin approval.",
      });
      setAmount("");
      setDestination("");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Please try again.";
      toast({ title: "Withdrawal failed", description: message, variant: "destructive" });
    }
  };
  const isOnChainWithdrawal = method === "crypto_wallet" && sourceWalletId !== "platform";

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Withdrawals</h1>
        <p className="text-muted-foreground text-sm">
          Request a withdrawal from your main wallet. All requests are reviewed before payout.
        </p>
      </div>

      {!kycApproved && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex items-center gap-3 py-4">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            <div className="flex-1">
              <div className="font-medium">KYC verification required</div>
              <div className="text-sm text-muted-foreground">
                You need an approved KYC profile before requesting a withdrawal.
              </div>
            </div>
            <Link href="/kyc">
              <Button size="sm" variant="secondary">Go to KYC</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {gasFee?.enabled && (
        <Card className={gasFeeBlocked ? "border-destructive/40 bg-destructive/5" : "border-primary/30 bg-primary/5"}>
          <CardContent className="flex items-center gap-3 py-4">
            <Fuel className={`h-5 w-5 ${gasFeeBlocked ? "text-destructive" : "text-primary"}`} />
            <div className="flex-1">
              <div className="font-medium">
                ETH Gas Fee {gasFeeBlocked ? "— Insufficient ETH" : "— Requirement Met"}
              </div>
              <div className="text-sm text-muted-foreground">
                {gasFeeBlocked
                  ? `You need at least ${gasFee.requiredEthAmount} ETH in a connected wallet to withdraw. You currently have ${gasFee.userEthBalance} ETH.`
                  : `Gas fee requirement met (${gasFee.userEthBalance} ETH available, ${gasFee.requiredEthAmount} ETH required).`}
              </div>
            </div>
            {gasFeeBlocked && (
              <Link href="/wallets">
                <Button size="sm" variant="secondary">Deposit ETH</Button>
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      {bankBlocked && (
        <Card className="border-amber-500/40 bg-amber-500/5" data-testid="card-bank-locked-withdrawal">
          <CardContent className="flex items-center gap-3 py-4">
            <Lock className="h-5 w-5 text-amber-500" />
            <div className="flex-1">
              <div className="font-medium flex items-center gap-2">
                <Building2 className="h-4 w-4" /> Bank withdrawals are locked
              </div>
              <div className="text-sm text-muted-foreground">
                {(banks?.length ?? 0) > 0
                  ? "You've added a bank account but it isn't verified yet — bank withdrawals unlock once verification completes."
                  : "Link and verify a bank account to enable wire/ACH withdrawals. You can switch to a crypto wallet in the meantime."}
              </div>
            </div>
            <Link href="/banks">
              <Button size="sm" variant="secondary">
                {(banks?.length ?? 0) > 0 ? "View banks" : "Link bank"}
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {cryptoBlocked && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex items-center gap-3 py-4">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            <div className="flex-1">
              <div className="font-medium">External wallet required</div>
              <div className="text-sm text-muted-foreground">
                Crypto withdrawals can only be sent to a wallet you have
                connected to your account. This protects you from address-spoofing
                attacks.
              </div>
            </div>
            <Link href="/wallets">
              <Button size="sm" variant="secondary">Connect a wallet</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Enhanced Withdrawal Flow */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Request a Withdrawal (New Interface)
          </CardTitle>
          <CardDescription>
            Advanced withdrawal options with multiple sources and destinations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EnhancedWithdrawalFlow />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>New withdrawal</CardTitle>
            <CardDescription>
              Available: ${main ? main.balance.toLocaleString() : "0.00"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleContinue} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (USD)</Label>
                <Input
                  id="amount"
                  type="number"
                  min="1"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={!kycApproved}
                />
              </div>
              <div className="space-y-2">
                <Label>Method</Label>
                <Select
                  value={method}
                  onValueChange={(v) => setMethod(v as "bank_transfer" | "crypto_wallet")}
                  disabled={!kycApproved}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">Bank transfer</SelectItem>
                    <SelectItem value="crypto_wallet">Crypto wallet</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {method === "crypto_wallet" && hasConnectedWallet && (
                <p className="text-xs text-muted-foreground">
                  All withdrawals are routed through admin review and require an admin-set
                  gas fee before approval.
                </p>
              )}
              {isOnChainWithdrawal && (
                <div className="space-y-2">
                  <Label>Asset</Label>
                  <Select
                    value={withdrawalAsset}
                    onValueChange={(v) => setWithdrawalAsset(v as "ETH" | "USDT" | "USDC" | "DAI")}
                  >
                    <SelectTrigger data-testid="select-withdrawal-asset">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ETH">ETH</SelectItem>
                      <SelectItem value="USDT">USDT</SelectItem>
                      <SelectItem value="USDC">USDC</SelectItem>
                      <SelectItem value="DAI">DAI</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="destination">
                  {method === "bank_transfer" ? "Bank account or IBAN" : "Connected wallet"}
                </Label>
                {method === "crypto_wallet" && hasConnectedWallet ? (
                  <Select
                    value={destination}
                    onValueChange={(v) => {
                      setDestination(v);
                      setDestinationTouched(true);
                    }}
                    disabled={!kycApproved}
                  >
                    <SelectTrigger data-testid="select-connected-wallet">
                      <SelectValue placeholder="Pick a connected wallet" />
                    </SelectTrigger>
                    <SelectContent>
                      {connectedWallets!.map((w) => (
                        <SelectItem key={w.id} value={w.address}>
                          {w.walletType} — {w.address.slice(0, 6)}…{w.address.slice(-4)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id="destination"
                    required
                    value={destination}
                    onChange={(e) => {
                      setDestination(e.target.value);
                      setDestinationTouched(true);
                    }}
                    disabled={!kycApproved || cryptoBlocked}
                  />
                )}
                {method === "bank_transfer" && defaultBank && !destinationTouched && (
                  <p className="text-xs text-muted-foreground">
                    Auto-filled from your default account.{" "}
                    <Link href="/banks" className="underline">
                      Change default
                    </Link>
                  </p>
                )}
                {method === "crypto_wallet" && hasConnectedWallet && (
                  <p className="text-xs text-muted-foreground">
                    Only wallets you have connected to your account are eligible.{" "}
                    <Link href="/wallets" className="underline">Manage wallets</Link>
                  </p>
                )}
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={
                  !kycApproved ||
                  cryptoBlocked ||
                  bankBlocked ||
                  requestMutation.isPending
                }
              >
                {requestMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Continue
              </Button>
            </form>
            {confirmOpen && (
              <div
                role="dialog"
                aria-modal="true"
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
                data-testid="modal-withdrawal-confirm"
              >
                <div className="bg-card border border-border rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold">Confirm withdrawal</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Submitting in <span className="font-mono text-amber-500" data-testid="text-confirm-countdown">{countdown}</span> second{countdown === 1 ? "" : "s"}.
                      Cancel now if anything looks wrong.
                    </p>
                  </div>
                  <div className="rounded-md bg-muted/30 p-3 text-sm space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Amount</span>
                      <span className="font-medium">${Number(amount).toLocaleString()} {isOnChainWithdrawal ? withdrawalAsset : "USD"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Method</span>
                      <span className="capitalize">{method.replace("_", " ")}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">Destination</span>
                      <span className="font-mono text-xs text-right break-all">{destination}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      onClick={() => setConfirmOpen(false)}
                      data-testid="button-confirm-cancel"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => void submitWithdrawal()}
                      data-testid="button-confirm-submit-now"
                    >
                      Submit now
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>History</CardTitle>
            <CardDescription>Recent withdrawal requests</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-sm text-muted-foreground">Loading...</div>
            ) : !withdrawals || withdrawals.length === 0 ? (
              <div className="text-sm text-muted-foreground">No withdrawals yet.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Destination</TableHead>
                    <TableHead>Status / Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {withdrawals.map((w) => (
                    <TableRow key={w.id}>
                      <TableCell className="text-sm">
                        {format(new Date(w.createdAt), "MMM d, HH:mm")}
                      </TableCell>
                      <TableCell className="font-medium">
                        ${w.amount.toLocaleString()} {w.currency}
                      </TableCell>
                      <TableCell className="capitalize">
                        {w.method.replace("_", " ")}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{w.destination}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1.5">
                          <Badge variant={STATUS_VARIANT[w.status] ?? "outline"}>
                            {w.status.replace(/_/g, " ")}
                          </Badge>
                          {w.rejectionReason && (
                            <span className="text-xs text-muted-foreground">
                              {w.rejectionReason}
                            </span>
                          )}
                          {w.status === "awaiting_gas_fee" && w.gasFeeAmount != null && (
                            <div className="flex flex-col gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/5 p-2">
                              <div className="flex items-center justify-between text-xs">
                                <span>
                                  Gas fee:{" "}
                                  <span className="font-mono">{w.gasFeeAmount} ETH</span>
                                </span>
                                {w.gasFeeDeadlineAt && (
                                  <GasFeeCountdown deadlineAt={w.gasFeeDeadlineAt} />
                                )}
                              </div>
                              <Input
                                placeholder="0x… tx hash"
                                value={txHashByWd[w.id] ?? ""}
                                onChange={(e) =>
                                  setTxHashByWd((m) => ({ ...m, [w.id]: e.target.value }))
                                }
                                className="h-8 text-xs font-mono"
                                data-testid={`input-gas-tx-${w.id}`}
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={async () => {
                                    const txHash = (txHashByWd[w.id] ?? "").trim();
                                    if (txHash.length < 10) {
                                      toast({
                                        title: "Tx hash required",
                                        description: "Paste the on-chain hash of your gas-fee payment.",
                                        variant: "destructive",
                                      });
                                      return;
                                    }
                                    await markFundedMutation.mutateAsync({
                                      withdrawalId: w.id,
                                      data: { txHash },
                                    });
                                    queryClient.invalidateQueries({ queryKey: getGetWithdrawalsQueryKey() });
                                    toast({ title: "Gas fee marked as funded" });
                                  }}
                                  disabled={markFundedMutation.isPending}
                                  data-testid={`button-mark-funded-${w.id}`}
                                >
                                  Mark funded
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={async () => {
                                    if (!confirm("Cancel this withdrawal? Your funds will be returned to your main wallet.")) return;
                                    await cancelMutation.mutateAsync({ withdrawalId: w.id });
                                    queryClient.invalidateQueries({ queryKey: getGetWithdrawalsQueryKey() });
                                    queryClient.invalidateQueries({ queryKey: getGetWalletsQueryKey() });
                                    queryClient.invalidateQueries({ queryKey: getGetTransactionsQueryKey() });
                                    toast({ title: "Withdrawal cancelled" });
                                  }}
                                  disabled={cancelMutation.isPending}
                                  data-testid={`button-cancel-${w.id}`}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          )}
                          {w.status === "pending" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 self-start text-xs text-muted-foreground hover:text-destructive"
                              onClick={async () => {
                                if (!confirm("Cancel this pending withdrawal?")) return;
                                await cancelMutation.mutateAsync({ withdrawalId: w.id });
                                queryClient.invalidateQueries({ queryKey: getGetWithdrawalsQueryKey() });
                                queryClient.invalidateQueries({ queryKey: getGetWalletsQueryKey() });
                                queryClient.invalidateQueries({ queryKey: getGetTransactionsQueryKey() });
                                toast({ title: "Withdrawal cancelled" });
                              }}
                              disabled={cancelMutation.isPending}
                              data-testid={`button-cancel-pending-${w.id}`}
                            >
                              Cancel request
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
