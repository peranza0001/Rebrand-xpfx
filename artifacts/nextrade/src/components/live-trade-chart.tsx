import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, ComposedChart, CartesianGrid, XAxis, YAxis,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { TrendingUp, TrendingDown, Activity, Zap, Target } from 'lucide-react';

interface ChartDataPoint {
  time: string;
  price: number;
  volume: number;
  sma20?: number;
  sma50?: number;
  rsi?: number;
  macd?: number;
  signal?: number;
}

interface LiveTradeChartProps {
  symbol: string;
  currentPrice: number;
  priceChange: number;
  priceChangePercent: number;
  chartData: ChartDataPoint[];
  sentiment?: 'bullish' | 'bearish' | 'neutral';
  resistance?: number;
  support?: number;
  onSymbolChange?: (symbol: string) => void;
}

// Simple Technical Analysis calculations
function calculateTechnicalIndicators(data: any[]): ChartDataPoint[] {
  return data.map((point, index, arr) => {
    // Calculate SMA20
    const sma20Start = Math.max(0, index - 19);
    const sma20Data = arr.slice(sma20Start, index + 1);
    const sma20 = sma20Data.reduce((sum, p) => sum + p.price, 0) / sma20Data.length;

    // Calculate SMA50
    const sma50Start = Math.max(0, index - 49);
    const sma50Data = arr.slice(sma50Start, index + 1);
    const sma50 = sma50Data.reduce((sum, p) => sum + p.price, 0) / sma50Data.length;

    // Calculate RSI (14-period)
    const rsiPeriod = 14;
    const rsiStart = Math.max(0, index - rsiPeriod);
    const rsiData = arr.slice(rsiStart, index + 1);

    let gains = 0,
      losses = 0;
    for (let i = 1; i < rsiData.length; i++) {
      const change = rsiData[i].price - rsiData[i - 1].price;
      if (change > 0) gains += change;
      else losses -= change;
    }

    const avgGain = gains / rsiPeriod;
    const avgLoss = losses / rsiPeriod;
    const rs = avgLoss !== 0 ? avgGain / avgLoss : 100;
    const rsi = 100 - 100 / (1 + rs);

    return {
      ...point,
      sma20,
      sma50,
      rsi: Math.min(100, Math.max(0, rsi)),
    };
  });
}

export function LiveTradeChart({
  symbol,
  currentPrice,
  priceChange,
  priceChangePercent,
  chartData,
  sentiment = 'neutral',
  resistance,
  support,
}: LiveTradeChartProps) {
  const [analyticsData, setAnalyticsData] = useState<ChartDataPoint[]>([]);
  const [selectedIndicators, setSelectedIndicators] = useState<string[]>(['sma20', 'volume']);
  const [timeframe, setTimeframe] = useState<'1H' | '4H' | '1D' | '1W'>('1D');

  useEffect(() => {
    const processed = calculateTechnicalIndicators(chartData);
    setAnalyticsData(processed);
  }, [chartData]);

  const isPositive = priceChange >= 0;
  const sentimentColors = {
    bullish: '#10b981',
    bearish: '#ef4444',
    neutral: '#6b7280',
  };

  const latestData = analyticsData[analyticsData.length - 1];
  const rsiLevel = latestData?.rsi ?? 50;
  const rsiStatus = rsiLevel > 70 ? 'Overbought' : rsiLevel < 30 ? 'Oversold' : 'Neutral';

  return (
    <div className="space-y-4">
      {/* Header with Price Info */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3">
                <CardTitle className="text-2xl">{symbol}</CardTitle>
                <Badge
                  variant="outline"
                  className="text-sm"
                  style={{ borderColor: sentimentColors[sentiment], color: sentimentColors[sentiment] }}
                >
                  {sentiment.charAt(0).toUpperCase() + sentiment.slice(1)}
                </Badge>
              </div>
              <CardDescription>Live Market Analysis & Technical Indicators</CardDescription>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">${currentPrice.toFixed(2)}</div>
              <div className={isPositive ? 'text-green-600' : 'text-red-600'}>
                <div className="flex items-center justify-end gap-1">
                  {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(4)} ({priceChangePercent.toFixed(2)}%)
                </div>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Key Levels */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Resistance</p>
              <p className="text-sm font-semibold">${resistance?.toFixed(4) || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Current</p>
              <p className="text-sm font-semibold">${currentPrice.toFixed(4)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Support</p>
              <p className="text-sm font-semibold">${support?.toFixed(4) || '—'}</p>
            </div>
          </div>

          {/* RSI Status */}
          {latestData && (
            <div className="flex items-center gap-4 bg-muted/50 p-3 rounded-lg">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">RSI (14)</p>
                <p className="text-sm font-semibold">{rsiLevel.toFixed(1)}</p>
              </div>
              <div className="text-right">
                <Badge
                  variant={
                    rsiLevel > 70
                      ? 'destructive'
                      : rsiLevel < 30
                        ? 'secondary'
                        : 'default'
                  }
                >
                  {rsiStatus}
                </Badge>
              </div>
            </div>
          )}

          {/* Timeframe Selector */}
          <div className="flex gap-2">
            {(['1H', '4H', '1D', '1W'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                  timeframe === tf
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted-foreground/10'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Price Chart</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <ComposedChart data={analyticsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="time" stroke="#6b7280" />
              <YAxis yAxisId="left" stroke="#6b7280" domain="dataMin - 10" domain="dataMax + 10" />
              <YAxis yAxisId="right" orientation="right" stroke="#6b7280" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                formatter={(value: any) => (typeof value === 'number' ? `$${value.toFixed(4)}` : value)}
              />
              <Legend wrapperStyle={{ paddingTop: '16px' }} />

              {/* Volume */}
              <Bar yAxisId="right" dataKey="volume" fill="#93c5fd" opacity={0.3} />

              {/* Price */}
              <Line yAxisId="left" type="monotone" dataKey="price" stroke="#3b82f6" strokeWidth={2} name="Price" />

              {/* SMAs */}
              {selectedIndicators.includes('sma20') && (
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="sma20"
                  stroke="#f59e0b"
                  strokeWidth={1}
                  strokeDasharray="5 5"
                  name="SMA 20"
                />
              )}
              {selectedIndicators.includes('sma50') && (
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="sma50"
                  stroke="#ec4899"
                  strokeWidth={1}
                  strokeDasharray="5 5"
                  name="SMA 50"
                />
              )}

              {/* Support/Resistance Lines */}
              {support && <ReferenceLine yAxisId="left" y={support} stroke="#10b981" strokeDasharray="3 3" label="Support" />}
              {resistance && <ReferenceLine yAxisId="left" y={resistance} stroke="#ef4444" strokeDasharray="3 3" label="Resistance" />}
            </ComposedChart>
          </ResponsiveContainer>

          {/* Indicator Toggles */}
          <div className="mt-4 flex flex-wrap gap-2">
            {['sma20', 'sma50', 'volume'].map((indicator) => (
              <button
                key={indicator}
                onClick={() =>
                  setSelectedIndicators((prev) =>
                    prev.includes(indicator) ? prev.filter((i) => i !== indicator) : [...prev, indicator],
                  )
                }
                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                  selectedIndicators.includes(indicator)
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted-foreground/10'
                }`}
              >
                {indicator.toUpperCase()}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* RSI Chart */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Relative Strength Index (RSI)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={150}>
            <AreaChart data={analyticsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="time" stroke="#6b7280" />
              <YAxis stroke="#6b7280" domain={[0, 100]} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                formatter={(value: any) => (typeof value === 'number' ? `${value.toFixed(1)}` : value)}
              />

              <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="3 3" label="Overbought" />
              <ReferenceLine y={30} stroke="#10b981" strokeDasharray="3 3" label="Oversold" />
              <ReferenceLine y={50} stroke="#6b7280" strokeDasharray="3 3" />

              <Area type="monotone" dataKey="rsi" fill="#8b5cf6" stroke="#8b5cf6" name="RSI" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Market Analysis Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Technical Analysis Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-xs text-blue-700 dark:text-blue-300 font-semibold">Trend</p>
              <p className="text-sm mt-1">
                {priceChangePercent > 2 ? 'Uptrend' : priceChangePercent < -2 ? 'Downtrend' : 'Consolidating'}
              </p>
            </div>
            <div className="p-3 bg-purple-50 dark:bg-purple-950 rounded-lg border border-purple-200 dark:border-purple-800">
              <p className="text-xs text-purple-700 dark:text-purple-300 font-semibold">Momentum</p>
              <p className="text-sm mt-1">
                {rsiLevel > 70 ? 'Strong' : rsiLevel < 30 ? 'Weak' : 'Moderate'}
              </p>
            </div>
            <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-xs text-green-700 dark:text-green-300 font-semibold">Signal</p>
              <p className="text-sm mt-1">{sentiment.charAt(0).toUpperCase() + sentiment.slice(1)}</p>
            </div>
          </div>

          <div className="mt-4 p-3 bg-muted/50 rounded-lg text-sm space-y-2">
            <p>
              <strong>Analysis:</strong> {symbol} is trading at <strong>${currentPrice.toFixed(4)}</strong> with a {sentiment === 'bullish' ? 'positive' : sentiment === 'bearish' ? 'negative' : 'neutral'} bias. The RSI
              indicates the market is {rsiStatus.toLowerCase()}. {support && `Support is at $${support.toFixed(4)}`}
              {resistance && `, and resistance is at $${resistance.toFixed(4)}.`}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
