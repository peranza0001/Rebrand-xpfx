import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Smartphone, CreditCard, Wallet, AppleIcon, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface DigitalPaymentMethod {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  features: string[];
  supported: boolean;
  badge?: string;
}

export function DigitalPaymentMethods() {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [availability, setAvailability] = useState({ applePay: false, googlePay: false });

  useEffect(() => {
    let active = true;
    fetch("/api/payments/digital-methods", { credentials: "include" })
      .then((response) => response.ok ? response.json() as Promise<{ applePay?: boolean; googlePay?: boolean }> : null)
      .then((data) => { if (active && data) setAvailability({ applePay: data.applePay === true, googlePay: data.googlePay === true }); })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  const paymentMethods: DigitalPaymentMethod[] = [
    {
      id: "apple-pay",
      name: "Apple Pay",
      icon: <AppleIcon className="h-6 w-6" />,
      description: "Fast and secure payments with Apple Pay",
      features: [
        "Instant checkout",
        "Biometric authentication",
        "Card & wallet funds",
        "Mobile only",
      ],
      supported: availability.applePay,
      badge: "Premium",
    },
    {
      id: "google-pay",
      name: "Google Pay",
      icon: <Smartphone className="h-6 w-6" />,
      description: "Seamless mobile and web payments with Google Pay",
      features: [
        "One-click payments",
        "Bank account funding",
        "Card & wallet funds",
        "Android & Web",
      ],
      supported: availability.googlePay,
      badge: "Popular",
    },
    {
      id: "connect-wallet",
      name: "Connect Wallet",
      icon: <Wallet className="h-6 w-6" />,
      description: "Use MetaMask, Trust Wallet, or other Web3 wallets",
      features: [
        "MetaMask support",
        "Trust Wallet support",
        "Direct crypto transfers",
        "Self-custody",
      ],
      supported: false,
    },
    {
      id: "credit-card",
      name: "Credit Card",
      icon: <CreditCard className="h-6 w-6" />,
      description: "Visa, Mastercard, and other major credit cards",
      features: [
        "All major cards",
        "Instant processing",
        "High limits",
        "Reward points",
      ],
      supported: false,
    },
  ];

  const handleInitiatePayment = async (methodId: string) => {
    if (!amount || Number(amount) <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid deposit amount",
        variant: "destructive",
      });
      return;
    }

    const method = paymentMethods.find((candidate) => candidate.id === methodId);
    if (!method?.supported) {
      toast({
        title: "Payment method unavailable",
        description: "This payment method is not configured for live settlement yet. Use a verified provider checkout instead.",
        variant: "destructive",
      });
      return;
    }

    setSelectedMethod(methodId);
    setConfirmOpen(true);
  };

  const handleConfirmPayment = async () => {
    if (!selectedMethod || !amount) return;

    setIsProcessing(true);
    try {
      const method = paymentMethods.find((m) => m.id === selectedMethod);

      if (method?.id === "apple-pay" || method?.id === "google-pay") {
        if (!("PaymentRequest" in window)) throw new Error("This browser does not support secure payment requests.");
        const paymentRequest = new PaymentRequest(
          [{ supportedMethods: method.id === "apple-pay" ? "https://apple.com/apple-pay" : "https://google.com/pay" }],
          { total: { label: "XpressPro FX deposit", amount: { currency: "USD", value: amount } } },
        );
        if (!(await paymentRequest.canMakePayment())) throw new Error(`${method.name} is unavailable on this device.`);
        const paymentResponse = await paymentRequest.show();
        const response = await fetch(`/api/payments/${method.id}/intent`, {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ amount: Number(amount), currency: "USD", token: JSON.stringify(paymentResponse.details) }),
        });
        if (!response.ok) throw new Error((await response.json() as { error?: string }).error ?? "Payment could not be started.");
        await paymentResponse.complete("success");
        toast({ title: "Payment submitted", description: "Your wallet will be credited after processor confirmation." });
      } else if (method?.id === "connect-wallet") {
        // Initiate Web3 wallet connection
        toast({
          title: "Wallet Connection Ready",
          description: `Approve the transaction in your connected wallet to deposit $${amount}.`,
        });
      } else if (method?.id === "credit-card") {
        // Show credit card form
        toast({
          title: "Card Payment Ready",
          description: `Enter your card details to complete the $${amount} deposit.`,
        });
      }

      setConfirmOpen(false);
      setAmount("");
    } catch {
      toast({
        title: "Payment failed",
        description: "There was an error initiating the payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Amount Input Section */}
      <Card>
        <CardHeader>
          <CardTitle>Deposit Amount</CardTitle>
          <CardDescription>How much would you like to deposit?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (USD)</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-3 text-muted-foreground">$</span>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-7"
                  min="1"
                  step="0.01"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Minimum: $10 | Maximum: $50,000</p>
          </div>
        </CardContent>
      </Card>

      {/* Payment Methods Grid */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Choose Payment Method</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Select how you want to fund your account
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {paymentMethods.map((method) => (
            <div key={method.id} className="relative group">
              <Card
                className={`cursor-pointer transition-all hover:border-primary ${
                  selectedMethod === method.id ? "border-primary bg-primary/5" : ""
                } ${!method.supported ? "opacity-50 cursor-not-allowed" : ""}`}
                onClick={() => method.supported && handleInitiatePayment(method.id)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-muted">{method.icon}</div>
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          {method.name}
                          {method.badge && (
                            <Badge variant="secondary" className="text-xs">
                              {method.badge}
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {method.description}
                        </CardDescription>
                      </div>
                    </div>
                    {method.supported && (
                      <CheckCircle2 className={`h-5 w-5 ${selectedMethod === method.id ? "text-primary" : "text-muted-foreground"}`} />
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {method.features.map((feature, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                        <span className="text-primary">✓</span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>

      {/* Security & Protection Section */}
      <Card className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Protected by Industry Standards
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-green-900 dark:text-green-100">
          <p>
            ✓ All payments encrypted with SSL/TLS
          </p>
          <p>
            ✓ PCI DSS Level 1 compliant processing
          </p>
          <p>
            ✓ Biometric authentication available
          </p>
          <p>
            ✓ 2FA protection on all transactions
          </p>
        </CardContent>
      </Card>

      {/* Processing Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deposit</DialogTitle>
            <DialogDescription>
              Review your payment details before proceeding
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {selectedMethod && (
              <>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                  <span className="text-sm font-medium">Amount</span>
                  <span className="text-lg font-bold">${amount}</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                  <span className="text-sm font-medium">Method</span>
                  <Badge>
                    {paymentMethods.find((m) => m.id === selectedMethod)?.name}
                  </Badge>
                </div>

                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 flex gap-3">
                  <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-900 dark:text-amber-100">
                    <p className="font-semibold">Processing may take 1-2 minutes</p>
                    <p className="text-xs mt-1">Keep this window open until the payment is complete</p>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={isProcessing}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmPayment}
              disabled={isProcessing}
              className="flex-1"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                `Pay $${amount}`
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
