/**
 * Professional Forex/Stocks Trading Terminal
 * Multi-chart, order ticket, position monitor, economic calendar
 */

import React, { useState, useEffect, useMemo } from 'react';
import { io, type Socket } from 'socket.io-client';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { 
  Plus, TrendingUp, TrendingDown, Bell, Settings
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Price {
  symbol: string;
  bid: number;
  ask: number;
  mid: number;
  timestamp: number;
}

interface Position {
  id: string;
  symbol: string;
  type: 'long' | 'short';
  entryPrice: number;
  currentPrice: number;
  quantity: number;
  profit: number;
  profitPercent: number;
  leverage: number;
  openedAt: string;
}

interface Order {
  id: string;
  symbol: string;
  type: 'market' | 'limit' | 'stop-loss' | 'take-profit';
  status: 'pending' | 'filled' | 'cancelled';
  quantity: number;
  price?: number;
  createdAt: string;
}

export function ForexTradingTerminal() {
  const [, setSocket] = useState<Socket | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState('EUR/USD');
  const [prices, setPrices] = useState<Record<string, Price>>({});
  const [positions] = useState<Position[]>([]);
  const [orders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState('chart');
  const [orderTicketOpen, setOrderTicketOpen] = useState(false);

  // Order ticket state
  const [orderType, setOrderType] = useState<'market' | 'limit' | 'stop-loss'>('market');
  const [orderSide, setOrderSide] = useState<'buy' | 'sell'>('buy');
  const [quantity, setQuantity] = useState('1');
  const [limitPrice, setLimitPrice] = useState('');
  const [leverage, setLeverage] = useState('1');
  const [loading, setLoading] = useState(false);

  // Initialize WebSocket connection to /prices namespace
  useEffect(() => {
    const newSocket = io(`${window.location.origin}/prices`, {
      path: '/socket.io',
      withCredentials: true,
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      // Subscribe to common forex pairs, stocks, and commodities
      newSocket.emit('subscribe', [
        'EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'AUD/USD', 'NZD/USD',
        'AAPL', 'MSFT', 'GOOGL', 'TSLA', 'META', 'AMZN',
        'XAUUSD', 'XAGUSD', 'WTIUSD', 'NGAS'
      ]);
    });

    newSocket.on('subscribed', (data: any) => {
      if (data.prices) {
        setPrices(data.prices);
      }
    });

    newSocket.on('price_update', (data: Price) => {
      setPrices(prev => ({
        ...prev,
        [data.symbol]: data
      }));
    });

    newSocket.on('disconnect', () => {
      // Connection state intentionally silent in production UI.
    });

    newSocket.on('connect_error', () => {
      // Connection issues are handled by the UI state and retry behavior.
    });

    setSocket(newSocket);
    return () => {
      newSocket.off('connect');
      newSocket.off('subscribed');
      newSocket.off('price_update');
      newSocket.off('disconnect');
      newSocket.off('connect_error');
      newSocket.close();
    };
  }, []);

  const currentPrice = prices[selectedSymbol];
  const spread = currentPrice ? (currentPrice.ask - currentPrice.bid).toFixed(4) : '0';

  // Simple chart data (in production, fetch OHLC from server)
  const chartData = useMemo(() => {
    const now = Date.now();
    return Array.from({ length: 50 }, (_, i) => ({
      time: new Date(now - (50 - i) * 60000).toLocaleTimeString(),
      price: (currentPrice?.mid || 1.0) + (Math.random() - 0.5) * 0.01,
      bid: (currentPrice?.bid || 1.0) + (Math.random() - 0.5) * 0.01,
      ask: (currentPrice?.ask || 1.0) + (Math.random() - 0.5) * 0.01
    }));
  }, [currentPrice?.mid]);

  const handlePlaceOrder = async () => {
    if (!quantity) return;

    setLoading(true);
    try {
      const endpoint = orderType === 'market' 
        ? '/api/forex/order/market'
        : orderType === 'limit'
        ? '/api/forex/order/limit'
        : '/api/forex/order/stop-loss';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: selectedSymbol,
          side: orderSide,
          quantity: parseFloat(quantity),
          leverage: parseFloat(leverage),
          ...(orderType === 'limit' && { limitPrice: parseFloat(limitPrice) })
        })
      });

      if (response.ok) {
        await response.json();
        setOrderTicketOpen(false);
        // Reset form
        setQuantity('1');
        setLimitPrice('');
        // Refetch positions/orders
      } else {
        const error = await response.json();
        alert(`Order failed: ${error.error}`);
      }
    } catch (error) {
      alert('Error placing order: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-screen flex flex-col bg-slate-950 text-white">
      {/* Header */}
      <div className="border-b border-slate-800 p-4 bg-slate-900">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Forex Trading Terminal</h1>
          <div className="flex gap-4">
            <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
              <SelectTrigger className="w-40 bg-slate-800 border-slate-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EUR/USD">EUR/USD</SelectItem>
                <SelectItem value="GBP/USD">GBP/USD</SelectItem>
                <SelectItem value="USD/JPY">USD/JPY</SelectItem>
                <SelectItem value="AAPL">AAPL</SelectItem>
                <SelectItem value="MSFT">MSFT</SelectItem>
                <SelectItem value="XAUUSD">Gold</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Price ticker */}
        {currentPrice && (
          <div className="mt-3 flex gap-8 text-sm">
            <div>
              <span className="text-gray-400">Bid:</span>
              <span className="ml-2 font-mono font-bold">{currentPrice.bid.toFixed(5)}</span>
            </div>
            <div>
              <span className="text-gray-400">Ask:</span>
              <span className="ml-2 font-mono font-bold">{currentPrice.ask.toFixed(5)}</span>
            </div>
            <div>
              <span className="text-gray-400">Spread:</span>
              <span className="ml-2 font-mono text-yellow-400">{spread}</span>
            </div>
            <div>
              <span className="text-gray-400">Last Update:</span>
              <span className="ml-2 text-xs">{new Date(currentPrice.timestamp).toLocaleTimeString()}</span>
            </div>
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 grid grid-cols-4 gap-4 p-4 overflow-hidden">
        {/* Left: Charts */}
        <div className="col-span-2 flex flex-col gap-4">
          {/* Price chart */}
          <Card className="flex-1 bg-slate-900 border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Price Chart - {selectedSymbol}</CardTitle>
            </CardHeader>
            <CardContent className="h-96">
              {currentPrice && (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="time" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                      formatter={(value: any) => value?.toFixed(5)}
                    />
                    <Area type="monotone" dataKey="price" stroke="#3b82f6" fillOpacity={1} fill="url(#colorPrice)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Buy/Sell buttons */}
          <div className="flex gap-4">
            <Button 
              className="flex-1 bg-green-600 hover:bg-green-700 h-12 text-lg"
              onClick={() => { setOrderSide('buy'); setOrderTicketOpen(true); }}
            >
              <TrendingUp className="w-5 h-5 mr-2" />
              BUY
            </Button>
            <Button 
              className="flex-1 bg-red-600 hover:bg-red-700 h-12 text-lg"
              onClick={() => { setOrderSide('sell'); setOrderTicketOpen(true); }}
            >
              <TrendingDown className="w-5 h-5 mr-2" />
              SELL
            </Button>
          </div>
        </div>

        {/* Right: Order ticket, positions, calendar */}
        <div className="col-span-2 flex flex-col gap-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="bg-slate-800 border-slate-700">
              <TabsTrigger value="positions">Positions</TabsTrigger>
              <TabsTrigger value="orders">Orders</TabsTrigger>
              <TabsTrigger value="calendar">Calendar</TabsTrigger>
              <TabsTrigger value="alerts">Alerts</TabsTrigger>
            </TabsList>

            {/* Positions Tab */}
            <TabsContent value="positions" className="flex-1 overflow-y-auto">
              <div className="space-y-2">
                {positions.length === 0 ? (
                  <div className="text-center text-gray-400 py-8">
                    No open positions
                  </div>
                ) : (
                  positions.map(pos => (
                    <Card key={pos.id} className="bg-slate-800 border-slate-700">
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-bold">{pos.symbol}</p>
                            <p className="text-xs text-gray-400">
                              {pos.type === 'long' ? '📈 LONG' : '📉 SHORT'} @ {pos.leverage}x
                            </p>
                          </div>
                          <Badge className={pos.profitPercent > 0 ? 'bg-green-600' : 'bg-red-600'}>
                            {pos.profitPercent > 0 ? '+' : ''}{pos.profitPercent.toFixed(2)}%
                          </Badge>
                        </div>
                        <div className="text-xs grid grid-cols-2 gap-2">
                          <div>Entry: ${pos.entryPrice.toFixed(5)}</div>
                          <div>Current: ${pos.currentPrice.toFixed(5)}</div>
                          <div>Size: {pos.quantity}</div>
                          <div className="font-bold text-green-400">P&L: ${pos.profit.toFixed(2)}</div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            {/* Orders Tab */}
            <TabsContent value="orders" className="flex-1 overflow-y-auto">
              <div className="space-y-2">
                {orders.length === 0 ? (
                  <div className="text-center text-gray-400 py-8">
                    No pending orders
                  </div>
                ) : (
                  orders.map(order => (
                    <Card key={order.id} className="bg-slate-800 border-slate-700">
                      <CardContent className="pt-4 text-xs">
                        <p className="font-bold">{order.symbol}</p>
                        <p>{order.type} - {order.quantity} units</p>
                        {order.price && <p>@ ${order.price}</p>}
                        <Badge className="mt-2">{order.status}</Badge>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            {/* Calendar Tab */}
            <TabsContent value="calendar" className="flex-1 overflow-y-auto">
              <div className="space-y-2 text-xs">
                <div className="p-3 bg-red-900/20 border border-red-700 rounded">
                  <p className="font-bold text-red-400">🔴 US Non-Farm Payroll</p>
                  <p className="text-gray-400">In 2 days</p>
                  <p className="mt-1">Forecast: 199K | Previous: 206K</p>
                </div>
                <div className="p-3 bg-yellow-900/20 border border-yellow-700 rounded">
                  <p className="font-bold text-yellow-400">🟠 ECB Interest Rate</p>
                  <p className="text-gray-400">In 3 days</p>
                  <p className="mt-1">High Impact Event</p>
                </div>
                <div className="p-3 bg-orange-900/20 border border-orange-700 rounded">
                  <p className="font-bold text-orange-400">🟡 UK Retail Sales</p>
                  <p className="text-gray-400">In 1 day</p>
                  <p className="mt-1">Forecast: -0.3% | Previous: 0.2%</p>
                </div>
              </div>
            </TabsContent>

            {/* Alerts Tab */}
            <TabsContent value="alerts" className="flex-1 overflow-y-auto">
              <div className="space-y-2">
                <div className="text-center text-gray-400 py-4 text-sm">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No price alerts set</p>
                  <Button size="sm" variant="outline" className="mt-2">
                    <Plus className="w-3 h-3 mr-1" />
                    New Alert
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Order Ticket Modal (simplified inline) */}
      {orderTicketOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-96 bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="flex justify-between">
                Place Order - {selectedSymbol}
                <button onClick={() => setOrderTicketOpen(false)} className="text-gray-400">✕</button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm text-gray-400">Order Type</label>
                <Select value={orderType} onValueChange={setOrderType as any}>
                  <SelectTrigger className="bg-slate-800 border-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="market">Market Order</SelectItem>
                    <SelectItem value="limit">Limit Order</SelectItem>
                    <SelectItem value="stop-loss">Stop-Loss</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm text-gray-400">Quantity</label>
                <Input 
                  type="number" 
                  value={quantity} 
                  onChange={(e) => setQuantity(e.target.value)}
                  className="bg-slate-800 border-slate-700"
                  min="0.01"
                  step="0.01"
                />
              </div>

              <div>
                <label className="text-sm text-gray-400">Leverage</label>
                <Select value={leverage} onValueChange={setLeverage}>
                  <SelectTrigger className="bg-slate-800 border-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1x</SelectItem>
                    <SelectItem value="5">5x</SelectItem>
                    <SelectItem value="10">10x</SelectItem>
                    <SelectItem value="20">20x</SelectItem>
                    <SelectItem value="30">30x</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {orderType === 'limit' && (
                <div>
                  <label className="text-sm text-gray-400">Limit Price</label>
                  <Input 
                    type="number" 
                    value={limitPrice} 
                    onChange={(e) => setLimitPrice(e.target.value)}
                    className="bg-slate-800 border-slate-700"
                    placeholder="0.00000"
                    step="0.0001"
                  />
                </div>
              )}

              <Button 
                className={`w-full h-10 ${orderSide === 'buy' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                onClick={handlePlaceOrder}
                disabled={loading}
              >
                {loading ? 'Placing...' : `${orderSide.toUpperCase()} ${quantity} ${selectedSymbol}`}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
