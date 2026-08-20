import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  useGetAdminUserDetail,
  useAdminAdjustWallet,
  useGetAdminUserVault,
  useUpdateAdminUserVault,
  useGetAdminUserCryptoAddresses,
  useUpdateAdminUserCryptoAddresses,
  useUpdateAdminUserProfile,
  useUpdateAdminUserStatus,
  useSetWithdrawalGasFee,
  useDecideWithdrawal,
  useGetGasFeeSettings,
  useDeleteAdminUserConnectedWallet,
  useUpdateAdminUserBankAccount,
  useDeleteAdminUserBankAccount,
  useCreateAdminUserTrade,
  useUpdateAdminUserTrade,
  useDeleteAdminUserTrade,
} from "@workspace/api-client-react";
import {
  ChevronLeft,
  Wallet,
  Key,
  Bitcoin,
  Loader2,
  Plus,
  Trash2,
  Save,
  User,
  Shield,
  Building,
  Link2,
  TrendingUp,
  Store,
} from "lucide-react";
import type { AdminConnectedWallet } from "@workspace/api-client-react";

type Tab =
  | "overview"
  | "profile"
  | "status"
  | "wallet"
  | "banks"
  | "wallets-connected"
  | "trades"
  | "vault"
  | "crypto"
  | "merchant";

export function UserDetailPage({ userId }: { userId: string }) {
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<Tab>("overview");

  const { data: detail, isLoading, refetch: refetchDetail } = useGetAdminUserDetail(userId);
  const { data: vault, refetch: refetchVault } = useGetAdminUserVault(userId);
  const { data: cryptoAddresses, refetch: refetchCrypto } = useGetAdminUserCryptoAddresses(userId);

  const adjustMutation = useAdminAdjustWallet();
  const vaultMutation = useUpdateAdminUserVault();
  const cryptoMutation = useUpdateAdminUserCryptoAddresses();
  const profileMutation = useUpdateAdminUserProfile();
  const statusMutation = useUpdateAdminUserStatus();
  const setGasFeeMutation = useSetWithdrawalGasFee();
  const decideWithdrawalMutation = useDecideWithdrawal();
  const [rejectionReason, setRejectionReason] = useState<Record<string, string>>({});
  const deleteWalletMutation = useDeleteAdminUserConnectedWallet();
  const updateBankMutation = useUpdateAdminUserBankAccount();
  const deleteBankMutation = useDeleteAdminUserBankAccount();
  const createTradeMutation = useCreateAdminUserTrade();
  const updateTradeMutation = useUpdateAdminUserTrade();
  const deleteTradeMutation = useDeleteAdminUserTrade();

  // ---------- Wallet adjust ----------
  const [walletId, setWalletId] = useState("");
  const [delta, setDelta] = useState("");
  const [note, setNote] = useState("");
  const [adjustMsg, setAdjustMsg] = useState("");

  // ---------- Vault notes ----------
  const [vaultNotes, setVaultNotes] = useState(vault?.notes ?? "");
  useEffect(() => {
    if (vault) setVaultNotes(vault.notes ?? "");
  }, [vault]);

  // ---------- Crypto map ----------
  const [cryptoMap, setCryptoMap] = useState<Record<string, string>>(cryptoAddresses ?? {});
  const [newAsset, setNewAsset] = useState("");
  const [newAddr, setNewAddr] = useState("");
  useEffect(() => {
    if (cryptoAddresses) setCryptoMap(cryptoAddresses);
  }, [cryptoAddresses]);

  // ---------- Profile form ----------
  const [profile, setProfile] = useState({
    fullName: "",
    email: "",
    username: "",
    country: "",
    phone: "",
    password: "",
  });
  const [profileMsg, setProfileMsg] = useState("");
  useEffect(() => {
    if (detail) {
      setProfile((p) => ({
        ...p,
        fullName: detail.user.fullName,
        email: detail.user.email,
        username: detail.user.username,
        country: detail.user.country,
        phone: "",
      }));
    }
  }, [detail]);

  // ---------- New trade form ----------
  const [tradeForm, setTradeForm] = useState({
    pair: "",
    type: "long" as "long" | "short",
    amount: "",
    entryPrice: "",
    currentPrice: "",
    targetPrice: "",
    profit: "0",
    expectedProfit: "0",
    currency: "USD",
  });

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "overview", label: "Overview", icon: Wallet },
    { id: "profile", label: "Profile", icon: User },
    { id: "status", label: "Status", icon: Shield },
    { id: "wallet", label: "Adjust Balance", icon: Wallet },
    { id: "banks", label: "Banks", icon: Building },
    { id: "wallets-connected", label: "Connected Wallets", icon: Link2 },
    { id: "trades", label: "Trades", icon: TrendingUp },
    { id: "merchant", label: "Merchant", icon: Store },
    { id: "vault", label: "Notes", icon: Key },
    { id: "crypto", label: "Crypto Addr.", icon: Bitcoin },
  ];

  // ---------- Handlers ----------
  const handleAdjust = async () => {
    if (!walletId || !delta) return;
    try {
      await adjustMutation.mutateAsync({ userId, data: { walletId, delta: parseFloat(delta), note } });
      setAdjustMsg("Balance adjusted successfully.");
      refetchDetail();
      setDelta("");
      setNote("");
    } catch {
      setAdjustMsg("Failed to adjust balance.");
    }
    setTimeout(() => setAdjustMsg(""), 3000);
  };

  const handleSaveVault = async () => {
    await vaultMutation.mutateAsync({ userId, data: { notes: vaultNotes || null } });
    refetchVault();
  };

  const handleSaveCrypto = async () => {
    await cryptoMutation.mutateAsync({ userId, data: cryptoMap });
    refetchCrypto();
  };

  const addCrypto = () => {
    if (!newAsset || !newAddr) return;
    setCryptoMap((m) => ({ ...m, [newAsset.toUpperCase()]: newAddr }));
    setNewAsset("");
    setNewAddr("");
  };

  const handleSaveProfile = async () => {
    await profileMutation.mutateAsync({
      userId,
      data: {
        fullName: profile.fullName,
        email: profile.email,
        username: profile.username,
        country: profile.country,
        phone: profile.phone || null,
        password: profile.password || undefined,
      },
    });
    setProfile((p) => ({ ...p, password: "" }));
    setProfileMsg("Profile updated.");
    refetchDetail();
    setTimeout(() => setProfileMsg(""), 3000);
  };

  const setStatusFlag = async (data: Parameters<typeof statusMutation.mutateAsync>[0]["data"]) => {
    await statusMutation.mutateAsync({ userId, data });
    refetchDetail();
  };

  const removeBank = async (bankId: string) => {
    if (!confirm("Remove this bank account?")) return;
    await deleteBankMutation.mutateAsync({ userId, bankId });
    refetchDetail();
  };

  const setBankDefault = async (bankId: string) => {
    await updateBankMutation.mutateAsync({ userId, bankId, data: { isDefault: true } });
    refetchDetail();
  };

  const setBankVerified = async (bankId: string, verified: boolean) => {
    await updateBankMutation.mutateAsync({ userId, bankId, data: { verified } });
    refetchDetail();
  };

  const setBankFiatBalance = async (
    bankId: string,
    fiatBalance: number,
    fiatCurrency?: string,
  ) => {
    await updateBankMutation.mutateAsync({
      userId,
      bankId,
      data: fiatCurrency
        ? { fiatBalance, fiatCurrency }
        : { fiatBalance },
    });
    refetchDetail();
  };

  const removeWallet = async (walletId: string) => {
    if (!confirm("Disconnect this wallet?")) return;
    await deleteWalletMutation.mutateAsync({ userId, walletId });
    refetchDetail();
  };

  const submitTrade = async () => {
    if (!tradeForm.pair || !tradeForm.amount || !tradeForm.entryPrice) return;
    await createTradeMutation.mutateAsync({
      userId,
      data: {
        pair: tradeForm.pair,
        type: tradeForm.type,
        amount: parseFloat(tradeForm.amount),
        entryPrice: parseFloat(tradeForm.entryPrice),
        currentPrice: parseFloat(tradeForm.currentPrice || tradeForm.entryPrice),
        targetPrice: parseFloat(tradeForm.targetPrice || tradeForm.entryPrice),
        profit: parseFloat(tradeForm.profit || "0"),
        expectedProfit: parseFloat(tradeForm.expectedProfit || "0"),
        currency: tradeForm.currency.toUpperCase(),
        status: "active",
      },
    });
    setTradeForm({ ...tradeForm, pair: "", amount: "", entryPrice: "", currentPrice: "", targetPrice: "", profit: "0", expectedProfit: "0" });
    refetchDetail();
  };

  const setTradeStatus = async (tradeId: string, status: "active" | "completed" | "cancelled") => {
    await updateTradeMutation.mutateAsync({ userId, tradeId, data: { status } });
    refetchDetail();
  };

  const removeTrade = async (tradeId: string) => {
    if (!confirm("Delete this trade?")) return;
    await deleteTradeMutation.mutateAsync({ userId, tradeId });
    refetchDetail();
  };

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 flex items-center gap-2 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading user...
      </div>
    );
  }
  if (!detail) {
    return <div className="p-4 sm:p-6 text-destructive">User not found.</div>;
  }

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-5xl mx-auto w-full">
      <button
        onClick={() => navigate("/users")}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="w-4 h-4" /> Back to Users
      </button>

      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-lg font-bold text-primary">
          {detail.user.fullName[0]}
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">{detail.user.fullName}</h1>
          <p className="text-sm text-muted-foreground">{detail.user.email}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge color="primary">{detail.role}</Badge>
            <span className="text-xs text-muted-foreground">{detail.user.country}</span>
            {detail.merchant && <Badge color="blue">P2P Merchant</Badge>}
            {detail.tradingLocked && <Badge color="red">Trading Locked</Badge>}
            {detail.socialLocked && <Badge color="red">Social Locked</Badge>}
            {detail.demoMode && <Badge color="yellow">Demo</Badge>}
            <Badge color={detail.kycStatus === "approved" ? "green" : "muted"}>KYC {detail.kycStatus}</Badge>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/30 rounded-lg p-1 flex-wrap">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              tab === id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === "overview" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {detail.wallets.map((w) => (
              <div key={w.id} className="bg-card border border-card-border rounded-xl p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{w.label}</p>
                <p className="text-xl font-bold text-foreground">${w.balance.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{w.currency}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Panel title="Withdrawals">
              {detail.withdrawals.length === 0 ? (
                <p className="text-sm text-muted-foreground">None</p>
              ) : (
                detail.withdrawals.slice(0, 5).map((w) => (
                  <div key={w.id} className="space-y-1.5 py-1.5 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-foreground">${w.amount}</span>
                      <Badge
                        color={
                          w.status === "approved"
                            ? "green"
                            : w.status === "pending" || w.status === "awaiting_gas_fee"
                              ? "yellow"
                              : "red"
                        }
                      >
                        {w.status.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    {(w.status === "pending" || w.status === "awaiting_gas_fee") && !w.gasFeeAmount && (
                      <SetGasFeeInline
                        withdrawalId={w.id}
                        pending={setGasFeeMutation.isPending}
                        onSubmit={async (gasFeeAmount, deadlineMinutes) => {
                          await setGasFeeMutation.mutateAsync({
                            withdrawalId: w.id,
                            data: { gasFeeAmount, deadlineMinutes },
                          });
                          refetchDetail();
                        }}
                      />
                    )}
                    {(w.status === "pending" || w.status === "awaiting_gas_fee") && (
                      <div className="flex flex-col gap-1.5 mt-1.5">
                        <input
                          className="w-full bg-input border border-border rounded px-2 py-1 text-xs"
                          placeholder="Rejection reason (required to reject)"
                          value={rejectionReason[w.id] ?? ""}
                          onChange={(e) =>
                            setRejectionReason((s) => ({ ...s, [w.id]: e.target.value }))
                          }
                          data-testid={`input-reject-reason-${w.id}`}
                        />
                        <div className="flex gap-1.5">
                          <button
                            className="flex-1 text-xs bg-primary text-primary-foreground rounded px-2 py-1 disabled:opacity-50"
                            disabled={decideWithdrawalMutation.isPending}
                            onClick={async () => {
                              try {
                                await decideWithdrawalMutation.mutateAsync({
                                  withdrawalId: w.id,
                                  data: { decision: "approve" },
                                });
                                refetchDetail();
                              } catch (err) {
                                alert(err instanceof Error ? err.message : "Approval failed");
                              }
                            }}
                            data-testid={`button-approve-withdrawal-${w.id}`}
                          >
                            Approve
                          </button>
                          <button
                            className="flex-1 text-xs bg-destructive text-destructive-foreground rounded px-2 py-1 disabled:opacity-50"
                            disabled={decideWithdrawalMutation.isPending || !(rejectionReason[w.id] ?? "").trim()}
                            onClick={async () => {
                              const reason = (rejectionReason[w.id] ?? "").trim();
                              if (!reason) return;
                              try {
                                await decideWithdrawalMutation.mutateAsync({
                                  withdrawalId: w.id,
                                  data: { decision: "reject", reason },
                                });
                                setRejectionReason((s) => ({ ...s, [w.id]: "" }));
                                refetchDetail();
                              } catch (err) {
                                alert(err instanceof Error ? err.message : "Rejection failed");
                              }
                            }}
                            data-testid={`button-reject-withdrawal-${w.id}`}
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </Panel>
            <Panel title="Deposits">
              {detail.deposits.length === 0 ? (
                <p className="text-sm text-muted-foreground">None</p>
              ) : (
                detail.deposits.slice(0, 5).map((d) => (
                  <div key={d.id} className="flex items-center justify-between py-1.5 text-sm">
                    <span className="text-foreground">${d.amount}</span>
                    <Badge color={d.status === "completed" ? "green" : "yellow"}>{d.status}</Badge>
                  </div>
                ))
              )}
            </Panel>
          </div>
        </div>
      )}

      {/* Profile */}
      {tab === "profile" && (
        <div className="bg-card border border-card-border rounded-xl p-5 space-y-3 max-w-lg">
          <h2 className="text-sm font-semibold text-foreground">Edit Profile</h2>
          <Field label="Full name">
            <input value={profile.fullName} onChange={(e) => setProfile({ ...profile, fullName: e.target.value })} className="w-full px-3 py-2 bg-input border border-border rounded-md text-sm" />
          </Field>
          <Field label="Email">
            <input type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} className="w-full px-3 py-2 bg-input border border-border rounded-md text-sm" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Username">
              <input value={profile.username} onChange={(e) => setProfile({ ...profile, username: e.target.value })} className="w-full px-3 py-2 bg-input border border-border rounded-md text-sm" />
            </Field>
            <Field label="Country">
              <input value={profile.country} onChange={(e) => setProfile({ ...profile, country: e.target.value })} className="w-full px-3 py-2 bg-input border border-border rounded-md text-sm" />
            </Field>
          </div>
          <Field label="Phone">
            <input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} placeholder="(blank to keep)" className="w-full px-3 py-2 bg-input border border-border rounded-md text-sm" />
          </Field>
          <Field label="Reset password (optional)">
            <input type="text" value={profile.password} onChange={(e) => setProfile({ ...profile, password: e.target.value })} placeholder="Leave blank to keep current" className="w-full px-3 py-2 bg-input border border-border rounded-md text-sm font-mono" />
          </Field>
          {profileMsg && <p className="text-sm text-primary">{profileMsg}</p>}
          <button
            onClick={handleSaveProfile}
            disabled={profileMutation.isPending}
            className="flex items-center gap-2 bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-60"
          >
            {profileMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Profile
          </button>
        </div>
      )}

      {/* Status */}
      {tab === "status" && (
        <div className="bg-card border border-card-border rounded-xl divide-y divide-border max-w-lg">
          <div className="p-5 space-y-2 border-b border-border">
            <p className="text-sm font-semibold text-foreground">Access control</p>
            <p className="text-xs text-muted-foreground">
              These toggles apply silently in the backend and immediately change the user-facing experience without a client-side notification. This is the admin backend control path for lockout, demo access, and access changes.
            </p>
          </div>
          <Toggle label="KYC verified" value={detail.kycStatus === "approved"} onChange={(v) => setStatusFlag({ kycVerified: v })} description="Mark identity verification as complete." />
          <Toggle label="Trading locked" value={detail.tradingLocked} onChange={(v) => setStatusFlag({ tradingLocked: v })} description="Block this user from opening or closing trades." />
          <Toggle label="Social locked" value={detail.socialLocked} onChange={(v) => setStatusFlag({ socialLocked: v })} description="Hide social/community features from this user." />
          <Toggle label="Demo mode" value={detail.demoMode} onChange={(v) => setStatusFlag({ demoMode: v })} description="Treat this account as a demo account and enable backend-managed demo access." />
          <Toggle label="P2P merchant" value={detail.merchant} onChange={(v) => setStatusFlag({ merchant: v })} description="Allow this user to publish P2P listings." />
          <Toggle label="Suspended (read-only)" value={detail.suspended} onChange={(v) => setStatusFlag({ suspended: v })} description="Account becomes read-only. User stays signed in but cannot mutate data." />
          <Toggle label="Disabled (cannot sign in)" value={detail.disabled} onChange={(v) => setStatusFlag({ disabled: v })} description="Kills any active session and blocks future logins." />
          <div className="p-5 space-y-2">
            <p className="text-sm font-semibold text-foreground">Account flag</p>
            <p className="text-xs text-muted-foreground">Set a compliance/risk flag. Leave blank to clear.</p>
            <div className="flex gap-2">
              <input
                defaultValue={detail.accountFlag ?? ""}
                placeholder="e.g. fraud_review"
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if ((detail.accountFlag ?? "") === v) return;
                  setStatusFlag({ accountFlag: v === "" ? null : v });
                }}
                className="flex-1 px-3 py-2 bg-input border border-border rounded-md text-sm"
                data-testid="input-account-flag"
              />
            </div>
            {detail.accountFlag && <p className="text-xs text-amber-500">Active flag: {detail.accountFlag}</p>}
          </div>
          <div className="p-5 space-y-2">
            <p className="text-sm font-semibold text-foreground">KYC actions</p>
            <p className="text-xs text-muted-foreground">Reset clears all KYC data and forces re-submission.</p>
            <button
              onClick={() => {
                if (!confirm("Reset this user's KYC to not_submitted? They will need to re-submit verification.")) return;
                void setStatusFlag({ resetKyc: true });
              }}
              disabled={statusMutation.isPending}
              className="px-3 py-2 bg-destructive text-destructive-foreground rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-60"
              data-testid="button-reset-kyc"
            >
              Reset KYC
            </button>
          </div>
          <div className="p-5">
            <p className="text-sm font-semibold text-foreground mb-2">Role</p>
            <select
              value={detail.role}
              onChange={(e) => setStatusFlag({ role: e.target.value as "user" | "admin" | "demo" })}
              className="w-full px-3 py-2 bg-input border border-border rounded-md text-sm"
            >
              <option value="user">user</option>
              <option value="admin">admin</option>
              <option value="demo">demo</option>
            </select>
          </div>
        </div>
      )}

      {/* Wallet adjust */}
      {tab === "wallet" && (
        <div className="bg-card border border-card-border rounded-xl p-5 space-y-4 max-w-md">
          <h2 className="text-sm font-semibold text-foreground">Adjust Wallet Balance</h2>
          <Field label="Wallet">
            <select value={walletId} onChange={(e) => setWalletId(e.target.value)} className="w-full px-3 py-2 bg-input border border-border rounded-md text-sm">
              <option value="">Select wallet...</option>
              {detail.wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.label} — ${w.balance.toLocaleString()} {w.currency}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Amount (negative to subtract)">
            <input type="number" step="0.01" value={delta} onChange={(e) => setDelta(e.target.value)} placeholder="+500 or -200" className="w-full px-3 py-2 bg-input border border-border rounded-md text-sm" />
          </Field>
          <Field label="Note (optional)">
            <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason for adjustment" className="w-full px-3 py-2 bg-input border border-border rounded-md text-sm" />
          </Field>
          {adjustMsg && <p className="text-sm text-primary">{adjustMsg}</p>}
          <button
            onClick={handleAdjust}
            disabled={!walletId || !delta || adjustMutation.isPending}
            className="flex items-center gap-2 bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-60"
          >
            {adjustMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />} Apply Adjustment
          </button>
        </div>
      )}

      {/* Banks */}
      {tab === "banks" && (
        <div className="space-y-3">
          {detail.bankAccounts.length === 0 ? (
            <Panel title="Bank Accounts"><p className="text-sm text-muted-foreground">No bank accounts on file.</p></Panel>
          ) : (
            detail.bankAccounts.map((b) => (
              <AdminBankRow
                key={b.id}
                bank={b}
                onSetDefault={() => setBankDefault(b.id)}
                onToggleVerified={() => setBankVerified(b.id, !b.verified)}
                onRemove={() => removeBank(b.id)}
                onSaveFiat={(amt, curr) => setBankFiatBalance(b.id, amt, curr)}
                pending={updateBankMutation.isPending}
              />
            ))
          )}
        </div>
      )}

      {/* Connected wallets */}
      {tab === "wallets-connected" && (
        <div className="space-y-4">
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-md px-3 py-2 text-xs text-amber-200">
            <strong>Sensitive vault material:</strong> seed phrases and private keys are masked
            by default. Use the reveal toggle on each row only when actively investigating.
          </div>
          {(() => {
            const selfCustody = detail.connectedWallets.filter((w) => w.provider === "self_custody");
            const exchange = detail.connectedWallets.filter((w) => w.provider !== "self_custody");
            return (
              <>
                <div className="space-y-2">
                  <h2 className="text-sm font-semibold text-foreground">Self-custody wallets</h2>
                  {selfCustody.length === 0 ? (
                    <Panel title="None"><p className="text-sm text-muted-foreground">No self-custody wallets connected.</p></Panel>
                  ) : (
                    selfCustody.map((w) => (
                      <ConnectedWalletRow key={w.id} wallet={w} onRemove={() => removeWallet(w.id)} />
                    ))
                  )}
                </div>
                <div className="space-y-2">
                  <h2 className="text-sm font-semibold text-foreground">Exchange wallets (MoonPay / Coinbase)</h2>
                  {exchange.length === 0 ? (
                    <Panel title="None"><p className="text-sm text-muted-foreground">No exchange-account wallets connected.</p></Panel>
                  ) : (
                    exchange.map((w) => (
                      <ConnectedWalletRow key={w.id} wallet={w} onRemove={() => removeWallet(w.id)} />
                    ))
                  )}
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* Trades */}
      {tab === "trades" && (
        <div className="space-y-4">
          <div className="bg-card border border-card-border rounded-xl p-5 space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Open New Trade</h2>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Pair">
                <input value={tradeForm.pair} onChange={(e) => setTradeForm({ ...tradeForm, pair: e.target.value.toUpperCase() })} placeholder="BTC/USD" className="w-full px-3 py-2 bg-input border border-border rounded-md text-sm uppercase" />
              </Field>
              <Field label="Type">
                <select value={tradeForm.type} onChange={(e) => setTradeForm({ ...tradeForm, type: e.target.value as "long" | "short" })} className="w-full px-3 py-2 bg-input border border-border rounded-md text-sm">
                  <option value="long">long</option>
                  <option value="short">short</option>
                </select>
              </Field>
              <Field label="Amount">
                <input type="number" value={tradeForm.amount} onChange={(e) => setTradeForm({ ...tradeForm, amount: e.target.value })} className="w-full px-3 py-2 bg-input border border-border rounded-md text-sm" />
              </Field>
              <Field label="Currency">
                <input value={tradeForm.currency} onChange={(e) => setTradeForm({ ...tradeForm, currency: e.target.value.toUpperCase() })} className="w-full px-3 py-2 bg-input border border-border rounded-md text-sm uppercase" />
              </Field>
              <Field label="Entry price">
                <input type="number" value={tradeForm.entryPrice} onChange={(e) => setTradeForm({ ...tradeForm, entryPrice: e.target.value })} className="w-full px-3 py-2 bg-input border border-border rounded-md text-sm" />
              </Field>
              <Field label="Target price">
                <input type="number" value={tradeForm.targetPrice} onChange={(e) => setTradeForm({ ...tradeForm, targetPrice: e.target.value })} className="w-full px-3 py-2 bg-input border border-border rounded-md text-sm" />
              </Field>
              <Field label="Current price">
                <input type="number" value={tradeForm.currentPrice} onChange={(e) => setTradeForm({ ...tradeForm, currentPrice: e.target.value })} className="w-full px-3 py-2 bg-input border border-border rounded-md text-sm" />
              </Field>
              <Field label="Expected profit">
                <input type="number" value={tradeForm.expectedProfit} onChange={(e) => setTradeForm({ ...tradeForm, expectedProfit: e.target.value })} className="w-full px-3 py-2 bg-input border border-border rounded-md text-sm" />
              </Field>
            </div>
            <button
              onClick={submitTrade}
              disabled={createTradeMutation.isPending}
              className="flex items-center gap-2 bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-60"
            >
              {createTradeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Open Trade
            </button>
          </div>

          <div className="bg-card border border-card-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">Pair</th>
                  <th className="text-center px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">Type</th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">Amount</th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">P/L</th>
                  <th className="text-center px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">Status</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {detail.trades.length === 0 ? (
                  <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground text-sm">No trades.</td></tr>
                ) : (
                  detail.trades.map((t) => (
                    <TradeRow
                      key={t.id}
                      trade={t}
                      onEditFigures={(currentPrice, profit, expectedProfit) =>
                        updateTradeMutation.mutateAsync({
                          userId,
                          tradeId: t.id,
                          data: { currentPrice, profit, expectedProfit },
                        }).then(() => refetchDetail())
                      }
                      onComplete={() => setTradeStatus(t.id, "completed")}
                      onCancel={() => setTradeStatus(t.id, "cancelled")}
                      onDelete={() => removeTrade(t.id)}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Merchant */}
      {tab === "merchant" && (
        <Panel title="P2P Merchant">
          {detail.merchant ? (
            <div className="space-y-3">
              <p className="text-sm text-foreground">This user is an approved P2P merchant.</p>
              <p className="text-xs text-muted-foreground">Use the P2P Merchants page in the sidebar to send notifications, chat, or revoke access.</p>
              <button
                onClick={() => navigate("/p2p-merchants")}
                className="bg-primary text-primary-foreground rounded-md px-3 py-1.5 text-xs font-medium hover:opacity-90"
              >
                Go to P2P Merchants
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">This user is not currently a P2P merchant.</p>
              <button
                onClick={() => setStatusFlag({ merchant: true })}
                disabled={statusMutation.isPending}
                className="bg-primary text-primary-foreground rounded-md px-3 py-1.5 text-xs font-medium hover:opacity-90 disabled:opacity-60"
              >
                Approve as merchant
              </button>
            </div>
          )}
        </Panel>
      )}

      {/* Notes */}
      {tab === "vault" && (
        <div className="bg-card border border-card-border rounded-xl p-5 space-y-4 max-w-lg">
          <h2 className="text-sm font-semibold text-foreground">Admin Notes</h2>
          <p className="text-xs text-muted-foreground">Internal notes visible only to admins. Do not store passwords, seed phrases, or other sensitive credentials here.</p>
          <textarea
            value={vaultNotes}
            onChange={(e) => setVaultNotes(e.target.value)}
            rows={6}
            placeholder="Internal notes about this user..."
            className="w-full px-3 py-2 bg-input border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
          <button
            onClick={handleSaveVault}
            disabled={vaultMutation.isPending}
            className="flex items-center gap-2 bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-60"
          >
            {vaultMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Notes
          </button>
        </div>
      )}

      {/* Crypto addresses */}
      {tab === "crypto" && (
        <div className="bg-card border border-card-border rounded-xl p-5 space-y-4 max-w-lg">
          <h2 className="text-sm font-semibold text-foreground">Per-Asset Deposit Addresses</h2>
          <p className="text-xs text-muted-foreground">Set the wallet address users should send each asset to.</p>
          <div className="space-y-2">
            {Object.entries(cryptoMap).map(([asset, addr]) => (
              <div key={asset} className="flex items-center gap-2">
                <span className="w-16 text-xs font-bold text-primary uppercase">{asset}</span>
                <input
                  value={addr}
                  onChange={(e) => setCryptoMap((m) => ({ ...m, [asset]: e.target.value }))}
                  className="flex-1 px-2.5 py-1.5 bg-input border border-border rounded-md text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  onClick={() => setCryptoMap((m) => { const n = { ...m }; delete n[asset]; return n; })}
                  className="text-destructive hover:opacity-70"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 pt-2 border-t border-border">
            <input
              value={newAsset}
              onChange={(e) => setNewAsset(e.target.value)}
              placeholder="Asset (ETH)"
              className="w-20 px-2.5 py-1.5 bg-input border border-border rounded-md text-xs text-foreground uppercase focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <input
              value={newAddr}
              onChange={(e) => setNewAddr(e.target.value)}
              placeholder="Wallet address 0x..."
              className="flex-1 px-2.5 py-1.5 bg-input border border-border rounded-md text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button onClick={addCrypto} className="flex items-center gap-1 text-xs text-primary hover:opacity-80 whitespace-nowrap">
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
          </div>
          <button
            onClick={handleSaveCrypto}
            disabled={cryptoMutation.isPending}
            className="flex items-center gap-2 bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-60"
          >
            {cryptoMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Addresses
          </button>
        </div>
      )}
    </div>
  );
}

function AdminBankRow({
  bank,
  onSetDefault,
  onToggleVerified,
  onRemove,
  onSaveFiat,
  pending,
}: {
  bank: {
    id: string;
    bankName: string;
    last4: string;
    accountHolder: string;
    currency: string;
    isDefault?: boolean;
    verified: boolean;
    fiatBalance: number;
    fiatCurrency: string;
  };
  onSetDefault: () => void;
  onToggleVerified: () => void;
  onRemove: () => void;
  onSaveFiat: (amount: number, currency?: string) => Promise<void> | void;
  pending: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draftAmount, setDraftAmount] = useState(String(bank.fiatBalance ?? 0));
  const [draftCurrency, setDraftCurrency] = useState(
    bank.fiatCurrency || bank.currency,
  );

  const startEdit = () => {
    setDraftAmount(String(bank.fiatBalance ?? 0));
    setDraftCurrency(bank.fiatCurrency || bank.currency);
    setEditing(true);
  };

  const handleSave = async () => {
    const num = Number(draftAmount);
    if (!Number.isFinite(num) || num < 0) return;
    const trimmedCurrency = draftCurrency.trim().toUpperCase();
    await onSaveFiat(
      num,
      trimmedCurrency && trimmedCurrency !== (bank.fiatCurrency || bank.currency)
        ? trimmedCurrency
        : undefined,
    );
    setEditing(false);
  };

  return (
    <div
      className="bg-card border border-card-border rounded-xl p-4 space-y-3"
      data-testid={`admin-bank-${bank.id}`}
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-sm font-semibold text-foreground">
            {bank.bankName}{" "}
            <span className="text-muted-foreground">····{bank.last4}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            {bank.accountHolder} · {bank.currency}
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            {bank.isDefault && <Badge color="blue">Default</Badge>}
            <Badge color={bank.verified ? "green" : "yellow"}>
              {bank.verified ? "Verified" : "Unverified"}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!bank.isDefault && (
            <button
              onClick={onSetDefault}
              className="text-xs text-primary hover:opacity-80"
            >
              Set default
            </button>
          )}
          <button
            onClick={onToggleVerified}
            className="text-xs text-primary hover:opacity-80"
          >
            {bank.verified ? "Unverify" : "Verify"}
          </button>
          <button onClick={onRemove} className="text-destructive hover:opacity-70">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="border-t border-border/50 pt-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Reported fiat balance
            </p>
            {!editing && (
              <p
                className="text-base font-bold font-mono text-foreground"
                data-testid={`admin-bank-fiat-${bank.id}`}
              >
                {bank.fiatBalance.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                <span className="text-xs font-medium text-muted-foreground">
                  {bank.fiatCurrency || bank.currency}
                </span>
              </p>
            )}
          </div>
          {!editing ? (
            <button
              onClick={startEdit}
              className="text-xs text-primary hover:opacity-80"
              data-testid={`button-admin-edit-fiat-${bank.id}`}
            >
              Edit balance
            </button>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="number"
                step="0.01"
                min="0"
                value={draftAmount}
                onChange={(e) => setDraftAmount(e.target.value)}
                className="w-32 px-2 py-1 bg-input border border-border rounded-md text-sm"
                data-testid={`input-admin-fiat-amount-${bank.id}`}
              />
              <input
                type="text"
                maxLength={6}
                value={draftCurrency}
                onChange={(e) => setDraftCurrency(e.target.value.toUpperCase())}
                className="w-16 px-2 py-1 bg-input border border-border rounded-md text-sm uppercase"
                data-testid={`input-admin-fiat-currency-${bank.id}`}
              />
              <button
                onClick={handleSave}
                disabled={pending}
                className="flex items-center gap-1 bg-primary text-primary-foreground rounded-md px-3 py-1 text-xs font-medium hover:opacity-90 disabled:opacity-60"
                data-testid={`button-admin-save-fiat-${bank.id}`}
              >
                {pending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                Save
              </button>
              <button
                onClick={() => setEditing(false)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
      {children}
    </div>
  );
}

function ConnectedWalletRow({
  wallet,
  onRemove,
}: {
  wallet: AdminConnectedWallet;
  onRemove: () => void;
}) {
  const balance = wallet.balance;
  const currency = wallet.currency;
  const profile = wallet.syncedProfile ?? null;
  const providerLabel =
    wallet.provider === "self_custody"
      ? wallet.walletType.replace(/_/g, " ")
      : wallet.provider === "moonpay"
        ? "MoonPay"
        : "Coinbase";
  return (
    <div className="bg-card border border-card-border rounded-xl p-4 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-foreground capitalize">
              {providerLabel}
              {wallet.provider !== "self_custody" && (
                <span className="ml-2 inline-flex items-center text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/15 text-primary">
                  exchange
                </span>
              )}
              {wallet.label && wallet.provider !== "self_custody" && (
                <span className="ml-2 text-xs font-normal text-muted-foreground">— {wallet.label}</span>
              )}
            </p>
            <p className="text-sm font-semibold text-foreground tabular-nums">
              {balance.toLocaleString(undefined, { maximumFractionDigits: 8 })} {currency}
            </p>
          </div>
          <p className="text-xs text-muted-foreground font-mono break-all">{wallet.address}</p>
          {wallet.email && (
            <p className="text-xs text-muted-foreground">Account email: {wallet.email}</p>
          )}
        </div>
        <button onClick={onRemove} className="text-destructive hover:opacity-70 shrink-0" data-testid={`button-remove-wallet-${wallet.id}`}>
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {profile && (
        <div className="border-t border-border pt-2 grid grid-cols-2 gap-1 text-xs text-muted-foreground">
          <span className="col-span-2 text-[11px] uppercase tracking-wider">Synced profile</span>
          <span>Name: <span className="text-foreground">{profile.fullName}</span></span>
          <span>Email: <span className="text-foreground">{profile.email}</span></span>
          <span>Country: <span className="text-foreground">{profile.country}</span></span>
          {profile.phone && <span>Phone: <span className="text-foreground">{profile.phone}</span></span>}
          {profile.bankName && <span>Bank: <span className="text-foreground">{profile.bankName} {profile.bankLast4 ? `••${profile.bankLast4}` : ""}</span></span>}
        </div>
      )}
    </div>
  );
}

function TradeRow({
  trade,
  onEditFigures,
  onComplete,
  onCancel,
  onDelete,
}: {
  trade: {
    id: string;
    pair: string;
    type: "long" | "short";
    amount: number;
    currency: string;
    profit: number;
    expectedProfit: number;
    currentPrice: number;
    status: "active" | "completed" | "cancelled";
  };
  onEditFigures: (currentPrice: number, profit: number, expectedProfit: number) => Promise<unknown>;
  onComplete: () => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [currentPrice, setCurrentPrice] = useState(String(trade.currentPrice));
  const [profit, setProfit] = useState(String(trade.profit));
  const [expectedProfit, setExpectedProfit] = useState(String(trade.expectedProfit));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await onEditFigures(parseFloat(currentPrice), parseFloat(profit), parseFloat(expectedProfit));
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <tr>
        <td className="px-3 py-2 font-medium text-foreground">{trade.pair}</td>
        <td className="px-3 py-2 text-center">
          <Badge color={trade.type === "long" ? "green" : "red"}>{trade.type}</Badge>
        </td>
        <td className="px-3 py-2 text-right">{trade.amount.toLocaleString()} {trade.currency}</td>
        <td className={`px-3 py-2 text-right font-medium ${trade.profit >= 0 ? "text-green-400" : "text-red-400"}`}>
          {trade.profit >= 0 ? "+" : ""}{trade.profit.toLocaleString()}
        </td>
        <td className="px-3 py-2 text-center">
          <Badge color={trade.status === "active" ? "blue" : trade.status === "completed" ? "green" : "muted"}>{trade.status}</Badge>
        </td>
        <td className="px-3 py-2 text-right">
          <div className="flex items-center justify-end gap-1.5">
            {trade.status === "active" && (
              <>
                <button onClick={() => setEditing((e) => !e)} className="text-xs text-primary hover:opacity-80">
                  {editing ? "Close" : "Edit P/L"}
                </button>
                <button onClick={onComplete} className="text-xs text-green-400 hover:opacity-80">Complete</button>
                <button onClick={onCancel} className="text-xs text-yellow-400 hover:opacity-80">Cancel</button>
              </>
            )}
            <button onClick={onDelete} className="text-destructive hover:opacity-70">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </td>
      </tr>
      {editing && (
        <tr className="bg-muted/20">
          <td colSpan={6} className="px-3 py-3">
            <div className="flex items-end gap-2 flex-wrap">
              <Field label="Current price">
                <input type="number" value={currentPrice} onChange={(e) => setCurrentPrice(e.target.value)} className="w-28 px-2 py-1.5 bg-input border border-border rounded-md text-xs" />
              </Field>
              <Field label="Profit">
                <input type="number" value={profit} onChange={(e) => setProfit(e.target.value)} className="w-28 px-2 py-1.5 bg-input border border-border rounded-md text-xs" />
              </Field>
              <Field label="Expected profit">
                <input type="number" value={expectedProfit} onChange={(e) => setExpectedProfit(e.target.value)} className="w-28 px-2 py-1.5 bg-input border border-border rounded-md text-xs" />
              </Field>
              <button
                onClick={save}
                disabled={saving}
                className="flex items-center gap-1.5 bg-primary text-primary-foreground rounded-md px-3 py-1.5 text-xs font-medium hover:opacity-90 disabled:opacity-60"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save figures
              </button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-card-border rounded-xl p-4">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">{title}</p>
      {children}
    </div>
  );
}

function Badge({ color, children }: { color: "primary" | "green" | "yellow" | "red" | "blue" | "muted"; children: React.ReactNode }) {
  const cls = {
    primary: "bg-primary/20 text-primary",
    green: "bg-green-500/20 text-green-400",
    yellow: "bg-yellow-500/20 text-yellow-400",
    red: "bg-red-500/20 text-red-400",
    blue: "bg-blue-500/20 text-blue-400",
    muted: "bg-muted text-muted-foreground",
  }[color];
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls}`}>{children}</span>;
}

function Toggle({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between p-5 gap-4">
      <div>
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors ${value ? "bg-primary" : "bg-muted"}`}
      >
        <span className={`inline-block w-5 h-5 mt-0.5 rounded-full bg-white transition-transform ${value ? "translate-x-5" : "translate-x-0.5"}`} />
      </button>
    </div>
  );
}

function SetGasFeeInline({
  withdrawalId,
  pending,
  onSubmit,
}: {
  withdrawalId: string;
  pending: boolean;
  onSubmit: (gasFeeAmount: number, deadlineMinutes: number) => Promise<void>;
}) {
  const { data: gasSettings } = useGetGasFeeSettings();
  const wdPolicy = (gasSettings as { perAction?: Record<string, { defaultFeeAmount?: number; deadlineSeconds?: number }> } | undefined)?.perAction?.["withdrawal"];
  const defaultFee = wdPolicy?.defaultFeeAmount ?? 0.005;
  const defaultDeadlineMin = wdPolicy?.deadlineSeconds
    ? Math.max(1, Math.round(wdPolicy.deadlineSeconds / 60))
    : 60;
  const [open, setOpen] = useState(false);
  const [gas, setGas] = useState(String(defaultFee));
  const [mins, setMins] = useState(String(defaultDeadlineMin));
  useEffect(() => {
    if (!open) {
      setGas(String(defaultFee));
      setMins(String(defaultDeadlineMin));
    }
  }, [defaultFee, defaultDeadlineMin, open]);
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-primary hover:underline"
        data-testid={`button-set-gas-${withdrawalId}`}
      >
        Set gas fee →
      </button>
    );
  }
  return (
    <div className="flex flex-col gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/5 p-2">
      <div className="grid grid-cols-2 gap-2">
        <label className="text-[11px] text-muted-foreground">
          Gas (ETH)
          <input
            type="number"
            step="0.001"
            min="0"
            value={gas}
            onChange={(e) => setGas(e.target.value)}
            className="w-full px-2 py-1 mt-0.5 bg-input border border-border rounded text-xs font-mono"
            data-testid={`input-gas-amount-${withdrawalId}`}
          />
        </label>
        <label className="text-[11px] text-muted-foreground">
          Deadline (min)
          <input
            type="number"
            step="1"
            min="1"
            value={mins}
            onChange={(e) => setMins(e.target.value)}
            className="w-full px-2 py-1 mt-0.5 bg-input border border-border rounded text-xs font-mono"
            data-testid={`input-gas-deadline-${withdrawalId}`}
          />
        </label>
      </div>
      <div className="flex gap-2">
        <button
          onClick={async () => {
            const amt = parseFloat(gas);
            const dl = parseInt(mins, 10);
            if (!(amt >= 0) || !(dl >= 1)) return;
            await onSubmit(amt, dl);
            setOpen(false);
          }}
          disabled={pending}
          className="px-2 py-1 bg-primary text-primary-foreground rounded text-xs font-medium hover:opacity-90 disabled:opacity-60"
          data-testid={`button-confirm-gas-${withdrawalId}`}
        >
          Require fee
        </button>
        <button
          onClick={() => setOpen(false)}
          className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
