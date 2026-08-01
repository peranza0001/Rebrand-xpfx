import { useEffect, useState } from "react";
import { useLocation } from "wouter";

function DemoConfigEditor() {
  const [config, setConfig] = useState<any | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    void (async () => {
      const res = await fetch('/api/admin/demo-config', { credentials: 'include' });
      if (res.ok) setConfig(await res.json());
    })();
  }, []);

  const save = async () => {
    try {
      const res = await fetch('/api/admin/demo-config', { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(config) });
      if (!res.ok) throw new Error('Save failed');
      const updated = await res.json();
      setConfig(updated);
      toast({ title: 'Demo config updated' });
    } catch (err: unknown) {
      toast({ title: 'Failed to save demo config', variant: 'destructive', description: err instanceof Error ? err.message : String(err) });
    }
  };

  if (!config) return <div className="text-sm text-muted-foreground">Loading demo config...</div>;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-1 text-sm">
          <div className="text-muted-foreground">Default demo balance</div>
          <Input value={String(config.defaultBalance)} onChange={(e) => setConfig({ ...config, defaultBalance: Number(e.target.value) })} />
        </label>
        <label className="space-y-1 text-sm">
          <div className="text-muted-foreground">Default leverage</div>
          <Input value={String(config.defaultLeverage)} onChange={(e) => setConfig({ ...config, defaultLeverage: Number(e.target.value) })} />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-1 text-sm">
          <div className="text-muted-foreground">Volatility (per-tick)</div>
          <Input value={String(config.volatility)} onChange={(e) => setConfig({ ...config, volatility: Number(e.target.value) })} />
        </label>
        <label className="space-y-1 text-sm">
          <div className="text-muted-foreground">Spread</div>
          <Input value={String(config.spread)} onChange={(e) => setConfig({ ...config, spread: Number(e.target.value) })} />
        </label>
      </div>
      <div className="flex items-center gap-2">
        <Button onClick={save}><Save className="mr-2 h-4 w-4"/> Save</Button>
      </div>
    </div>
  );
}

function DemoActivityList() {
  const [rows, setRows] = useState<any[] | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    void (async () => {
      const res = await fetch('/api/admin/demo-activity', { credentials: 'include' });
      if (!res.ok) { toast({ title: 'Failed to load demo activity', variant: 'destructive' }); return; }
      setRows(await res.json());
    })();
  }, []);

  if (!rows) return <div className="text-sm text-muted-foreground">Loading demo activity...</div>;

  return (
    <div className="space-y-3">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Trades</TableHead>
            <TableHead>Demo transactions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.userId}>
              <TableCell>{r.email}</TableCell>
              <TableCell>{r.trades?.length ?? 0}</TableCell>
              <TableCell>{r.transactions?.length ?? 0}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
import {
  useGetAdminStats,
  useGetAdminUsers,
  useGetAdminWithdrawals,
  useGetAdminActivity,
  useGetAdminBanks,
  useGetAdminCards,
  useGetAdminPromotions,
  useGetAdminBilling,
  useDecideWithdrawal,
  useDecideKyc,
  useSetBankVerification,
  useSetCardDecision,
  useCreatePromotion,
  useUpdatePromotion,
  useDeletePromotion,
  useUpdateBillingDefaults,
  useUpdateUserBillingRates,
  useAdminMarkBillingPaid,
  getGetAdminWithdrawalsQueryKey,
  getGetAdminStatsQueryKey,
  getGetAdminUsersQueryKey,
  getGetAdminActivityQueryKey,
  getGetAdminBanksQueryKey,
  getGetAdminCardsQueryKey,
  getGetAdminPromotionsQueryKey,
  getGetAdminBillingQueryKey,
} from "@workspace/api-client-react";
import type {
  AdminCardSummary,
  AdminBillingUserRow,
  BillingRates,
  Promotion,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Users,
  DollarSign,
  ArrowDownToLine,
  ArrowUpToLine,
  ShieldCheck,
  Activity,
  Loader2,
  Check,
  X,
  Landmark,
  ShieldOff,
  Plus,
  Trash2,
  Pencil,
  Receipt,
  Save,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function Admin() {
  const { data: stats } = useGetAdminStats();
  const { data: users } = useGetAdminUsers();
  const { data: withdrawals } = useGetAdminWithdrawals();
  const { data: activity } = useGetAdminActivity();
  const { data: banks } = useGetAdminBanks();
  const decideWithdrawal = useDecideWithdrawal();
  const decideKyc = useDecideKyc();
  const setBankVerification = useSetBankVerification();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [reasonOpen, setReasonOpen] = useState<{
    kind: "withdrawal" | "kyc";
    id: string;
    decision: "approve" | "reject";
  } | null>(null);
  const [reason, setReason] = useState("");

  const refreshAdmin = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: getGetAdminStatsQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getGetAdminWithdrawalsQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getGetAdminUsersQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getGetAdminActivityQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getGetAdminBanksQueryKey() }),
    ]);
  };

  /**
   * Toggle the `verified` flag on a linked bank account. Optimistic feedback
   * is shown via toast; the list is refetched so users immediately see the
   * Verified/Pending badge update.
   */
  const submitBankVerification = async (
    bankId: string,
    verified: boolean,
  ) => {
    try {
      await setBankVerification.mutateAsync({
        bankId,
        data: { verified },
      });
      await refreshAdmin();
      toast({
        title: verified ? "Account verified" : "Verification revoked",
      });
    } catch (e: unknown) {
      toast({
        title: "Failed",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    }
  };

  const submitWithdrawalDecision = async (
    id: string,
    decision: "approve" | "reject",
    rejectionReason?: string,
  ) => {
    try {
      await decideWithdrawal.mutateAsync({
        withdrawalId: id,
        data: { decision, reason: rejectionReason ?? null },
      });
      await refreshAdmin();
      toast({ title: `Withdrawal ${decision}d` });
    } catch (e: unknown) {
      toast({
        title: "Failed",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    }
  };

  const submitKycDecision = async (
    userId: string,
    decision: "approve" | "reject",
    rejectionReason?: string,
  ) => {
    try {
      await decideKyc.mutateAsync({
        userId,
        data: { decision, reason: rejectionReason ?? null },
      });
      await refreshAdmin();
      toast({ title: `KYC ${decision}d` });
    } catch (e: unknown) {
      toast({
        title: "Failed",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    }
  };

  const closeReasonDialog = async () => {
    if (!reasonOpen) return;
    if (reasonOpen.kind === "withdrawal") {
      await submitWithdrawalDecision(reasonOpen.id, reasonOpen.decision, reason);
    } else {
      await submitKycDecision(reasonOpen.id, reasonOpen.decision, reason);
    }
    setReasonOpen(null);
    setReason("");
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Admin console</h1>
        <p className="text-muted-foreground text-sm">
          Platform oversight: review withdrawals, manage KYC, monitor activity.
        </p>
      </div>

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          <StatTile icon={Users} label="Users" value={stats.totalUsers} />
          <StatTile
            icon={ArrowDownToLine}
            label="Deposits"
            value={`$${stats.totalDeposits.toLocaleString()}`}
          />
          <StatTile
            icon={ArrowUpToLine}
            label="Withdrawals"
            value={`$${stats.totalWithdrawals.toLocaleString()}`}
          />
          <StatTile
            icon={DollarSign}
            label="Pending withdrawals"
            value={stats.pendingWithdrawals}
            highlight={stats.pendingWithdrawals > 0}
          />
          <StatTile
            icon={ShieldCheck}
            label="Pending KYC"
            value={stats.pendingKyc}
            highlight={stats.pendingKyc > 0}
          />
          <StatTile icon={Activity} label="Active trades" value={stats.activeTrades} />
        </div>
      )}

      <Tabs defaultValue="withdrawals">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
          <TabsTrigger value="users">Users &amp; KYC</TabsTrigger>
          <TabsTrigger value="banks">Bank Accounts</TabsTrigger>
          <TabsTrigger value="cards">Cards</TabsTrigger>
          <TabsTrigger value="promotions">Promotions</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="demo">Demo</TabsTrigger>
          <TabsTrigger value="live-chat">Live chat</TabsTrigger>
        </TabsList>

        <TabsContent value="withdrawals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Withdrawal queue</CardTitle>
              <CardDescription>Approve or reject pending payouts</CardDescription>
            </CardHeader>
            <CardContent>
              {!withdrawals || withdrawals.length === 0 ? (
                <div className="text-sm text-muted-foreground">No withdrawals.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Destination</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {withdrawals.map((w) => (
                      <TableRow key={w.id}>
                        <TableCell className="text-xs">
                          {format(new Date(w.createdAt), "MMM d HH:mm")}
                        </TableCell>
                        <TableCell>{w.userName}</TableCell>
                        <TableCell className="font-medium">
                          ${w.amount.toLocaleString()}
                        </TableCell>
                        <TableCell className="capitalize">
                          {w.method.replace("_", " ")}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {w.destination}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              w.status === "pending"
                                ? "secondary"
                                : w.status === "approved"
                                  ? "default"
                                  : "destructive"
                            }
                          >
                            {w.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {w.status === "pending" ? (
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                onClick={() => submitWithdrawalDecision(w.id, "approve")}
                                disabled={decideWithdrawal.isPending}
                              >
                                <Check className="h-3 w-3 mr-1" /> Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() =>
                                  setReasonOpen({
                                    kind: "withdrawal",
                                    id: w.id,
                                    decision: "reject",
                                  })
                                }
                              >
                                <X className="h-3 w-3 mr-1" /> Reject
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              {w.decidedAt ? format(new Date(w.decidedAt), "MMM d HH:mm") : "—"}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All users</CardTitle>
              <CardDescription>
                Approve or reject KYC submissions inline.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!users ? (
                <div className="text-sm text-muted-foreground">Loading...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Country</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>KYC</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.fullName}</TableCell>
                        <TableCell className="text-sm">{u.email}</TableCell>
                        <TableCell>{u.country}</TableCell>
                        <TableCell>
                          <Badge variant={u.role === "admin" ? "default" : "outline"}>
                            {u.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              u.kycStatus === "approved"
                                ? "default"
                                : u.kycStatus === "pending"
                                  ? "secondary"
                                  : u.kycStatus === "rejected"
                                    ? "destructive"
                                    : "outline"
                            }
                          >
                            {u.kycStatus}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          ${u.balance.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {u.kycStatus === "pending" ? (
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                onClick={() => submitKycDecision(u.id, "approve")}
                                disabled={decideKyc.isPending}
                              >
                                <Check className="h-3 w-3 mr-1" /> Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() =>
                                  setReasonOpen({
                                    kind: "kyc",
                                    id: u.id,
                                    decision: "reject",
                                  })
                                }
                              >
                                <X className="h-3 w-3 mr-1" /> Reject
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="banks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Linked bank accounts</CardTitle>
              <CardDescription>
                Verify or revoke verification on any linked bank or card.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!banks ? (
                <div className="text-sm text-muted-foreground">Loading...</div>
              ) : banks.length === 0 ? (
                <div className="flex flex-col items-center text-center py-12 text-muted-foreground">
                  <Landmark className="h-10 w-10 opacity-40 mb-3" />
                  <div className="text-sm">No accounts linked yet.</div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Linked</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Bank / Issuer</TableHead>
                        <TableHead>Holder</TableHead>
                        <TableHead>Last 4</TableHead>
                        <TableHead>Currency</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {banks.map((b) => (
                        <TableRow key={b.id}>
                          <TableCell className="text-xs">
                            {format(new Date(b.createdAt), "MMM d HH:mm")}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{b.userName}</div>
                            <div className="text-xs text-muted-foreground">
                              {b.userEmail}
                            </div>
                          </TableCell>
                          <TableCell>{b.bankName}</TableCell>
                          <TableCell className="text-sm">
                            {b.accountHolder}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            ••{b.last4}
                          </TableCell>
                          <TableCell>{b.currency}</TableCell>
                          <TableCell>
                            <Badge
                              variant={b.verified ? "default" : "secondary"}
                              className={
                                b.verified
                                  ? "bg-success/15 text-success border-success/20"
                                  : "bg-warning/15 text-warning border-warning/20"
                              }
                            >
                              {b.verified ? "Verified" : "Pending"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {b.verified ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  submitBankVerification(b.id, false)
                                }
                                disabled={setBankVerification.isPending}
                                data-testid={`button-unverify-${b.id}`}
                              >
                                <ShieldOff className="h-3 w-3 mr-1" />
                                Revoke
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() =>
                                  submitBankVerification(b.id, true)
                                }
                                disabled={setBankVerification.isPending}
                                data-testid={`button-verify-${b.id}`}
                              >
                                <ShieldCheck className="h-3 w-3 mr-1" />
                                Verify
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cards" className="space-y-4">
          <AdminCardsPanel />
        </TabsContent>

        <TabsContent value="promotions" className="space-y-4">
          <AdminPromotionsPanel />
        </TabsContent>

        <TabsContent value="billing" className="space-y-4">
          <AdminBillingPanel />
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Platform activity</CardTitle>
              <CardDescription>Most recent events</CardDescription>
            </CardHeader>
            <CardContent>
              {!activity || activity.length === 0 ? (
                <div className="text-sm text-muted-foreground">No activity yet.</div>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {activity.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-start gap-3 p-3 rounded-md border border-border"
                    >
                      <div className="flex-1">
                        <div className="text-sm font-medium">{a.detail}</div>
                        <div className="text-xs text-muted-foreground">
                          {a.actorName ?? "system"} · {a.action} ·{" "}
                          {format(new Date(a.timestamp), "MMM d HH:mm:ss")}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="demo" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Demo platform configuration</CardTitle>
              <CardDescription>Adjust demo defaults and simulation parameters.</CardDescription>
            </CardHeader>
            <CardContent>
              <DemoConfigEditor />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Demo activity</CardTitle>
              <CardDescription>Recent demo trades & transactions across users.</CardDescription>
            </CardHeader>
            <CardContent>
              <DemoActivityList />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="live-chat" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Live chat</CardTitle>
              <CardDescription>Open live chat sessions awaiting admin response.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button variant="secondary" onClick={() => window.location.href = '/admin/live-chat'}>
                  Open live chat console
                </Button>
                <p className="text-sm text-muted-foreground">
                  This opens the dedicated admin live chat panel in a new view.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!reasonOpen} onOpenChange={(open) => !open && setReasonOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject {reasonOpen?.kind}</DialogTitle>
            <DialogDescription>
              Provide a reason. The user will see this message.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Input
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Document quality too low"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReasonOpen(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={closeReasonDialog}
              disabled={decideWithdrawal.isPending || decideKyc.isPending}
            >
              {(decideWithdrawal.isPending || decideKyc.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Confirm rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ------------------------------ Admin: Cards ------------------------------ */

function AdminCardsPanel() {
  const { data: cards } = useGetAdminCards();
  const setDecision = useSetCardDecision();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [rejectTarget, setRejectTarget] = useState<AdminCardSummary | null>(null);
  const [reason, setReason] = useState("");

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: getGetAdminCardsQueryKey() });

  const decide = async (id: string, decision: "approve" | "reject", r?: string) => {
    try {
      await setDecision.mutateAsync({
        cardId: id,
        data: { decision, reason: r ?? null },
      });
      await refresh();
      toast({ title: `Card ${decision}d` });
    } catch (e: unknown) {
      toast({
        title: "Failed",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Card requests</CardTitle>
        <CardDescription>Review pending card requests from customers.</CardDescription>
      </CardHeader>
      <CardContent>
        {!cards || cards.length === 0 ? (
          <div className="text-sm text-muted-foreground">No card requests yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Last 4</TableHead>
                  <TableHead>Limit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cards.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-xs">
                      {format(new Date(c.createdAt), "MMM d HH:mm")}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{c.userName}</div>
                      <div className="text-xs text-muted-foreground">{c.userEmail}</div>
                    </TableCell>
                    <TableCell className="capitalize">{c.type}</TableCell>
                    <TableCell className="capitalize">{c.brand}</TableCell>
                    <TableCell className="font-mono text-xs">••{c.last4}</TableCell>
                    <TableCell className="font-mono text-xs">
                      ${(c.creditLimit ?? c.spendLimit).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          c.status === "pending"
                            ? "secondary"
                            : c.status === "approved"
                              ? "default"
                              : c.status === "rejected"
                                ? "destructive"
                                : "outline"
                        }
                      >
                        {c.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {c.status === "pending" ? (
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            onClick={() => decide(c.id, "approve")}
                            disabled={setDecision.isPending}
                            data-testid={`button-approve-card-${c.id}`}
                          >
                            <Check className="h-3 w-3 mr-1" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setRejectTarget(c);
                              setReason("");
                            }}
                            disabled={setDecision.isPending}
                            data-testid={`button-reject-card-${c.id}`}
                          >
                            <X className="h-3 w-3 mr-1" /> Reject
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog
        open={!!rejectTarget}
        onOpenChange={(open) => !open && setRejectTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject card request</DialogTitle>
            <DialogDescription>
              Tell the customer why their card request is being declined.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-reason">Reason</Label>
            <Input
              id="reject-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Account does not meet eligibility requirements"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (rejectTarget) {
                  await decide(rejectTarget.id, "reject", reason);
                  setRejectTarget(null);
                }
              }}
              disabled={setDecision.isPending}
            >
              {setDecision.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Reject card
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

/* --------------------------- Admin: Promotions --------------------------- */

const EMPTY_PROMO_FORM = {
  title: "",
  description: "",
  category: "bonus" as Promotion["category"],
  reward: "",
  rewardAmount: 0,
  currency: "USD",
  startsAt: new Date().toISOString().slice(0, 10),
  endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  active: true,
};

function AdminPromotionsPanel() {
  const { data: promotions } = useGetAdminPromotions();
  const createMutation = useCreatePromotion();
  const updateMutation = useUpdatePromotion();
  const deleteMutation = useDeletePromotion();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [form, setForm] = useState<typeof EMPTY_PROMO_FORM>(EMPTY_PROMO_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: getGetAdminPromotionsQueryKey() });

  const openCreate = () => {
    setForm(EMPTY_PROMO_FORM);
    setEditingId(null);
    setOpen(true);
  };

  const openEdit = (p: Promotion) => {
    setForm({
      title: p.title,
      description: p.description,
      category: p.category,
      reward: p.reward,
      rewardAmount: p.rewardAmount,
      currency: p.currency,
      startsAt: p.startsAt.slice(0, 10),
      endsAt: p.endsAt.slice(0, 10),
      active: p.active,
    });
    setEditingId(p.id);
    setOpen(true);
  };

  const submit = async () => {
    const payload = {
      ...form,
      rewardAmount: Number(form.rewardAmount),
      startsAt: new Date(form.startsAt).toISOString(),
      endsAt: new Date(form.endsAt).toISOString(),
    };
    try {
      if (editingId) {
        await updateMutation.mutateAsync({ promotionId: editingId, data: payload });
        toast({ title: "Promotion updated" });
      } else {
        await createMutation.mutateAsync({ data: payload });
        toast({ title: "Promotion created" });
      }
      await refresh();
      setOpen(false);
    } catch (e: unknown) {
      toast({
        title: "Save failed",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteMutation.mutateAsync({ promotionId: id });
      await refresh();
      toast({ title: "Promotion deleted" });
    } catch (e: unknown) {
      toast({
        title: "Delete failed",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>Promotions &amp; activities</CardTitle>
          <CardDescription>
            Create and manage earning campaigns shown to customers.
          </CardDescription>
        </div>
        <Button size="sm" onClick={openCreate} data-testid="button-create-promotion">
          <Plus className="h-3.5 w-3.5 mr-1" /> New promotion
        </Button>
      </CardHeader>
      <CardContent>
        {!promotions || promotions.length === 0 ? (
          <div className="text-sm text-muted-foreground">No promotions yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Reward</TableHead>
                  <TableHead>Window</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {promotions.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.title}</TableCell>
                    <TableCell className="capitalize">{p.category}</TableCell>
                    <TableCell className="text-xs">{p.reward}</TableCell>
                    <TableCell className="text-xs">
                      {format(new Date(p.startsAt), "MMM d")} →{" "}
                      {format(new Date(p.endsAt), "MMM d")}
                    </TableCell>
                    <TableCell>{p.participants.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={p.active ? "default" : "outline"}>
                        {p.active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEdit(p)}
                          data-testid={`button-edit-promo-${p.id}`}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => remove(p.id)}
                          data-testid={`button-delete-promo-${p.id}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit promotion" : "New promotion"}</DialogTitle>
            <DialogDescription>
              Promotions appear to customers under the "Promotions" page.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="promo-title">Title</Label>
              <Input
                id="promo-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="promo-desc">Description</Label>
              <Textarea
                id="promo-desc"
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Category</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm({ ...form, category: v as Promotion["category"] })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bonus">Bonus</SelectItem>
                    <SelectItem value="contest">Contest</SelectItem>
                    <SelectItem value="cashback">Cashback</SelectItem>
                    <SelectItem value="education">Education</SelectItem>
                    <SelectItem value="referral">Referral</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="promo-currency">Currency</Label>
                <Input
                  id="promo-currency"
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="promo-reward">Reward (label)</Label>
                <Input
                  id="promo-reward"
                  value={form.reward}
                  onChange={(e) => setForm({ ...form, reward: e.target.value })}
                  placeholder="e.g. $1,000 bonus"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="promo-amount">Reward amount</Label>
                <Input
                  id="promo-amount"
                  type="number"
                  value={form.rewardAmount}
                  onChange={(e) => setForm({ ...form, rewardAmount: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="promo-start">Starts</Label>
                <Input
                  id="promo-start"
                  type="date"
                  value={form.startsAt}
                  onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="promo-end">Ends</Label>
                <Input
                  id="promo-end"
                  type="date"
                  value={form.endsAt}
                  onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-md border border-border p-3">
              <div>
                <div className="text-sm font-medium">Active</div>
                <div className="text-xs text-muted-foreground">
                  Inactive promotions are hidden from customers.
                </div>
              </div>
              <Switch
                checked={form.active}
                onCheckedChange={(v) => setForm({ ...form, active: v })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              onClick={submit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {editingId ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

/* ----------------------------- Admin: Billing ----------------------------- */

const EMPTY_RATES: BillingRates = { maintenance: 0, aiBot: 0, activeTrade: 0, currency: "USD" };

function AdminBillingPanel() {
  const { data } = useGetAdminBilling();
  const updateDefaults = useUpdateBillingDefaults();
  const updateUserRates = useUpdateUserBillingRates();
  const markPaid = useAdminMarkBillingPaid();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [defaults, setDefaults] = useState<BillingRates>(EMPTY_RATES);
  const [editingRow, setEditingRow] = useState<AdminBillingUserRow | null>(null);
  const [rowRates, setRowRates] = useState<BillingRates>(EMPTY_RATES);

  // Sync local form state when server data arrives.
  if (data && defaults === EMPTY_RATES) {
    setDefaults(data.defaults);
  }

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: getGetAdminBillingQueryKey() });

  const saveDefaults = async () => {
    try {
      await updateDefaults.mutateAsync({ data: defaults });
      await refresh();
      toast({ title: "Default rates updated" });
    } catch (e: unknown) {
      toast({
        title: "Save failed",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    }
  };

  const openEdit = (row: AdminBillingUserRow) => {
    setEditingRow(row);
    setRowRates(row.rates);
  };

  const saveRowRates = async () => {
    if (!editingRow) return;
    try {
      await updateUserRates.mutateAsync({ userId: editingRow.userId, data: rowRates });
      await refresh();
      toast({ title: `Rates updated for ${editingRow.userName}` });
      setEditingRow(null);
    } catch (e: unknown) {
      toast({
        title: "Save failed",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    }
  };

  const settleAll = async (row: AdminBillingUserRow) => {
    try {
      await markPaid.mutateAsync({
        userId: row.userId,
        data: { items: ["maintenance", "aiBot", "activeTrade"], walletId: null },
      });
      await refresh();
      toast({ title: `Marked ${row.userName}'s cycle as paid` });
    } catch (e: unknown) {
      toast({
        title: "Failed",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-4 w-4" /> Default monthly rates
          </CardTitle>
          <CardDescription>
            Applies to all new users and to anyone without a per-user override.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label htmlFor="def-maintenance">Maintenance</Label>
              <Input
                id="def-maintenance"
                type="number"
                value={defaults.maintenance}
                onChange={(e) => setDefaults({ ...defaults, maintenance: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="def-aibot">AI bot</Label>
              <Input
                id="def-aibot"
                type="number"
                value={defaults.aiBot}
                onChange={(e) => setDefaults({ ...defaults, aiBot: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="def-trade">Per active trade</Label>
              <Input
                id="def-trade"
                type="number"
                value={defaults.activeTrade}
                onChange={(e) => setDefaults({ ...defaults, activeTrade: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="def-currency">Currency</Label>
              <Input
                id="def-currency"
                value={defaults.currency}
                onChange={(e) => setDefaults({ ...defaults, currency: e.target.value.toUpperCase() })}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={saveDefaults}
              disabled={updateDefaults.isPending}
              data-testid="button-save-billing-defaults"
            >
              {updateDefaults.isPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
              <Save className="h-3.5 w-3.5 mr-1" /> Save defaults
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Per-user billing</CardTitle>
          <CardDescription>
            Set custom rates per user and manually mark cycles as paid for offline settlements.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!data || data.rows.length === 0 ? (
            <div className="text-sm text-muted-foreground">No users yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Cycle</TableHead>
                    <TableHead>Maint</TableHead>
                    <TableHead>AI</TableHead>
                    <TableHead>Trade</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.rows.map((r) => (
                    <TableRow key={r.userId}>
                      <TableCell>
                        <div className="font-medium text-sm">{r.userName}</div>
                        <div className="text-xs text-muted-foreground">{r.userEmail}</div>
                      </TableCell>
                      <TableCell className="text-xs">{r.currentCycle.cycleId}</TableCell>
                      <TableCell className="font-mono text-xs">${r.rates.maintenance}</TableCell>
                      <TableCell className="font-mono text-xs">${r.rates.aiBot}</TableCell>
                      <TableCell className="font-mono text-xs">${r.rates.activeTrade}</TableCell>
                      <TableCell className="font-mono text-xs">
                        ${r.currentCycle.totalDue.toFixed(2)}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        ${r.currentCycle.totalPaid.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            r.currentCycle.fullySettled
                              ? "default"
                              : r.usingDefaults
                                ? "outline"
                                : "secondary"
                          }
                        >
                          {r.currentCycle.fullySettled
                            ? "Settled"
                            : r.usingDefaults
                              ? "Defaults"
                              : "Custom"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEdit(r)}
                            data-testid={`button-edit-rates-${r.userId}`}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          {!r.currentCycle.fullySettled && (
                            <Button
                              size="sm"
                              onClick={() => settleAll(r)}
                              disabled={markPaid.isPending}
                              data-testid={`button-settle-${r.userId}`}
                            >
                              <Check className="h-3 w-3 mr-1" /> Mark paid
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={!!editingRow}
        onOpenChange={(open) => !open && setEditingRow(null)}
      >
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit billing rates</DialogTitle>
            <DialogDescription>
              {editingRow?.userName} · {editingRow?.userEmail}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="row-maintenance">Maintenance</Label>
              <Input
                id="row-maintenance"
                type="number"
                value={rowRates.maintenance}
                onChange={(e) => setRowRates({ ...rowRates, maintenance: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="row-aibot">AI assistance bot</Label>
              <Input
                id="row-aibot"
                type="number"
                value={rowRates.aiBot}
                onChange={(e) => setRowRates({ ...rowRates, aiBot: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="row-trade">Per active trade</Label>
              <Input
                id="row-trade"
                type="number"
                value={rowRates.activeTrade}
                onChange={(e) => setRowRates({ ...rowRates, activeTrade: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="row-currency">Currency</Label>
              <Input
                id="row-currency"
                value={rowRates.currency}
                onChange={(e) => setRowRates({ ...rowRates, currency: e.target.value.toUpperCase() })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRow(null)}>Cancel</Button>
            <Button
              onClick={saveRowRates}
              disabled={updateUserRates.isPending}
              data-testid="button-save-row-rates"
            >
              {updateUserRates.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? "border-primary/40" : ""}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center gap-2 text-muted-foreground text-xs">
          <Icon className="h-3.5 w-3.5" />
          {label}
        </div>
        <div className="text-xl font-bold mt-1">{value}</div>
      </CardContent>
    </Card>
  );
}
