import { useState, useEffect } from "react";
import {
  useGetP2PListings,
  useGetP2POrders,
  useGetP2PNotifications,
  useMarkP2PNotificationRead,
  getGetP2PNotificationsQueryKey,
  useCreateP2PListing,
  useCreateP2POrder,
  useSendFromConnectedWallet,
  useGetPlatformReceivingAddress,
  useGetMyP2PMerchantApplication,
  useSubmitP2PMerchantApplication,
  useGetMyP2PMerchantChat,
  useSendMyP2PMerchantChat,
  useInitiateMoonpayBuy,
  useGetBankAccounts,
  useGetCurrentUser,
  useGetWallets,
  useGetConnectedWallets,
  getGetP2PListingsQueryKey,
  getGetP2POrdersQueryKey,
  getGetMyP2PMerchantApplicationQueryKey,
  getGetMyP2PMerchantChatQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRightLeft, Bell, Store, MessageCircle, Send, ShieldCheck, Hourglass, XCircle, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { PaymentSourceSelector, type PaymentSource } from "@/components/payment-source-selector";
import { ManualTxHashInput } from "@/components/manual-tx-hash-input";
import { fetchFeatureAccess, getFeatureAccess, type FeatureAccessState } from "@/lib/account-access";

export function P2PMarket() {
  const [typeFilter, setTypeFilter] = useState<'buy' | 'sell' | 'all'>('all');
  const [assetFilter, setAssetFilter] = useState<string>('all');
  const [featureAccess, setFeatureAccess] = useState<FeatureAccessState>(getFeatureAccess({}));

  useEffect(() => {
    void fetchFeatureAccess()
      .then(setFeatureAccess)
      .catch(() => setFeatureAccess(getFeatureAccess({})));
  }, []);

  const { data: listings, isLoading: isLoadingListings } = useGetP2PListings({
    type: typeFilter !== 'all' ? typeFilter : undefined,
    asset: assetFilter !== 'all' ? assetFilter : undefined
  });

  const { data: orders, isLoading: isLoadingOrders } = useGetP2POrders();
  const { data: notificationsResp, isLoading: isLoadingNotifs } = useGetP2PNotifications({
    query: { refetchInterval: 30000, queryKey: getGetP2PNotificationsQueryKey() },
  });
  const { data: merchantApp } = useGetMyP2PMerchantApplication();
  const markRead = useMarkP2PNotificationRead();
  const queryClient = useQueryClient();

  const notifications = notificationsResp?.notifications ?? [];
  const unreadCount = notificationsResp?.unreadCount ?? 0;

  const isMerchant = merchantApp?.isMerchant ?? false;
  const application = merchantApp?.application ?? null;

  // Gate the merchant↔admin support chat to merchants who currently have an
  // active P2P trade context — i.e. at least one active listing OR an open
  // order. Prevents the chat from appearing for merchants with no activity.
  const myUserId = application?.userId;
  const hasActiveListing = !!myUserId && (listings ?? []).some(
    (l) => l.userId === myUserId && l.status === "active",
  );
  const hasActiveP2PTrade = (orders ?? []).some(
    (o) => o.status === "pending" || o.status === "payment_sent" || o.status === "disputed",
  );
  const showMerchantChat = isMerchant && (hasActiveListing || hasActiveP2PTrade);

  if (!featureAccess.canAccessP2P) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto p-4 md:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">P2P Marketplace</h1>
            <p className="text-muted-foreground mt-1">Trade directly with other users</p>
          </div>
        </div>

        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="py-6 space-y-3">
            <p className="text-sm">P2P trading unlocks after your account reaches the KYC-ready tier.</p>
            <Button asChild>
              <a href="/kyc">Complete KYC to unlock</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleMarkRead = (id: string, alreadyRead: boolean) => {
    if (alreadyRead) return;
    markRead.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetP2PNotificationsQueryKey() });
        },
      },
    );
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 md:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">P2P Marketplace</h1>
          <p className="text-muted-foreground mt-1">Trade directly with other users</p>
        </div>
        <div className="flex gap-2 items-center">
          {isMerchant && (
            <Badge variant="default" className="gap-1" data-testid="badge-merchant">
              <ShieldCheck className="h-3 w-3" /> Merchant
            </Badge>
          )}
          {isMerchant && <CreateListingDialog />}
        </div>
      </div>

      <MerchantApplicationSection isMerchant={isMerchant} application={application} />

      <Tabs defaultValue="listings" className="w-full">
        <TabsList className={`grid w-full max-w-2xl ${showMerchantChat ? "grid-cols-4" : "grid-cols-3"}`}>
          <TabsTrigger value="listings">Marketplace</TabsTrigger>
          <TabsTrigger value="orders">My Orders</TabsTrigger>
          <TabsTrigger value="notifications" className="relative">
            Notifications
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] leading-none rounded-full flex items-center justify-center"
                data-testid="badge-unread-notifications"
              >
                {unreadCount}
              </Badge>
            )}
          </TabsTrigger>
          {showMerchantChat && (
            <TabsTrigger value="chat" data-testid="tab-merchant-chat">Trade Support</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="listings" className="mt-6 space-y-4">
          <Card>
            <CardHeader className="py-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex gap-2 w-full sm:w-auto">
                  <Select value={typeFilter} onValueChange={(v: any) => setTypeFilter(v)}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="buy">Buy</SelectItem>
                      <SelectItem value="sell">Sell</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={assetFilter} onValueChange={setAssetFilter}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="Asset" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Assets</SelectItem>
                      <SelectItem value="BTC">BTC</SelectItem>
                      <SelectItem value="ETH">ETH</SelectItem>
                      <SelectItem value="USDT">USDT</SelectItem>
                      <SelectItem value="USDC">USDC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingListings ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
                </div>
              ) : listings?.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">No listings found matching your criteria.</div>
              ) : (
                <div className="space-y-4">
                  {listings?.map(listing => (
                    <ListingCard key={listing.id} listing={listing} isMerchant={isMerchant} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Active & Past Orders</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingOrders ? (
                <div className="space-y-4">
                  {[1, 2].map(i => <Skeleton key={i} className="h-20 w-full" />)}
                </div>
              ) : orders?.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">You have no P2P orders.</div>
              ) : (
                <div className="space-y-4">
                  {orders?.map(order => (
                    <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg bg-card/50">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="uppercase">{order.asset}</Badge>
                          <span className="font-semibold">{order.amount} {order.asset}</span>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          Total: ${(order.amount * order.price).toLocaleString()} • {format(new Date(order.createdAt), 'MMM d, yyyy')}
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={
                          order.status === 'completed' ? 'default' :
                          order.status === 'cancelled' ? 'destructive' :
                          order.status === 'disputed' ? 'destructive' : 'secondary'
                        } className="capitalize">
                          {order.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingNotifs ? (
                <div className="space-y-4">
                  {[1, 2].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : notifications?.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">No new notifications.</div>
              ) : (
                <div className="space-y-4">
                  {notifications.map(notif => {
                    const isDeposit =
                      notif.type === 'deposit_incoming' ||
                      notif.type === 'deposit_confirmed' ||
                      notif.type === 'p2p_deposit';
                    const depositLabel =
                      notif.type === 'deposit_incoming' ? 'Deposit incoming' :
                      notif.type === 'deposit_confirmed' ? 'Deposit confirmed' :
                      notif.type === 'p2p_deposit' ? 'P2P deposit' : null;
                    return (
                      <button
                        key={notif.id}
                        type="button"
                        onClick={() => handleMarkRead(notif.id, notif.read)}
                        className={`w-full text-left flex items-start gap-4 p-4 border rounded-lg transition-colors ${notif.read ? 'bg-card/50' : 'bg-primary/5 border-primary/20 hover:bg-primary/10'}`}
                        data-testid={`notification-${notif.type}`}
                      >
                        <div className={`p-2 rounded-full mt-1 ${isDeposit ? 'bg-green-500/15 text-green-500' : 'bg-secondary text-secondary-foreground'}`}>
                          <Bell className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold">{notif.title}</span>
                            {depositLabel && (
                              <Badge variant="outline" className="text-[10px] uppercase">{depositLabel}</Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1 whitespace-pre-line">{notif.message}</div>
                          {isDeposit && (notif.amount != null || notif.asset || notif.reference || notif.instructions) && (
                            <div
                              className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs rounded-md border bg-muted/30 p-3"
                              data-testid={`notification-${notif.type}-details`}
                            >
                              {notif.amount != null && (
                                <div>
                                  <div className="text-muted-foreground uppercase tracking-wide text-[10px]">Amount</div>
                                  <div className="font-mono font-medium text-foreground">
                                    {notif.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    {notif.currency ? ` ${notif.currency}` : ''}
                                  </div>
                                </div>
                              )}
                              {notif.asset && (
                                <div>
                                  <div className="text-muted-foreground uppercase tracking-wide text-[10px]">Asset</div>
                                  <div className="font-medium text-foreground">{notif.asset}</div>
                                </div>
                              )}
                              {notif.reference && (
                                <div className="sm:col-span-2">
                                  <div className="text-muted-foreground uppercase tracking-wide text-[10px]">Reference</div>
                                  <div className="font-mono text-foreground break-all">{notif.reference}</div>
                                </div>
                              )}
                              {notif.instructions && (
                                <div className="sm:col-span-2">
                                  <div className="text-muted-foreground uppercase tracking-wide text-[10px]">Instructions</div>
                                  <div className="text-foreground whitespace-pre-line">{notif.instructions}</div>
                                </div>
                              )}
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground mt-2">{format(new Date(notif.createdAt), 'MMM d, HH:mm')}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {showMerchantChat && (
          <TabsContent value="chat" className="mt-6">
            <MerchantAdminChat />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function MerchantApplicationSection({
  isMerchant,
  application,
}: {
  isMerchant: boolean;
  application: {
    status: string;
    rejectionReason?: string | null;
    submittedAt: string;
    displayName: string;
    legalName?: string;
    country?: string;
    paymentMethod?: "etransfer" | "bank";
  } | null;
}) {
  if (isMerchant) return null;

  if (application?.status === "pending") {
    return (
      <Card className="border-amber-500/30 bg-amber-500/5" data-testid="card-merchant-pending">
        <CardContent className="flex items-start gap-4 p-5">
          <div className="rounded-full bg-amber-500/20 p-2 text-amber-500"><Hourglass className="h-5 w-5" /></div>
          <div className="flex-1">
            <h3 className="font-semibold">Application under review</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Your merchant application as <span className="font-medium text-foreground">{application.displayName}</span> was
              submitted {format(new Date(application.submittedAt), "MMM d, yyyy")} and is awaiting admin review.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (application?.status === "rejected") {
    return (
      <Card className="border-destructive/30 bg-destructive/5" data-testid="card-merchant-rejected">
        <CardContent className="flex items-start gap-4 p-5">
          <div className="rounded-full bg-destructive/15 p-2 text-destructive"><XCircle className="h-5 w-5" /></div>
          <div className="flex-1">
            <h3 className="font-semibold">Application rejected</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {application.rejectionReason || "Your merchant application was not approved."}
            </p>
            <div className="mt-3">
              <ApplyMerchantDialog reapply />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/30 bg-primary/5" data-testid="card-merchant-cta">
      <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5">
        <div className="flex items-start gap-4">
          <div className="rounded-full bg-primary/15 p-2 text-primary"><Store className="h-5 w-5" /></div>
          <div>
            <h3 className="font-semibold">Become a P2P merchant</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-xl">
              As a regular user you can buy crypto from listings via card. To post sell listings and receive direct
              deposits, apply to become an approved P2P merchant.
            </p>
          </div>
        </div>
        <ApplyMerchantDialog />
      </CardContent>
    </Card>
  );
}

function ApplyMerchantDialog({ reapply = false }: { reapply?: boolean }) {
  const [open, setOpen] = useState(false);
  const { data: currentUser } = useGetCurrentUser();
  const [displayName, setDisplayName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [country, setCountry] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"etransfer" | "bank">("etransfer");
  const [payoutEmail, setPayoutEmail] = useState("");
  const [bankInfo, setBankInfo] = useState("");
  const [assets, setAssets] = useState("USDT, BTC, ETH");
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open) {
      if (!legalName) setLegalName(currentUser?.fullName ?? "");
      if (!contactEmail) setContactEmail(currentUser?.email ?? "");
      if (!country) setCountry(currentUser?.country ?? "");
    }
  }, [open, currentUser?.fullName, currentUser?.email, currentUser?.country, legalName, contactEmail, country]);

  const submit = useSubmitP2PMerchantApplication();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const methodFieldFilled =
    paymentMethod === "etransfer" ? payoutEmail.trim() : bankInfo.trim();
  const canSubmit =
    displayName.trim() &&
    legalName.trim() &&
    contactEmail.trim() &&
    country.trim() &&
    methodFieldFilled &&
    assets.trim() &&
    reason.trim();

  const handleSubmit = () => {
    submit.mutate(
      {
        data: {
          displayName: displayName.trim(),
          legalName: legalName.trim(),
          contactEmail: contactEmail.trim(),
          country: country.trim().toUpperCase(),
          paymentMethod,
          payoutEmail: payoutEmail.trim(),
          bankInfo: bankInfo.trim(),
          assets: assets.trim(),
          reason: reason.trim(),
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Application submitted", description: "An admin will review it shortly." });
          queryClient.invalidateQueries({ queryKey: getGetMyP2PMerchantApplicationQueryKey() });
          setOpen(false);
        },
        onError: (err: any) => {
          toast({
            title: "Submission failed",
            description: err?.message ?? "Could not submit your application.",
            variant: "destructive",
          });
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-apply-merchant">
          <Store className="h-4 w-4 mr-2" />
          {reapply ? "Reapply" : "Apply now"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Become a P2P merchant</DialogTitle>
          <DialogDescription>
            Tell us how you'd like to receive deposits and a bit about your trading intent. Approved merchants can post
            sell listings and chat directly with admin.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2 max-h-[60vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Legal name</Label>
              <Input
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                placeholder="As it appears on ID"
                data-testid="input-merchant-legal-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Display name</Label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Reyes OTC Desk"
                data-testid="input-merchant-display-name"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Contact email</Label>
              <Input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="you@example.com"
                data-testid="input-merchant-contact-email"
              />
            </div>
            <div className="space-y-2">
              <Label>Country</Label>
              <Input
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                maxLength={3}
                placeholder="CA"
                data-testid="input-merchant-country"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Preferred payment method</Label>
            <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as "etransfer" | "bank")}>
              <SelectTrigger data-testid="select-merchant-payment-method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="etransfer">E-Transfer (email)</SelectItem>
                <SelectItem value="bank">Bank transfer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {paymentMethod === "etransfer" ? (
            <div className="space-y-2">
              <Label>E-Transfer email</Label>
              <Input
                type="email"
                value={payoutEmail}
                onChange={(e) => setPayoutEmail(e.target.value)}
                placeholder="payouts@yourdesk.com"
                data-testid="input-merchant-payout-email"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Bank receiving info</Label>
              <Textarea
                value={bankInfo}
                onChange={(e) => setBankInfo(e.target.value)}
                rows={2}
                placeholder="Account holder, bank name, account number, transit / SWIFT"
                data-testid="input-merchant-bank-info"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label>Assets you'll trade</Label>
            <Input
              value={assets}
              onChange={(e) => setAssets(e.target.value)}
              placeholder="BTC, USDT, ETH"
              data-testid="input-merchant-assets"
            />
          </div>
          <div className="space-y-2">
            <Label>Trading intent</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Briefly describe your volume and trading approach."
              data-testid="input-merchant-reason"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || submit.isPending}
            data-testid="button-submit-merchant-application"
          >
            {submit.isPending ? "Submitting..." : "Submit application"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MerchantAdminChat() {
  const { data: thread, refetch } = useGetMyP2PMerchantChat({
    query: { refetchInterval: 10000, queryKey: getGetMyP2PMerchantChatQueryKey() },
  });
  const { data: currentUser } = useGetCurrentUser();
  const send = useSendMyP2PMerchantChat();
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const { toast } = useToast();

  const handleSend = () => {
    const value = content.trim();
    if (!value) return;
    send.mutate(
      { data: { content: value } },
      {
        onSuccess: () => {
          setContent("");
          queryClient.invalidateQueries({ queryKey: getGetMyP2PMerchantChatQueryKey() });
          refetch();
        },
        onError: () => {
          toast({ title: "Could not send message", variant: "destructive" });
        },
      },
    );
  };

  const messages = thread ?? [];
  const myId = currentUser?.id;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-primary" />
          P2P Support Chat
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col h-[55vh]">
          <div className="flex-1 overflow-y-auto space-y-3 pr-1" data-testid="merchant-chat-thread">
            {messages.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-10">
                No messages yet. Send a note to platform admin to start the conversation.
              </div>
            ) : (
              messages.map((m) => {
                const fromMe = m.senderId === myId || m.isFromUser;
                return (
                  <div key={m.id} className={`max-w-[75%] ${fromMe ? "ml-auto" : "mr-auto"}`}>
                    <div className={`rounded-lg px-3 py-2 text-sm ${
                      fromMe ? "bg-primary text-primary-foreground" : "bg-muted"
                    }`}>
                      {m.content}
                    </div>
                    <p className={`text-[10px] text-muted-foreground mt-0.5 ${fromMe ? "text-right" : ""}`}>
                      {m.senderName} · {format(new Date(m.createdAt), "MMM d, HH:mm")}
                    </p>
                  </div>
                );
              })
            )}
          </div>
          <div className="flex items-center gap-2 border-t pt-3 mt-3">
            <Input
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Message platform admin..."
              data-testid="input-merchant-chat-message"
            />
            <Button
              onClick={handleSend}
              disabled={!content.trim() || send.isPending}
              data-testid="button-send-merchant-chat"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ListingCard({ listing, isMerchant }: { listing: any; isMerchant: boolean }) {
  return (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 border rounded-lg bg-card hover:border-primary/50 transition-colors gap-4">
      <div className="flex items-center gap-4 min-w-[200px]">
        <Avatar>
          <AvatarImage src={listing.userAvatarUrl} />
          <AvatarFallback>{listing.userName.charAt(0)}</AvatarFallback>
        </Avatar>
        <div>
          <div className="font-semibold">{listing.userName}</div>
          <div className="text-xs text-muted-foreground">
            {listing.totalTrades} orders • {listing.completionRate}% completion
          </div>
        </div>
      </div>

      <div className="flex-1 w-full md:w-auto grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <div className="text-xs text-muted-foreground">Price</div>
          <div className="font-bold text-lg">{listing.price.toLocaleString()} {listing.currency}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Available</div>
          <div className="font-medium">{listing.amount} {listing.asset}</div>
        </div>
        <div className="col-span-2 md:col-span-2">
          <div className="text-xs text-muted-foreground">Limits & Payment</div>
          <div className="text-sm">
            ${listing.minOrder.toLocaleString()} - ${(listing.maxOrder).toLocaleString()}
          </div>
          <div className="flex gap-1 mt-1">
            {listing.paymentMethods.map((pm: string) => (
              <Badge key={pm} variant="secondary" className="text-[10px] px-1 py-0 h-4">{pm}</Badge>
            ))}
          </div>
        </div>
      </div>

      <div className="w-full md:w-auto flex justify-end">
        {isMerchant ? (
          <InitiateOrderDialog listing={listing} />
        ) : listing.type === "sell" ? (
          <BuyViaMoonpayDialog listing={listing} />
        ) : (
          <Button variant="outline" disabled title="Only approved merchants can sell to buy-listings">
            Merchants only
          </Button>
        )}
      </div>
    </div>
  );
}

function BuyViaMoonpayDialog({ listing }: { listing: any }) {
  const [open, setOpen] = useState(false);
  const [fiatAmount, setFiatAmount] = useState<string>(String(listing.minOrder ?? 100));
  const [destinationKind, setDestinationKind] = useState<"external" | "platform" | "custom">("platform");
  const [destinationAddress, setDestinationAddress] = useState<string>("");
  const [customAddress, setCustomAddress] = useState<string>("");
  const { data: banks } = useGetBankAccounts();
  const { data: wallets } = useGetWallets();
  const { data: connectedWallets } = useGetConnectedWallets();
  const initiate = useInitiateMoonpayBuy();
  const { toast } = useToast();

  const verifiedBank = banks?.find((b) => b.verified);
  const fiatNum = Number(fiatAmount);
  const cryptoEstimate = listing.price > 0 ? fiatNum / listing.price : 0;

  const platformWalletOptions = (wallets ?? []).filter(
    (w) => w.address && w.address !== "" && w.type !== "social",
  );
  const externalWalletOptions = connectedWallets ?? [];

  const resolvedAddress =
    destinationKind === "custom"
      ? customAddress.trim()
      : destinationAddress.trim();

  const canSubmit =
    !!verifiedBank &&
    fiatNum >= 1 &&
    fiatNum <= listing.maxOrder &&
    fiatNum >= listing.minOrder &&
    resolvedAddress.length > 0;

  useEffect(() => {
    if (open) {
      setFiatAmount(String(listing.minOrder ?? 100));
      setCustomAddress("");
      // Auto-pick first platform wallet if available, else fall back to external.
      const firstPlatform = platformWalletOptions[0]?.address ?? "";
      const firstExternal = externalWalletOptions[0]?.address ?? "";
      if (firstPlatform) {
        setDestinationKind("platform");
        setDestinationAddress(firstPlatform);
      } else if (firstExternal) {
        setDestinationKind("external");
        setDestinationAddress(firstExternal);
      } else {
        setDestinationKind("custom");
        setDestinationAddress("");
      }
    }
  }, [open, listing.minOrder, platformWalletOptions, externalWalletOptions]);

  const handleBuy = async () => {
    if (!verifiedBank) {
      toast({
        title: "Verified bank required",
        description: "Add and verify a bank account on the Banks page before buying via MoonPay.",
        variant: "destructive",
      });
      return;
    }
    if (!resolvedAddress) {
      toast({
        title: "Wallet address required",
        description: "Choose a destination wallet (or paste a valid address) for MoonPay to deliver your crypto.",
        variant: "destructive",
      });
      return;
    }
    try {
      const resp = await initiate.mutateAsync({
        data: {
          assetSymbol: listing.asset,
          fiatAmount: fiatNum,
          fiatCurrency: (verifiedBank.fiatCurrency || verifiedBank.currency || "USD").toUpperCase(),
          destinationAddress: resolvedAddress,
          destinationKind,
        },
      });
      window.open(resp.url, "_blank", "noopener,noreferrer");
      toast({
        title: resp.sandbox ? "MoonPay sandbox opened" : "MoonPay checkout opened",
        description: resp.notice ?? `Complete your purchase of ${listing.asset} in the new tab.`,
      });
      setOpen(false);
    } catch (err) {
      toast({
        title: "MoonPay failed",
        description: err instanceof Error ? err.message : "Could not start checkout.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid={`button-buy-listing-${listing.id}`}>Buy {listing.asset}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Buy {listing.asset} via MoonPay</DialogTitle>
          <DialogDescription>
            Regular accounts buy P2P listings through MoonPay's hosted checkout. The seller's price is shown for
            reference; MoonPay will quote the live rate at checkout.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="p-3 bg-muted rounded-md text-sm space-y-1">
            <div className="flex justify-between"><span className="text-muted-foreground">Seller</span><span className="font-medium">{listing.userName}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Listing price</span><span className="font-medium">{listing.price.toLocaleString()} {listing.currency} / {listing.asset}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Limits</span><span className="font-medium">${listing.minOrder} – ${listing.maxOrder}</span></div>
          </div>

          {!verifiedBank && (
            <div className="text-xs text-amber-500 bg-amber-500/10 border border-amber-500/30 p-3 rounded-md">
              You need a verified bank on file to buy via MoonPay. Add one from the Banks page.
            </div>
          )}

          <div className="space-y-2">
            <Label>Spend amount ({verifiedBank?.fiatCurrency || verifiedBank?.currency || "USD"})</Label>
            <Input
              type="number"
              value={fiatAmount}
              onChange={(e) => setFiatAmount(e.target.value)}
              data-testid="input-moonpay-fiat-amount"
            />
          </div>

          <div className="rounded-md border bg-muted/30 p-3 text-sm">
            <div className="text-xs text-muted-foreground">Estimated {listing.asset} you'll receive</div>
            <div className="text-lg font-semibold font-mono">
              ≈ {cryptoEstimate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })} {listing.asset}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Destination wallet</Label>
            <Select
              value={destinationKind}
              onValueChange={(v) => {
                const k = v as "external" | "platform" | "custom";
                setDestinationKind(k);
                if (k === "platform") setDestinationAddress(platformWalletOptions[0]?.address ?? "");
                else if (k === "external") setDestinationAddress(externalWalletOptions[0]?.address ?? "");
                else setDestinationAddress("");
              }}
            >
              <SelectTrigger data-testid="select-moonpay-destination-kind">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="platform" disabled={platformWalletOptions.length === 0}>
                  My platform wallet
                </SelectItem>
                <SelectItem value="external" disabled={externalWalletOptions.length === 0}>
                  Connected external wallet
                </SelectItem>
                <SelectItem value="custom">Paste a wallet address</SelectItem>
              </SelectContent>
            </Select>

            {destinationKind === "platform" && (
              platformWalletOptions.length === 0 ? (
                <div className="text-xs text-amber-500">
                  None of your platform wallets have a receiving address yet. Pick another option.
                </div>
              ) : (
                <Select value={destinationAddress} onValueChange={setDestinationAddress}>
                  <SelectTrigger data-testid="select-moonpay-platform-wallet">
                    <SelectValue placeholder="Choose a wallet" />
                  </SelectTrigger>
                  <SelectContent>
                    {platformWalletOptions.map((w) => (
                      <SelectItem key={w.id} value={w.address!}>
                        {w.type} — {w.address!.slice(0, 8)}…
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )
            )}

            {destinationKind === "external" && (
              externalWalletOptions.length === 0 ? (
                <div className="text-xs text-amber-500">
                  You haven't connected an external wallet yet. Pick another option.
                </div>
              ) : (
                <Select value={destinationAddress} onValueChange={setDestinationAddress}>
                  <SelectTrigger data-testid="select-moonpay-external-wallet">
                    <SelectValue placeholder="Choose a wallet" />
                  </SelectTrigger>
                  <SelectContent>
                    {externalWalletOptions.map((w) => (
                      <SelectItem key={w.id} value={w.address}>
                        {w.walletType} — {w.address.slice(0, 8)}…
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )
            )}

            {destinationKind === "custom" && (
              <Input
                value={customAddress}
                onChange={(e) => setCustomAddress(e.target.value)}
                placeholder="0x… / bc1… (recipient wallet address)"
                data-testid="input-moonpay-custom-address"
              />
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            onClick={handleBuy}
            disabled={!canSubmit || initiate.isPending}
            data-testid="button-confirm-moonpay-buy"
          >
            {initiate.isPending ? "Opening MoonPay…" : (<>Open MoonPay <ExternalLink className="h-4 w-4 ml-1" /></>)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateListingDialog() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<'buy'|'sell'>('sell');
  const [asset, setAsset] = useState('USDT');
  const [amount, setAmount] = useState('');
  const [price, setPrice] = useState('');
  const [minOrder, setMinOrder] = useState('');
  const [maxOrder, setMaxOrder] = useState('');

  const createListing = useCreateP2PListing();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleCreate = () => {
    createListing.mutate({
      data: {
        type,
        asset,
        amount: Number(amount),
        price: Number(price),
        currency: 'USD',
        minOrder: Number(minOrder),
        maxOrder: Number(maxOrder),
        paymentMethods: ['Bank Transfer', 'Credit Card']
      }
    }, {
      onSuccess: () => {
        toast({ title: "Listing created", description: "Your P2P listing is now live." });
        queryClient.invalidateQueries({ queryKey: getGetP2PListingsQueryKey() });
        setOpen(false);
      },
      onError: (err: any) => {
        toast({ title: "Error", description: err?.message ?? "Failed to create listing.", variant: "destructive" });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-create-listing"><ArrowRightLeft className="h-4 w-4 mr-2" /> Create Listing</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create P2P Listing</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v: any) => setType(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sell">I want to Sell</SelectItem>
                  <SelectItem value="buy">I want to Buy</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Asset</Label>
              <Select value={asset} onValueChange={setAsset}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USDT">USDT</SelectItem>
                  <SelectItem value="USDC">USDC</SelectItem>
                  <SelectItem value="BTC">BTC</SelectItem>
                  <SelectItem value="ETH">ETH</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Amount ({asset})</Label>
              <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Price (USD)</Label>
              <Input type="number" value={price} onChange={e => setPrice(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Min Order ($)</Label>
              <Input type="number" value={minOrder} onChange={e => setMinOrder(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Max Order ($)</Label>
              <Input type="number" value={maxOrder} onChange={e => setMaxOrder(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={createListing.isPending || !amount || !price || !minOrder || !maxOrder}>
            {createListing.isPending ? "Creating..." : "Post Listing"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InitiateOrderDialog({ listing }: { listing: any }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState<PaymentSource | null>(null);
  const [settlementAsset, setSettlementAsset] = useState<"USDT" | "USDC" | "DAI">("USDT");
  const [manualTxHash, setManualTxHash] = useState("");
  const createOrder = useCreateP2POrder();
  const sendFromWallet = useSendFromConnectedWallet();
  const { data: platform } = useGetPlatformReceivingAddress();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const isBuy = listing.type === 'sell';
  const actionText = isBuy ? 'Buy' : 'Sell';
  const totalVal = Number(amount) * listing.price || 0;
  const isExternal = source?.kind === "external_wallet";
  const willBroadcast = isBuy && isExternal;
  const inFlight = createOrder.isPending || sendFromWallet.isPending;

  const handleOrder = async () => {
    if (!source) {
      toast({
        title: isBuy ? "Pick a payment source" : "Pick a settlement destination",
        description: isBuy
          ? "Choose where the funds will come from."
          : "Choose where the proceeds should land.",
        variant: "destructive",
      });
      return;
    }
    let externalWalletId: string | null = null;
    let txHash: string | null = null;
    if (willBroadcast) {
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
              amount: totalVal,
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
            toast({
              title: "Awaiting on-chain confirmation",
              description: `Tx ${send.hash.slice(0, 14)}… broadcast. Click Confirm again once it confirms — the hash is now saved for retry.`,
            });
            return;
          }
          externalWalletId = source.id;
          txHash = send.hash;
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
    const paymentSource: "platform_wallet" | "external_wallet" | "bank_transfer" =
      source.kind === "external_wallet"
        ? "external_wallet"
        : source.kind === "bank"
          ? "bank_transfer"
          : "platform_wallet";
    createOrder.mutate({
      data: {
        listingId: listing.id,
        amount: Number(amount),
        paymentSource,
        externalWalletId,
        txHash,
        settlementAsset: txHash ? settlementAsset : null,
      }
    }, {
      onSuccess: () => {
        toast({
          title: "Order Initiated",
          description: txHash
            ? `Settled on-chain (tx ${txHash.slice(0, 14)}…) via ${source.label}.`
            : `Successfully started ${actionText.toLowerCase()} order via ${source.label}.`,
        });
        queryClient.invalidateQueries({ queryKey: getGetP2POrdersQueryKey() });
        setOpen(false);
        setManualTxHash("");
      },
      onError: () => {
        toast({ title: "Error", description: "Could not initiate order.", variant: "destructive" });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={isBuy ? "default" : "destructive"}>
          {actionText} {listing.asset}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{actionText} {listing.asset}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Price</span>
              <span className="font-medium">{listing.price} USD</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Available</span>
              <span className="font-medium">{listing.amount} {listing.asset}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Limits</span>
              <span className="font-medium">${listing.minOrder} - ${listing.maxOrder}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>I want to {actionText.toLowerCase()} ({listing.asset})</Label>
            <Input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder={`Amount of ${listing.asset}`}
            />
          </div>

          <PaymentSourceSelector
            value={source}
            onChange={setSource}
            label={isBuy ? "Pay with" : "Receive into"}
            showLiveBalance
            testId="select-p2p-payment-source"
          />

          {willBroadcast && (
            <>
              <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3 text-xs">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Settle in</Label>
                  <select
                    className="bg-background border border-input rounded px-2 py-1 text-xs"
                    value={settlementAsset}
                    onChange={(e) => setSettlementAsset(e.target.value as "USDT" | "USDC" | "DAI")}
                    data-testid="select-p2p-settlement-asset"
                  >
                    <option value="USDT">USDT</option>
                    <option value="USDC">USDC</option>
                    <option value="DAI">DAI</option>
                  </select>
                </div>
                <div className="text-muted-foreground">
                  {platform?.address ? (
                    <>
                      Broadcasts ${totalVal.toLocaleString(undefined, { minimumFractionDigits: 2 })} {settlementAsset} on-chain to platform escrow address{" "}
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
                testId="input-p2p-manual-tx-hash"
              />
            </>
          )}

          <div className="pt-2 border-t flex justify-between items-center">
            <span className="font-semibold">I will {isBuy ? 'pay' : 'receive'}</span>
            <span className="text-xl font-bold">${totalVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            onClick={handleOrder}
            disabled={inFlight || !amount || Number(amount) <= 0 || totalVal < listing.minOrder || totalVal > listing.maxOrder || !source || (willBroadcast && !manualTxHash.trim() && !platform?.address)}
            variant={isBuy ? "default" : "destructive"}
            data-testid="button-confirm-p2p-order"
          >
            {sendFromWallet.isPending
              ? "Broadcasting on-chain…"
              : createOrder.isPending
                ? "Processing..."
                : `Confirm ${actionText}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
