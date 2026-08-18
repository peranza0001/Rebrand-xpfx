import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, DollarSign, Wallet, Building2, User, AlertCircle, CheckCircle2, Loader2, TrendingDown } from "lucide-react";

interface WithdrawalSource {
  id: string;
  name: string;
  type: "platform_wallet" | "connected_wallet" | "fiat_wallet";
  balance: number;
  currency: string;
  icon: React.ReactNode;
}

interface WithdrawalDestination {
  id: string;
  label: string;
  type: "wallet_address" | "bank_account" | "another_user" | "social_wallet";
  icon: React.ReactNode;
  description: string;
  addressDisplay?: string;
}

interface CryptoToFiatRate {
  from: string;
  to: string;
  rate: number;
  timestamp: number;
}

export function EnhancedWithdrawalFlow() {
  const { toast } = useToast();
  const [step, setStep] = useState<"select_source" | "select_destination" | "review_and_confirm">(
    "select_source"
  );
  const [amount, setAmount] = useState("");
  const [selectedSource, setSelectedSource] = useState<WithdrawalSource | null>(null);
  const [selectedDestination, setSelectedDestination] = useState<WithdrawalDestination | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [conversionRate] = useState<CryptoToFiatRate | null>(null);

  // Mock data - in real implementation, fetch from API
  const withdrawalSources: WithdrawalSource[] = [
    {
      id: "main_wallet",
      name: "Main Trading Wallet",
      type: "platform_wallet",
      balance: 5250.50,
      currency: "USD",
      icon: <DollarSign className="h-5 w-5" />,
    },
    {
      id: "connected_metamask",
      name: "MetaMask Connected Wallet",
      type: "connected_wallet",
      balance: 0.85,
      currency: "ETH",
      icon: <Wallet className="h-5 w-5" />,
    },
    {
      id: "fiat_wallet",
      name: "Fiat Settlement Wallet",
      type: "fiat_wallet",
      balance: 1000.0,
      currency: "USD",
      icon: <DollarSign className="h-5 w-5" />,
    },
  ];

  const withdrawalDestinations: WithdrawalDestination[] = [
    {
      id: "bank_primary",
      label: "Primary Bank Account",
      type: "bank_account",
      icon: <Building2 className="h-5 w-5" />,
      description: "Chase Bank ending in 4242",
      addressDisplay: "••••4242",
    },
    {
      id: "wallet_external",
      label: "My Crypto Wallet",
      type: "wallet_address",
      icon: <Wallet className="h-5 w-5" />,
      description: "External blockchain wallet",
      addressDisplay: "0x742d...A0c7",
    },
    {
      id: "user_friend",
      label: "Send to Friend",
      type: "another_user",
      icon: <User className="h-5 w-5" />,
      description: "Transfer to another xpfx user",
      addressDisplay: "username@xpfx",
    },
    {
      id: "social_wallet",
      label: "Social Wallet",
      type: "social_wallet",
      icon: <Wallet className="h-5 w-5" />,
      description: "Receive on social platform",
      addressDisplay: "venmo.com/username",
    },
  ];

  const handleSourceSelect = (source: WithdrawalSource) => {
    setSelectedSource(source);
    setStep("select_destination");
  };

  const handleDestinationSelect = (destination: WithdrawalDestination) => {
    setSelectedDestination(destination);
    setStep("review_and_confirm");
  };

  const handleConfirmWithdrawal = async () => {
    if (!selectedSource || !selectedDestination || !amount) {
      toast({
        title: "Incomplete withdrawal",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000));

      toast({
        title: "Withdrawal initiated",
        description: `${amount} ${selectedSource.currency} will be sent to ${selectedDestination.label}. Processing may take 1-3 business days.`,
      });

      // Reset form
      setAmount("");
      setSelectedSource(null);
      setSelectedDestination(null);
      setStep("select_source");
    } catch {
      toast({
        title: "Withdrawal failed",
        description: "There was an error processing your withdrawal. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const estimatedFiatAmount =
    selectedSource?.currency !== "USD" && conversionRate
      ? (Number(amount) * conversionRate.rate).toFixed(2)
      : amount;

  const feePercentage = 0.5;
  const estimatedFee = (Number(amount) * feePercentage) / 100;
  const netAmount = Number(amount) - estimatedFee;

  return (
    <div className="space-y-6">
      {/* Step Indicator */}
      <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-muted">
        <div className={`text-center flex-1 ${step === "select_source" ? "font-bold text-primary" : "text-muted-foreground"}`}>
          <div className="text-sm">1. Select Source</div>
        </div>
        <div className="text-muted-foreground">→</div>
        <div className={`text-center flex-1 ${step === "select_destination" ? "font-bold text-primary" : "text-muted-foreground"}`}>
          <div className="text-sm">2. Select Destination</div>
        </div>
        <div className="text-muted-foreground">→</div>
        <div className={`text-center flex-1 ${step === "review_and_confirm" ? "font-bold text-primary" : "text-muted-foreground"}`}>
          <div className="text-sm">3. Review & Confirm</div>
        </div>
      </div>

      {/* Step 1: Select Withdrawal Source */}
      {step === "select_source" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Select Withdrawal Source</CardTitle>
              <CardDescription>Choose which account to withdraw from</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {withdrawalSources.map((source) => (
                <button
                  key={source.id}
                  onClick={() => handleSourceSelect(source)}
                  className="w-full text-left p-4 border rounded-lg hover:border-primary hover:bg-primary/5 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-muted">{source.icon}</div>
                      <div>
                        <p className="font-semibold text-sm">{source.name}</p>
                        <p className="text-xs text-muted-foreground">{source.type.replace(/_/g, " ")}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm">
                        {source.balance} {source.currency}
                      </p>
                      <p className="text-xs text-muted-foreground">Available</p>
                    </div>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 2: Select Destination */}
      {step === "select_destination" && selectedSource && (
        <div className="space-y-4">
          <Button
            variant="ghost"
            onClick={() => setStep("select_source")}
            className="text-muted-foreground"
          >
            ← Back
          </Button>

          <Card>
            <CardHeader>
              <CardTitle>Select Withdrawal Destination</CardTitle>
              <CardDescription>Where should we send your {selectedSource.currency}?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {withdrawalDestinations.map((destination) => (
                <button
                  key={destination.id}
                  onClick={() => handleDestinationSelect(destination)}
                  className="w-full text-left p-4 border rounded-lg hover:border-primary hover:bg-primary/5 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-muted">{destination.icon}</div>
                      <div>
                        <p className="font-semibold text-sm">{destination.label}</p>
                        <p className="text-xs text-muted-foreground">{destination.description}</p>
                      </div>
                    </div>
                    <Badge variant="secondary">{destination.addressDisplay}</Badge>
                  </div>
                </button>
              ))}

              {/* Add Custom Destination Option */}
              <button className="w-full text-left p-4 border-2 border-dashed border-primary rounded-lg hover:bg-primary/5 transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted">+</div>
                    <div>
                      <p className="font-semibold text-sm">Add New Destination</p>
                      <p className="text-xs text-muted-foreground">Add a new withdrawal address</p>
                    </div>
                  </div>
                </div>
              </button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 3: Review & Confirm */}
      {step === "review_and_confirm" && selectedSource && selectedDestination && (
        <div className="space-y-4">
          <Button
            variant="ghost"
            onClick={() => setStep("select_destination")}
            className="text-muted-foreground"
          >
            ← Back
          </Button>

          {/* Amount Input */}
          <Card>
            <CardHeader>
              <CardTitle>Withdrawal Amount</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount ({selectedSource.currency})</Label>
                <div className="flex gap-2">
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    max={selectedSource.balance}
                    step="0.01"
                  />
                  <Button
                    variant="outline"
                    onClick={() => setAmount(selectedSource.balance.toString())}
                  >
                    Max
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Available: {selectedSource.balance} {selectedSource.currency}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Withdrawal Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                  <span className="text-sm font-medium">From</span>
                  <span className="text-sm font-semibold">{selectedSource.name}</span>
                </div>

                <div className="flex justify-center">
                  <ArrowRight className="h-5 w-5 text-muted-foreground rotate-90" />
                </div>

                <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                  <span className="text-sm font-medium">To</span>
                  <span className="text-sm font-semibold">{selectedDestination.label}</span>
                </div>
              </div>

              {/* Fee Breakdown */}
              <div className="space-y-2 pt-4 border-t">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-mono font-semibold">{amount || "0.00"} {selectedSource.currency}</span>
                </div>

                {selectedSource.currency !== "USD" && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">≈ (at current rate)</span>
                    <span className="font-mono font-semibold">${estimatedFiatAmount}</span>
                  </div>
                )}

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <TrendingDown className="h-3 w-3" />
                    Withdrawal Fee ({feePercentage}%)
                  </span>
                  <span className="font-mono text-destructive">-${estimatedFee.toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-base font-bold pt-2 border-t">
                  <span>You will receive</span>
                  <span>${netAmount.toFixed(2)}</span>
                </div>
              </div>

              {/* Processing Info */}
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 flex gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900 dark:text-blue-100">
                  <p className="font-semibold">Processing time: 1-3 business days</p>
                  <p className="text-xs mt-1">Your withdrawal will be processed after admin review</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Confirm Button */}
          <Button
            onClick={handleConfirmWithdrawal}
            disabled={isProcessing || !amount || Number(amount) <= 0}
            className="w-full h-12 text-base"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5 mr-2" />
                Confirm Withdrawal
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
