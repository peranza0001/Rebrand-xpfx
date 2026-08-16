// Authenticated user's dashboard — modern professional trading interface
import { useEffect, useState } from "react";
import { Link } from "wouter";
import {
  ArrowDownToLine, ArrowUpFromLine, TrendingUp, TrendingDown, Users,
  Wallet, ShieldCheck, ShieldAlert, Activity, ArrowRight, Plus,
  Repeat, Briefcase, Bell, Award, BookOpen, ArrowUp, ArrowDown,
  Lock, FileText, Calendar as CalIcon, Zap, Target, BarChart3, TrendingUpIcon, Flame, Shield,
} from "lucide-react";
import {
  useGetCurrentUser, useGetWallets, useGetSocialTradingWallet,
  useGetTransactions, useGetTrades, useGetKycStatus, useGetBankAccounts,
  useGetWithdrawals, useGetReferralInfo, useGetConnectedWallets, useGetCards,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useLiveMarkets, formatPrice } from "@/lib/market-data";
import { useAuth } from "@/lib/auth";
import { WalletRequiredBanner } from "@/components/wallet-required-banner";
import { BuyCryptoDialog } from "@/components/BuyCryptoDialog";
import { DemoExperienceBanner } from "@/components/demo-experience-banner";
import { fetchFeatureAccess, getFeatureAccess, type FeatureAccessState } from "@/lib/account-access";
import { ModernDashboardHeader } from "@/components/modern-dashboard-header";
import { ModernMarketWatchlist } from "@/components/modern-market-watchlist";
import { LiveTradeMonitor } from "@/components/live-trade-monitor";

export function Dashboard() {
  const { isDemo } = useAuth();
  const { data: user, isLoading: isLoadingUser } = useGetCurrentUser();
  const { data: wallets, isLoading: isLoadingWallets } = useGetWallets();
  const { data: socialWallet, isLoading: isLoadingSocial } = useGetSocialTradingWallet();
  const { data: transactions } = useGetTransactions();
  const { data: trades } = useGetTrades();
  const { data: kyc } = useGetKycStatus();
  const { data: banks } = useGetBankAccounts();
  const { data: withdrawals } = useGetWithdrawals();
  const { data: referral } = useGetReferralInfo();
  const { data: connectedWallets } = useGetConnectedWallets();
  const { data: cards } = useGetCards();
  const [featureAccess, setFeatureAccess] = useState<FeatureAccessState>(getFeatureAccess({}));

  useEffect(() => {
    void fetchFeatureAccess()
      .then(setFeatureAccess)
      .catch(() => setFeatureAccess(getFeatureAccess({})));
  }, []);

  const watchlist = useLiveMarkets().slice(0, 6);

  // Mask all monetary figures when the user has no connected external wallet.
  const hasConnectedWallet = (connectedWallets?.length ?? 0) > 0;
  const balancesMasked = !hasConnectedWallet;
  const verifiedBankCount = banks?.filter((b) => b.verified).length ?? 0;
  const hasVerifiedBank = verifiedBankCount > 0;
  const fmtMoney = (n: number) =>
    balancesMasked
      ? "——"
      : `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fmtSignedMoney = (n: number) =>
    balancesMasked
      ? "——"
      : `${n >= 0 ? "+" : ""}$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const totalBalance = wallets?.reduce((acc, w) => acc + w.balance, 0) || 0;
  const activeTrades = trades?.filter((t) => t.status === "active") ?? [];
  const openPnL = activeTrades.reduce(
    (acc, t) => acc + ((t.currentPrice - t.entryPrice) * t.amount * (t.type === "long" ? 1 : -1)),
    0,
  );
  const equity = totalBalance + openPnL;
  const usedMargin = activeTrades.reduce((acc, t) => acc + t.amount * t.entryPrice * 0.1, 0);
  const freeMargin = Math.max(equity - usedMargin, 0);
  const marginLevel = usedMargin > 0 ? (equity / usedMargin) * 100 : 0;
  const safeUsedMarginRatio = usedMargin > 0 ? (usedMargin / Math.max(equity, 1)) * 100 : 0;
  const recentTx = transactions?.slice(0, 5) ?? [];
  const pendingWithdrawals = withdrawals?.filter((w) => w.status === "pending").length ?? 0;
  const verifiedBanks = verifiedBankCount;
  const liveTradeSnapshots = activeTrades.slice(0, 4).map((trade) => {
    const side = trade.type === "long" ? "buy" : "sell";
    const pnl = (trade.currentPrice - trade.entryPrice) * trade.amount * (trade.type === "long" ? 1 : -1);
    const pnlPct = trade.entryPrice > 0
      ? (((trade.currentPrice - trade.entryPrice) / trade.entryPrice) * 100) * (trade.type === "long" ? 1 : -1)
      : 0;

    return {
      id: trade.id,
      symbol: trade.pair,
      side,
      entryPrice: trade.entryPrice,
      currentPrice: trade.currentPrice,
      size: trade.amount,
      pnl,
      pnlPercent: pnlPct,
      stopLoss: trade.entryPrice * (trade.type === "long" ? 0.98 : 1.02),
      takeProfit: trade.entryPrice * (trade.type === "long" ? 1.03 : 0.97),
      status: "open",
    };
  });
  const liveChartData = watchlist.slice(0, 12).map((market, index) => ({
    time: Date.now() - (watchlist.length - index) * 60 * 1000,
    price: market.bid,
  }));
  const [balancesVisible, setBalancesVisible] = useState(!balancesMasked);

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-full">
      {/* Modern professional dashboard header */}
      <ModernDashboardHeader
        accountName={`${user?.fullName?.split(" ")[0] ?? "Trader"}'s Account`}
        accountType={isDemo ? "demo" : "live"}
        equity={equity}
        totalBalance={totalBalance}
        openPnL={openPnL}
        usedMargin={usedMargin}
        freeMargin={freeMargin}
        marginLevel={marginLevel}
        balancesMasked={!balancesVisible}
        onToggleBalance={() => setBalancesVisible(!balancesVisible)}
      />

      {/* Status badges row */}
      {(kyc?.status !== "approved" || pendingWithdrawals > 0) && (
        <div className="flex items-center gap-2 flex-wrap">
          {kyc?.status === "approved" ? (
            <Badge variant="outline" className="text-primary border-primary/40">
              <ShieldCheck className="h-3 w-3 mr-1" /> KYC verified
            </Badge>
          ) : kyc?.status === "pending" ? (
            <Link href="/kyc"><Badge variant="outline" className="text-amber-500 border-amber-500/40 cursor-pointer">
              <ShieldAlert className="h-3 w-3 mr-1" /> KYC pending
            </Badge></Link>
          ) : (
            <Link href="/kyc"><Badge variant="outline" className="text-destructive border-destructive/40 cursor-pointer">
              <ShieldAlert className="h-3 w-3 mr-1" /> Verify KYC
            </Badge></Link>
          )}
          {pendingWithdrawals > 0 && (
            <Badge variant="outline">
              <Bell className="h-3 w-3 mr-1" /> {pendingWithdrawals} pending withdrawal{pendingWithdrawals > 1 ? "s" : ""}
            </Badge>
          )}
        </div>
      )}

      <WalletRequiredBanner />
      <DemoExperienceBanner />

      {/* Modern market watchlist */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Professional Market Watch</CardTitle>
        </CardHeader>
        <CardContent>
          <ModernMarketWatchlist
            markets={useLiveMarkets().map((m) => ({
              symbol: m.symbol,
              name: m.name,
              bid: m.bid,
              ask: m.ask,
              spread: 0.002, // Typical forex spread
              changePct: m.changePct,
              change: m.changePct,
              dayHigh: m.bid * 1.05,
              dayLow: m.bid * 0.95,
            }))}
            onTrade={(symbol) => {
              // Navigate to trades page with symbol
              window.location.href = `/trades?symbol=${symbol}`;
            }}
            showSpread={true}
            compactMode={false}
          />
        </CardContent>
      </Card>

      <Card className="border-primary/20 bg-linear-to-r from-primary/8 via-background to-background">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-500" />
                Live execution desk
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                Real-time trade signals, account momentum, and risk decisions across your active positions.
              </CardDescription>
            </div>
            <Badge variant="outline" className="border-emerald-500/40 text-emerald-500 bg-emerald-500/5">
              <Activity className="h-2 w-2 mr-1 rounded-full bg-emerald-500 animate-pulse" /> 
              {liveTradeSnapshots.length > 0 ? `${liveTradeSnapshots.length} LIVE` : "AWAITING TRADES"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid gap-3 md:grid-cols-3">
            {liveTradeSnapshots.length > 0 ? (
              liveTradeSnapshots.slice(0, 3).map((trade) => (
                <div key={trade.id} className={`rounded-xl border p-3 transition-all ${
                  trade.pnl >= 0 
                    ? "border-emerald-500/30 bg-emerald-500/5" 
                    : "border-rose-500/30 bg-rose-500/5"
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono font-semibold text-sm">{trade.symbol}</span>
                    <Badge variant="outline" className={`text-xs ${
                      trade.pnl >= 0 
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" 
                        : "bg-rose-500/10 text-rose-600 border-rose-500/30"
                    }`}>
                      {trade.side.toUpperCase()}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded bg-muted/50 p-2">
                        <div className="text-muted-foreground uppercase text-[10px]">Entry</div>
                        <div className="font-mono font-semibold mt-1">{trade.entryPrice.toFixed(4)}</div>
                      </div>
                      <div className="rounded bg-muted/50 p-2">
                        <div className="text-muted-foreground uppercase text-[10px]">Current</div>
                        <div className="font-mono font-semibold mt-1 text-blue-500">{trade.currentPrice.toFixed(4)}</div>
                      </div>
                    </div>

                    <div className={`rounded-lg p-2 ${
                      trade.pnl >= 0 
                        ? "bg-emerald-500/10 border border-emerald-500/20" 
                        : "bg-rose-500/10 border border-rose-500/20"
                    }`}>
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">P&L</div>
                      <div className={`font-mono text-sm font-semibold mt-1 ${
                        trade.pnl >= 0 ? "text-emerald-600" : "text-rose-600"
                      }`}>
                        {trade.pnl >= 0 ? "+" : "-"}${Math.abs(trade.pnl).toFixed(2)}
                      </div>
                      <div className={`text-[10px] mt-1 ${
                        trade.pnl >= 0 ? "text-emerald-600" : "text-rose-600"
                      }`}>
                        {trade.pnlPercent >= 0 ? "+" : ""}{trade.pnlPercent.toFixed(2)}%
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="md:col-span-3 rounded-xl border border-dashed border-border/60 bg-muted/20 p-6 text-center text-sm text-muted-foreground">
                <Activity className="h-5 w-5 mx-auto mb-2 opacity-50" />
                No active trades yet. Use the market watch to open the next position.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {!hasVerifiedBank && (
        <Card className="border-amber-500/40 bg-amber-500/5" data-testid="card-fiat-bank-locked">
          <CardContent className="py-3 flex items-center gap-3">
            <Lock className="h-4 w-4 text-amber-500 shrink-0" />
            <div className="flex-1 text-sm">
              Fiat (USD) deposits and withdrawals are locked until you link and verify a bank account.
            </div>
            <Link href="/banks">
              <Button size="sm" variant="secondary">{(banks?.length ?? 0) > 0 ? "View banks" : "Link bank"}</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Enhanced account metrics with professional fintech styling */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Account Performance</h2>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-muted-foreground">Live data</span>
            </div>
          </div>
        </div>

        <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
          <Card className="border-border/50 hover:border-primary/50 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground font-semibold">TOTAL BALANCE</span>
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </div>
              {isLoadingWallets ? (
                <Skeleton className="h-7 w-24" />
              ) : (
                <>
                  <div className="text-xl md:text-2xl font-bold font-mono">{fmtMoney(totalBalance)}</div>
                  <div className="text-xs text-muted-foreground mt-1">{activeTrades.length} open {activeTrades.length === 1 ? "position" : "positions"}</div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/50 hover:border-primary/50 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground font-semibold">ACCOUNT EQUITY</span>
                <Activity className="h-4 w-4 text-primary" />
              </div>
              <div className="text-xl md:text-2xl font-bold font-mono text-primary">{fmtMoney(equity)}</div>
              <div className="text-xs text-muted-foreground mt-1">Real-time valuation</div>
            </CardContent>
          </Card>

          <Card className={`border-border/50 hover:border-${openPnL >= 0 ? 'primary' : 'destructive'}/50 transition-colors`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground font-semibold">OPEN P&L</span>
                {openPnL >= 0 ? <TrendingUp className="h-4 w-4 text-primary" /> : <TrendingDown className="h-4 w-4 text-destructive" />}
              </div>
              <div className={`text-xl md:text-2xl font-bold font-mono ${openPnL >= 0 ? "text-primary" : "text-destructive"}`}>
                {fmtSignedMoney(openPnL)}
              </div>
              <div className={`text-xs font-semibold mt-1 ${openPnL >= 0 ? "text-primary" : "text-destructive"}`}>
                {openPnL >= 0 ? "+" : ""}{((openPnL / (totalBalance || 1)) * 100).toFixed(2)}%
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 hover:border-primary/50 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground font-semibold">FREE MARGIN</span>
                <Briefcase className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-xl md:text-2xl font-bold font-mono">{fmtMoney(freeMargin)}</div>
              <div className="text-xs text-muted-foreground mt-1">Available for trading</div>
            </CardContent>
          </Card>

          <Card className="border-border/50 hover:border-primary/50 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground font-semibold">SOCIAL PROFITS</span>
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div className={`text-xl md:text-2xl font-bold font-mono ${(socialWallet?.totalProfits ?? 0) > 0 ? "text-primary" : ""}`}>
                {balancesMasked
                  ? "——"
                  : `+$${(socialWallet?.totalProfits ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              </div>
              <div className="text-xs text-muted-foreground mt-1">{socialWallet?.activeTrades ?? 0} active</div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Professional risk management section */}
      {usedMargin > 0 && (
        <Card className="border-border/50 bg-linear-to-r from-background via-orange-500/5 to-background">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-4 w-4 text-orange-600" />
                  Risk Management Status
                </CardTitle>
                <CardDescription className="text-xs mt-1">Monitor your margin utilization and leverage exposure</CardDescription>
              </div>
              <Badge variant={marginLevel > 200 ? "destructive" : marginLevel > 150 ? "secondary" : "default"}>
                {marginLevel.toFixed(0)}% Level
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-border/60 p-3">
                <div className="text-xs text-muted-foreground font-semibold mb-2">USED MARGIN</div>
                <div className="text-2xl font-mono font-semibold text-orange-600">${usedMargin.toFixed(2)}</div>
                <div className="text-xs text-muted-foreground mt-1">{safeUsedMarginRatio.toFixed(1)}% of equity</div>
              </div>
              <div className="rounded-lg border border-border/60 p-3">
                <div className="text-xs text-muted-foreground font-semibold mb-2">MARGIN LEVEL</div>
                <div className={`text-2xl font-mono font-semibold ${marginLevel > 200 ? "text-destructive" : marginLevel > 150 ? "text-amber-600" : "text-emerald-600"}`}>
                  {marginLevel.toFixed(0)}%
                </div>
                <div className="text-xs text-muted-foreground mt-1">{marginLevel > 200 ? "HIGH RISK" : marginLevel > 150 ? "ELEVATED" : "SAFE"}</div>
              </div>
              <div className="rounded-lg border border-border/60 p-3">
                <div className="text-xs text-muted-foreground font-semibold mb-2">MARGIN CALL LEVEL</div>
                <div className="text-2xl font-mono font-semibold text-rose-600">50%</div>
                <div className="text-xs text-muted-foreground mt-1">Distance to liquidation</div>
              </div>
            </div>

            {/* Margin level progress bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Margin utilization</span>
                <span className="font-mono font-semibold">{safeUsedMarginRatio.toFixed(1)}%</span>
              </div>
              <div className="h-3 rounded-full bg-border/30 overflow-hidden">
                <div 
                  className={`h-full transition-all ${
                    safeUsedMarginRatio > 80 ? "bg-rose-500" : 
                    safeUsedMarginRatio > 60 ? "bg-orange-500" : 
                    "bg-emerald-500"
                  }`}
                  style={{ width: `${Math.min(safeUsedMarginRatio, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Safe zone</span>
                <span>⚠️ Warning</span>
                <span>🚨 Critical</span>
              </div>
            </div>

            <div className="rounded-lg bg-blue-500/10 border border-blue-500/30 p-3">
              <div className="text-sm text-blue-600 font-semibold mb-1">Pro Tip: Margin Management</div>
              <div className="text-xs text-blue-600/80">Keep margin level above 200% for stable trading. Reduce positions if approaching 150%.</div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Margin progress for reference */}

      {/* Buy verification banner — persistent CTA until the user has
          completed their first crypto purchase via MoonPay or Coinbase. */}
      {!isLoadingUser && user && user.buyVerified !== true && (
        <Card
          className="border-amber-500/40 bg-amber-500/10"
          data-testid="banner-buy-verification"
        >
          <CardContent className="py-4 flex items-start sm:items-center gap-3 flex-col sm:flex-row">
            <div className="flex-1">
              <div className="font-semibold text-sm">
                Complete your buy verification
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Make your first crypto purchase via MoonPay or Coinbase to
                unlock full account features. Any amount counts.
              </p>
            </div>
            <Link href="/wallets">
              <Button
                size="sm"
                data-testid="button-buy-verification-cta"
              >
                Verify now
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Quick actions */}
      <section>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <ActionCard href="/deposits" icon={ArrowDownToLine} label="Deposit" tone="primary" />
          <ActionCard href="/withdrawals" icon={ArrowUpFromLine} label="Withdraw" />
          <ActionCard href="/trades" icon={Plus} label="New trade" />
          <ActionCard href="/wallets" icon={Repeat} label="Transfer" />
          <ActionCard href="/banks" icon={Wallet} label="Bank accounts" />
          <ActionCard href="/p2p" icon={Users} label="P2P market" disabled={!featureAccess.canAccessP2P} altHref="/kyc" />
        </div>
      </section>

      <LiveTradeMonitor
        trades={liveTradeSnapshots}
        title="Live trading analysis"
        subtitle="Real-time execution signals across your active forex and broker positions."
        chartSeries={liveChartData}
      />

      {/* Watchlist + Open positions */}
      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Watchlist</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/markets">All markets <ArrowRight className="h-3 w-3 ml-1" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {watchlist.map((t) => {
                const up = t.changePct >= 0;
                return (
                  <div key={t.symbol} className="flex items-center justify-between px-4 py-3 hover:bg-accent/40">
                    <div>
                      <div className="font-mono font-semibold text-sm">{t.symbol}</div>
                      <div className="text-xs text-muted-foreground">{t.name}</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-mono text-sm">{formatPrice(t.bid)}</div>
                        <div className={`text-xs font-mono inline-flex items-center gap-1 ${up ? "text-primary" : "text-destructive"}`}>
                          {up ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                          {up ? "+" : ""}{t.changePct.toFixed(2)}%
                        </div>
                      </div>
                      <Button asChild size="sm" variant="outline">
                        <Link href="/trades">Trade</Link>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Wallet breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoadingWallets ? (
              <Skeleton className="h-24 w-full" />
            ) : wallets && wallets.length > 0 ? (
              wallets.map((w) => {
                const pct = totalBalance > 0 ? (w.balance / totalBalance) * 100 : 0;
                return (
                  <div key={w.id}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium capitalize">{w.label || w.type}</span>
                      <span className="font-mono">
                        {balancesMasked
                          ? "——"
                          : `$${w.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                      </span>
                    </div>
                    <Progress value={balancesMasked ? 0 : pct} className="h-1.5" />
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground">No wallets yet.</p>
            )}
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link href="/wallets">Manage wallets</Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Open positions table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Open positions</CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link href="/trades">View all <ArrowRight className="h-3 w-3 ml-1" /></Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {activeTrades.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              You have no open positions. <Link href="/trades" className="text-primary hover:underline">Open a trade →</Link>
            </div>
          ) : (
            <table className="w-full text-sm min-w-160">
              <thead className="border-b border-border text-xs text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Pair</th>
                  <th className="text-left px-4 py-2 font-medium">Side</th>
                  <th className="text-right px-4 py-2 font-medium">Size</th>
                  <th className="text-right px-4 py-2 font-medium">Entry</th>
                  <th className="text-right px-4 py-2 font-medium">Current</th>
                  <th className="text-right px-4 py-2 font-medium">P&L</th>
                </tr>
              </thead>
              <tbody>
                {activeTrades.slice(0, 5).map((t) => {
                  const pnl = (t.currentPrice - t.entryPrice) * t.amount * (t.type === "long" ? 1 : -1);
                  return (
                    <tr key={t.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 font-mono font-semibold">{t.pair}</td>
                      <td className="px-4 py-3">
                        <Badge variant={t.type === "long" ? "default" : "secondary"} className="capitalize">{t.type}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-mono">{t.amount}</td>
                      <td className="px-4 py-3 text-right font-mono">{t.entryPrice}</td>
                      <td className="px-4 py-3 text-right font-mono">{t.currentPrice}</td>
                      <td className={`px-4 py-3 text-right font-mono font-semibold ${pnl >= 0 ? "text-primary" : "text-destructive"}`}>
                        {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Recent activity + Account checklist */}
      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Recent activity</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/wallets">All transactions <ArrowRight className="h-3 w-3 ml-1" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {recentTx.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">No transactions yet.</div>
            ) : (
              <div className="divide-y divide-border">
                {recentTx.map((t) => {
                  const sign = ["deposit", "trade_profit", "p2p_sell"].includes(t.type) ? "+" : "-";
                  const pos = sign === "+";
                  return (
                    <div key={t.id} className="px-4 py-3 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium capitalize">{t.type.replace(/_/g, " ")}</div>
                        <div className="text-xs text-muted-foreground">{new Date(t.createdAt).toLocaleString()}</div>
                      </div>
                      <div className={`font-mono text-sm font-semibold ${pos ? "text-primary" : "text-foreground"}`}>
                        {sign}${t.amount.toFixed(2)} {t.currency}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Account checklist</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <ChecklistItem done={kyc?.status === "approved"} label="Verify your identity (KYC)" href="/kyc" />
            <ChecklistItem done={(banks?.length ?? 0) > 0} label="Link a bank account" href="/banks" />
            <ChecklistItem done={verifiedBanks > 0} label="Verify a bank account"
              hint={verifiedBanks > 0 ? "Verified" : (banks?.length ?? 0) > 0 ? "Awaiting review" : "Link one first"} href="/banks" />
            <ChecklistItem done={(connectedWallets?.length ?? 0) > 0} label="Connect an external wallet"
              hint={(connectedWallets?.length ?? 0) > 0 ? `${connectedWallets!.length} connected` : "Required for crypto withdrawals"} href="/wallets" />
            <ChecklistItem done={user?.buyVerified === true} label="Complete your first crypto purchase"
              hint={user?.buyVerified ? "Verified" : "Buy any amount via MoonPay or Coinbase to verify"} href="/wallets" />
            <ChecklistItem done={(cards?.some((c) => c.status === "approved") ?? false)} label="Order an XpressPro card"
              hint={cards?.some((c) => c.status === "pending") ? "Pending approval" : undefined} href="/cards" />
            <ChecklistItem done={totalBalance > 0} label="Make your first deposit" href="/deposits" />
            <ChecklistItem done={(trades?.length ?? 0) > 0} label="Place your first trade" href="/trades" />
          </CardContent>
        </Card>
      </section>

      {/* Insights / shortcuts */}
      <section className="grid gap-4 md:grid-cols-3">
        <Card className="hover-elevate"><Link href="/calendar" className="block">
          <CardContent className="p-5">
            <CalIcon className="h-6 w-6 text-primary mb-2" />
            <div className="font-semibold">Economic calendar</div>
            <p className="text-xs text-muted-foreground mt-1">Track high-impact macro events that move the markets.</p>
          </CardContent>
        </Link></Card>
        <Card className="hover-elevate"><Link href="/education" className="block">
          <CardContent className="p-5">
            <BookOpen className="h-6 w-6 text-primary mb-2" />
            <div className="font-semibold">Trading academy</div>
            <p className="text-xs text-muted-foreground mt-1">Free courses, articles and a complete glossary.</p>
          </CardContent>
        </Link></Card>
        <Card className="hover-elevate"><Link href="/referrals" className="block">
          <CardContent className="p-5">
            <Award className="h-6 w-6 text-primary mb-2" />
            <div className="font-semibold">Earn with referrals</div>
            <p className="text-xs text-muted-foreground mt-1">
              {referral ? `${referral.signups} referrals · $${referral.earnings.toFixed(2)} earned` : "Invite friends and earn commission"}
            </p>
          </CardContent>
        </Link></Card>
      </section>
    </div>
  );
}

/* ------------------------------ subcomponents ----------------------------- */

function ActionCard({
  href, altHref, icon: Icon, label, tone, disabled,
}: { href: string; altHref?: string; icon: React.ComponentType<{ className?: string }>; label: string; tone?: "primary"; disabled?: boolean }) {
  const card = (
    <Card className={`hover-elevate transition ${tone === "primary" ? "border-primary/40" : ""} ${disabled ? "opacity-70 cursor-not-allowed" : "cursor-pointer"}`}>
      <CardContent className="p-4 text-center">
        <span className={`inline-flex h-10 w-10 items-center justify-center rounded-md mx-auto mb-2 ${
          tone === "primary" ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground"
        }`}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="text-sm font-medium">{label}</div>
      </CardContent>
    </Card>
  );

  if (disabled) {
    return altHref ? <Link href={altHref} className="block">{card}</Link> : <div className="block">{card}</div>;
  }

  return <Link href={href} className="block">{card}</Link>;
}

function ChecklistItem({ done, label, hint, href }: { done: boolean; label: string; hint?: string; href: string }) {
  return (
    <Link href={href} className="flex items-center justify-between gap-2 hover:text-foreground">
      <div className="flex items-center gap-2">
        <span className={`h-5 w-5 rounded-full inline-flex items-center justify-center text-[10px] font-bold ${
          done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
        }`}>{done ? "✓" : "○"}</span>
        <span className={done ? "text-muted-foreground line-through" : ""}>{label}</span>
      </div>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </Link>
  );
}
