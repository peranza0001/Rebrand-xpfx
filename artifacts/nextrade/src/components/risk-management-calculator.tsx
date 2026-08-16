import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Calculator, TrendingDown, Target } from "lucide-react";

interface RiskCalculatorProps {
  accountBalance: number;
  onCalculate?: (result: RiskCalculationResult) => void;
}

interface RiskCalculationResult {
  riskAmount: number;
  riskPercent: number;
  positionSize: number;
  stopLoss: number;
  takeProfit: number;
  riskRewardRatio: number;
  maxPositions: number;
}

export function RiskManagementCalculator({
  accountBalance,
  onCalculate: _onCalculate,
}: RiskCalculatorProps) {
  const [riskPercent, setRiskPercent] = useState(2); // Default 2% risk per trade
  const [entryPrice, setEntryPrice] = useState(1.0854);
  const [stopLoss, setStopLoss] = useState(1.0800);
  const [takeProfit, setTakeProfit] = useState(1.0920);
  const [leverage, setLeverage] = useState(1);

  const calculation = useMemo(() => {
    const riskAmount = accountBalance * (riskPercent / 100);
    const pipsDifference = Math.abs(entryPrice - stopLoss) * 10000; // For forex
    const positionSize = riskAmount / pipsDifference > 0 ? riskAmount / pipsDifference : 0;
    const potentialProfit = (takeProfit - entryPrice) * 10000 * positionSize;
    const riskRewardRatio = pipsDifference > 0 ? (takeProfit - entryPrice) * 10000 / pipsDifference : 0;
    const maxPositions = Math.floor(100 / riskPercent);

    return {
      riskAmount,
      riskPercent,
      positionSize: positionSize * leverage,
      stopLoss,
      takeProfit,
      riskRewardRatio: Math.max(0, riskRewardRatio),
      maxPositions,
      potentialProfit,
    };
  }, [accountBalance, riskPercent, entryPrice, stopLoss, takeProfit, leverage]);

  const riskLevel = useMemo(() => {
    if (calculation.riskRewardRatio >= 2) return { label: "Excellent", color: "text-emerald-600", bg: "bg-emerald-500/10" };
    if (calculation.riskRewardRatio >= 1.5) return { label: "Good", color: "text-blue-600", bg: "bg-blue-500/10" };
    if (calculation.riskRewardRatio >= 1) return { label: "Acceptable", color: "text-amber-600", bg: "bg-amber-500/10" };
    return { label: "Poor", color: "text-rose-600", bg: "bg-rose-500/10" };
  }, [calculation.riskRewardRatio]);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-primary" />
                Risk Calculator
              </CardTitle>
              <CardDescription>Professional position sizing & risk management</CardDescription>
            </div>
            <Badge variant="outline">Professional Tool</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium">
              Risk Per Trade: <span className="font-mono font-bold text-primary">{riskPercent}%</span>
            </label>
            <input
              type="range"
              min="0.5"
              max="5"
              step="0.5"
              value={riskPercent}
              onChange={(e) => setRiskPercent(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <AlertCircle className="h-3 w-3" />
              Risk amount: ${calculation.riskAmount.toFixed(2)}
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">Entry Price</label>
            <input
              type="number"
              value={entryPrice}
              onChange={(e) => setEntryPrice(Number(e.target.value))}
              step="0.0001"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="block text-sm font-medium">Stop Loss</label>
              <input
                type="number"
                value={stopLoss}
                onChange={(e) => setStopLoss(Number(e.target.value))}
                step="0.0001"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium">Take Profit</label>
              <input
                type="number"
                value={takeProfit}
                onChange={(e) => setTakeProfit(Number(e.target.value))}
                step="0.0001"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">Leverage: {leverage}x</label>
            <input
              type="range"
              min="1"
              max="50"
              value={leverage}
              onChange={(e) => setLeverage(Number(e.target.value))}
              className="w-full"
            />
            <div className="text-xs text-muted-foreground">Adjust leverage for position amplification</div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4" />
              Position Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border border-border p-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Position Size</span>
                <span className="font-mono font-bold">{calculation.positionSize.toFixed(2)} lots</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Risk Amount</span>
                <span className="font-mono font-bold text-rose-600">${calculation.riskAmount.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Potential Profit</span>
                <span className="font-mono font-bold text-emerald-600">
                  ${Math.max(0, calculation.potentialProfit).toFixed(2)}
                </span>
              </div>
              <div className="border-t border-border pt-2 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Risk/Reward Ratio</span>
                <span className="font-mono font-bold">1:{calculation.riskRewardRatio.toFixed(2)}</span>
              </div>
            </div>

            <div className={`rounded-lg p-3 ${riskLevel.bg}`}>
              <div className={`text-sm font-semibold ${riskLevel.color} flex items-center gap-2`}>
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: "currentColor" }} />
                {riskLevel.label} Risk/Reward
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-lg border border-border p-2 text-center">
                <div className="text-muted-foreground text-xs">Max Positions</div>
                <div className="font-mono font-bold">{calculation.maxPositions}</div>
              </div>
              <div className="rounded-lg border border-border p-2 text-center">
                <div className="text-muted-foreground text-xs">Leverage Used</div>
                <div className="font-mono font-bold">{leverage}x</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Risk Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Account Balance</span>
              <span className="font-mono font-semibold">${accountBalance.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Risk Per Trade</span>
              <span className="font-mono font-semibold text-rose-600">{riskPercent}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Pips at Risk</span>
              <span className="font-mono font-semibold">
                {(Math.abs(entryPrice - stopLoss) * 10000).toFixed(1)}
              </span>
            </div>
            <div className="border-t border-border pt-2 flex items-center justify-between font-semibold">
              <span>Recommended Position</span>
              <span className="text-primary font-mono">{calculation.positionSize.toFixed(2)} lots</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
