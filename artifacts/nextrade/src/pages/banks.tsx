/**
 * Bank Accounts page
 * ------------------
 * Lets the authenticated user view, link, and manage their bank accounts and
 * debit/credit cards. Linking is performed against the existing
 * `POST /api/banks` endpoint via the generated React Query hook
 * `useLinkBankAccount`. The list of linked accounts is read from
 * `GET /api/banks` via `useGetBankAccounts`.
 *
 * The "default" funding source feature is purely client-side: there is no
 * backend field for it, so the chosen account id is persisted in
 * localStorage by the {@link useDefaultBank} hook. The Withdrawals page
 * reads the same hook to pre-fill the destination field, so changing the
 * default here propagates to the rest of the app immediately.
 *
 * Layout notes:
 *   - Page padding is `p-4 md:p-6` so it works on small handsets up to
 *     wide desktops.
 *   - The bank cards grid uses `grid-cols-1 md:grid-cols-2` to stack on
 *     phones and split into two columns on tablets and larger.
 */
import { useEffect, useState } from "react";
import {
  useGetBankAccounts,
  useLinkBankAccount,
  useUpdateOwnBankAccount,
  getGetBankAccountsQueryKey,
} from "@workspace/api-client-react";
import type { BankAccount } from "@workspace/api-client-react";
import { BuyCryptoDialog } from "@/components/BuyCryptoDialog";
import { useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useDefaultBank } from "@/hooks/use-default-bank";
import { format } from "date-fns";
import {
  Landmark,
  Plus,
  ShieldCheck,
  ShieldAlert,
  Star,
  StarOff,
  Pencil,
} from "lucide-react";

/** Currencies offered in the link-account dialog. Edit this list to add more. */
const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "JPY"];

/**
 * Top-level page component. Renders the header, the linked-accounts grid,
 * and the dialog used to link a new account.
 */
export function Banks() {
  const { data: banks, isLoading } = useGetBankAccounts();
  const [defaultId, setDefault] = useDefaultBank();
  const { toast } = useToast();

  // If the previously-saved default id no longer exists in the user's list
  // (e.g. removed server-side), clear it so the UI doesn't show a stale
  // "Default" badge that points nowhere.
  useEffect(() => {
    if (!banks || !defaultId) return;
    if (!banks.some((b) => b.id === defaultId)) {
      setDefault(null);
    }
  }, [banks, defaultId, setDefault]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 md:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Bank Accounts
          </h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            Link bank accounts and cards used for deposits and withdrawals
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <BuyCryptoDialog
            banks={banks}
            triggerVariant="outline"
            triggerLabel="Buy crypto"
          />
          <LinkBankDialog />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Linked Accounts</CardTitle>
          <CardDescription>
            Accounts you have connected to your profile. Set one as your
            default funding source to auto-fill it on the Withdrawals page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Skeleton className="h-[140px] w-full" />
              <Skeleton className="h-[140px] w-full" />
            </div>
          ) : !banks || banks.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Landmark className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <div className="font-medium">No accounts linked yet</div>
              <div className="text-sm mt-1">
                Link a bank account or card to fund your wallet.
              </div>
            </div>
          ) : (
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
              {banks.map((b) => {
                const isDefault = b.id === defaultId;
                return (
                  <BankCard
                    key={b.id}
                    bank={b}
                    isDefault={isDefault}
                    onSetDefault={() => {
                      if (isDefault) {
                        setDefault(null);
                        toast({
                          title: "Default cleared",
                          description: `${b.bankName} is no longer your default funding source.`,
                        });
                      } else {
                        setDefault(b.id);
                        toast({
                          title: "Default updated",
                          description: `${b.bankName} ••${b.last4} is now your default funding source.`,
                        });
                      }
                    }}
                  />
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Inline-editable card for a single linked bank account. Shows the
 * user-reported fiat balance; clicking the pencil swaps in an input so
 * the user can update it via PATCH /api/banks/:bankId.
 */
function BankCard({
  bank,
  isDefault,
  onSetDefault,
}: {
  bank: BankAccount;
  isDefault: boolean;
  onSetDefault: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>(String(bank.fiatBalance ?? 0));
  const update = useUpdateOwnBankAccount();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const fiatCurrency = bank.fiatCurrency || bank.currency;

  const startEdit = () => {
    setDraft(String(bank.fiatBalance ?? 0));
    setEditing(true);
  };

  const save = async () => {
    const num = Number(draft);
    if (!Number.isFinite(num) || num < 0) {
      toast({
        title: "Invalid balance",
        description: "Enter a non-negative number.",
        variant: "destructive",
      });
      return;
    }
    try {
      await update.mutateAsync({
        bankId: bank.id,
        data: { fiatBalance: num },
      });
      queryClient.invalidateQueries({ queryKey: getGetBankAccountsQueryKey() });
      toast({
        title: "Balance updated",
        description: `${bank.bankName} ····${bank.last4} now shows ${num.toLocaleString()} ${fiatCurrency}.`,
      });
      setEditing(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not update bank balance.";
      toast({
        title: "Update failed",
        description: message,
        variant: "destructive",
      });
    }
  };

  return (
    <div
      className="border rounded-lg p-4 bg-card/50 flex flex-col gap-3"
      data-testid={`bank-card-${bank.id}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 shrink-0 rounded-full bg-primary/10 text-primary flex items-center justify-center">
            <Landmark className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold truncate">{bank.bankName}</div>
            <div className="text-xs text-muted-foreground truncate">
              {bank.accountHolder}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {isDefault && (
            <Badge className="bg-primary/15 text-primary border-primary/20">
              <Star className="h-3 w-3 mr-1 fill-current" />
              Default
            </Badge>
          )}
          {bank.verified ? (
            <Badge
              variant="secondary"
              className="bg-success/15 text-success border-success/20"
            >
              <ShieldCheck className="h-3 w-3 mr-1" /> Verified
            </Badge>
          ) : (
            <Badge
              variant="secondary"
              className="bg-warning/15 text-warning border-warning/20"
            >
              <ShieldAlert className="h-3 w-3 mr-1" /> Pending
            </Badge>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between text-sm flex-wrap gap-2">
        <span className="font-mono tracking-widest text-muted-foreground">
          •••• •••• •••• {bank.last4}
        </span>
        <span className="font-medium">{bank.currency}</span>
      </div>

      <div className="border-t pt-3">
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs text-muted-foreground">Available cash</div>
          {!editing && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2"
              onClick={startEdit}
              data-testid={`button-edit-fiat-${bank.id}`}
            >
              <Pencil className="h-3 w-3 mr-1" /> Update
            </Button>
          )}
        </div>
        {editing ? (
          <div className="flex items-center gap-2 mt-1">
            <Input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="h-8"
              data-testid={`input-fiat-balance-${bank.id}`}
            />
            <span className="text-xs font-medium text-muted-foreground">
              {fiatCurrency}
            </span>
            <Button
              size="sm"
              onClick={save}
              disabled={update.isPending}
              data-testid={`button-save-fiat-${bank.id}`}
            >
              {update.isPending ? "…" : "Save"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditing(false)}
              disabled={update.isPending}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <div
            className="text-xl font-bold font-mono mt-1"
            data-testid={`fiat-balance-display-${bank.id}`}
          >
            {bank.fiatBalance.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{" "}
            <span className="text-sm font-medium text-muted-foreground">
              {fiatCurrency}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground">
          Linked {format(new Date(bank.createdAt), "MMM d, yyyy")}
        </span>
        <Button
          size="sm"
          variant={isDefault ? "secondary" : "outline"}
          onClick={onSetDefault}
          data-testid={`button-default-${bank.id}`}
        >
          {isDefault ? (
            <>
              <StarOff className="h-3 w-3 mr-1" /> Unset default
            </>
          ) : (
            <>
              <Star className="h-3 w-3 mr-1" /> Set as default
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

/**
 * Modal form used to link a new bank account or card. Validates input
 * client-side before submitting to `POST /api/banks`. Only the last four
 * digits of the account number are persisted server-side; the routing/CVV
 * is sent in the request but not stored according to the backend contract.
 */
function LinkBankDialog() {
  const [open, setOpen] = useState(false);
  const [bankName, setBankName] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [routingNumber, setRoutingNumber] = useState("");
  const [currency, setCurrency] = useState("USD");

  const link = useLinkBankAccount();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  /** Resets all form fields back to their initial state. */
  const reset = () => {
    setBankName("");
    setAccountHolder("");
    setAccountNumber("");
    setRoutingNumber("");
    setCurrency("USD");
  };

  /**
   * Lightweight client-side validation. The backend still validates the
   * payload via Zod; this just prevents accidental submits with empty or
   * obviously-incomplete fields.
   */
  const canSubmit =
    bankName.trim() &&
    accountHolder.trim() &&
    accountNumber.trim().length >= 4 &&
    routingNumber.trim().length >= 4;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await link.mutateAsync({
        data: {
          bankName: bankName.trim(),
          accountHolder: accountHolder.trim(),
          accountNumber: accountNumber.trim(),
          routingNumber: routingNumber.trim(),
          currency,
        },
      });
      queryClient.invalidateQueries({ queryKey: getGetBankAccountsQueryKey() });
      toast({
        title: "Account linked",
        description: `${bankName} ending in ${accountNumber.slice(-4)} added.`,
      });
      reset();
      setOpen(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Please verify your details and try again.";
      toast({
        title: "Could not link account",
        description: message,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button data-testid="button-link-bank" className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" /> Link Account
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Link Bank Account or Card</DialogTitle>
          <DialogDescription>
            Enter your bank or card details. Only the last 4 digits will be
            stored.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="bankName">Bank or Card Issuer</Label>
            <Input
              id="bankName"
              placeholder="e.g. Chase, Visa, Mastercard"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              data-testid="input-bank-name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="accountHolder">Account Holder Name</Label>
            <Input
              id="accountHolder"
              placeholder="Full name on the account"
              value={accountHolder}
              onChange={(e) => setAccountHolder(e.target.value)}
              data-testid="input-account-holder"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="accountNumber">Account / Card Number</Label>
              <Input
                id="accountNumber"
                inputMode="numeric"
                placeholder="0000 0000 0000 0000"
                value={accountNumber}
                onChange={(e) =>
                  setAccountNumber(e.target.value.replace(/[^0-9]/g, ""))
                }
                data-testid="input-account-number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="routingNumber">Routing / CVV</Label>
              <Input
                id="routingNumber"
                inputMode="numeric"
                placeholder="000000"
                value={routingNumber}
                onChange={(e) =>
                  setRoutingNumber(e.target.value.replace(/[^0-9]/g, ""))
                }
                data-testid="input-routing-number"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger data-testid="select-currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!canSubmit || link.isPending}
              data-testid="button-submit-bank"
              className="w-full sm:w-auto"
            >
              {link.isPending ? "Linking..." : "Link Account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
