import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Send, Sparkles, AlertCircle, TrendingUp } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface AITradingAssistantProps {
  userName?: string;
  onTrade?: (symbol: string, side: "buy" | "sell") => void;
}

export function AITradingAssistant({
  userName = "Trader",
  onTrade: _onTrade,
}: AITradingAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: `👋 Hello ${userName}! I'm your AI Trading Assistant. I can help you with:
      
📊 Market Analysis - Real-time price movements and trends
💡 Trading Ideas - Generate signals based on technical analysis
🛡️ Risk Management - Position sizing and stop-loss recommendations
📈 Performance Review - Analyze your trading statistics
📝 Trade Journaling - Record and review your trades

What would you like help with today?`,
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: generateAIResponse(inputValue),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 800);
  };

  const quickPrompts = [
    "What's EUR/USD outlook?",
    "Risk management tips",
    "Position sizing for 2% risk",
    "Today's market analysis",
  ];

  return (
    <div className="flex h-[600px] gap-4 lg:col-span-2">
      <Card className="flex-1 flex flex-col">
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-base">AI Trading Assistant</CardTitle>
                <CardDescription className="text-xs">Powered by advanced analytics</CardDescription>
              </div>
            </div>
            <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30">
              Online
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-4 overflow-hidden">
          <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-2">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-xs lg:max-w-md rounded-lg p-3 text-sm ${
                    message.role === "user"
                      ? "bg-primary/20 border border-primary/30 text-foreground"
                      : "bg-muted border border-border text-foreground"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {message.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted border border-border rounded-lg p-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" />
                    <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce delay-100" />
                    <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce delay-200" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSendMessage} className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask me anything about trading..."
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={isLoading}
              />
              <Button
                type="submit"
                size="sm"
                disabled={!inputValue.trim() || isLoading}
                className="gap-1"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {quickPrompts.map((prompt, index) => (
                <button
                  key={index}
                  onClick={() => setInputValue(prompt)}
                  className="text-xs rounded-lg border border-border p-2 hover:bg-muted text-left text-muted-foreground hover:text-foreground transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="hidden lg:flex flex-col gap-4 w-72">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              AI Signals
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
              <div className="flex items-start justify-between mb-1">
                <span className="font-semibold text-sm text-emerald-600">
                  Strong Buy
                </span>
                <Badge className="bg-emerald-500/20 text-emerald-600 text-xs">
                  80%
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">EUR/USD | 1H Chart</p>
              <p className="text-xs mt-1 text-muted-foreground">
                Buy signal at 1.0854 with TP at 1.0920
              </p>
            </div>

            <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3">
              <div className="flex items-start justify-between mb-1">
                <span className="font-semibold text-sm text-rose-600">
                  Strong Sell
                </span>
                <Badge className="bg-rose-500/20 text-rose-600 text-xs">
                  75%
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">GBP/JPY | 4H Chart</p>
              <p className="text-xs mt-1 text-muted-foreground">
                Sell signal at 188.74 with SL at 189.20
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Risk Alert
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="rounded-lg p-2 bg-amber-500/10 border border-amber-500/30">
              <p className="text-amber-700 dark:text-amber-400 text-xs font-semibold">
                High Volatility Ahead
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                US jobs report in 2 hours. Consider reducing position size.
              </p>
            </div>
            <div className="rounded-lg p-2 bg-blue-500/10 border border-blue-500/30">
              <p className="text-blue-700 dark:text-blue-400 text-xs font-semibold">
                Correlation Alert
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                EUR/USD and GBP/USD highly correlated. Manage multi-pair risk.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function generateAIResponse(userInput: string): string {
  const input = userInput.toLowerCase();

  if (input.includes("eur/usd") || input.includes("outlook"))
    return `📊 EUR/USD Market Analysis:

Current: 1.0854 | Trend: Bullish
Resistance: 1.0920 | Support: 1.0800

📈 Technical Signals:
- RSI: 65 (Overbought territory)
- MACD: Bullish crossover confirmed
- Moving Averages: Price above 50/200 EMA

💡 Trading Setup:
BUY at 1.0854 | Stop Loss: 1.0800 | Take Profit: 1.0920
Risk/Reward: 1:2.0 | Confidence: 85%

⚠️ Watch: US Core PCE inflation data today at 13:30 EST could impact price action.

Would you like me to help with position sizing or risk management?`;

  if (input.includes("risk") || input.includes("position size"))
    return `🛡️ Risk Management Strategy:

Account Balance: $50,000
Risk Per Trade: 2% = $1,000

📐 Position Sizing Formula:
Position Size = (Risk Amount) / (Pips at Risk)

Example for EUR/USD:
Entry: 1.0854 | Stop Loss: 1.0800 = 54 pips
Position Size = $1,000 / 54 = ~1.85 micro lots

✅ Best Practices:
1. Never risk more than 2% per trade
2. Maintain 1:2 risk/reward ratio minimum
3. Use trailing stops for trending markets
4. Keep max 3 open positions simultaneously

Would you like a detailed position sizing calculation for a specific trade?`;

  if (input.includes("tip") || input.includes("advice"))
    return `💡 Top Trading Tips from AI:

1. **Trend Following** - Trade with the trend, not against it
   ✓ 70% of profitable trades follow the 4H trend

2. **Risk Management** - Your most valuable skill
   ✓ Position sizing > Entry timing

3. **Economic Calendar** - Never ignore major events
   ✓ Non-Farm Payroll moves markets 100+ pips

4. **Time Your Entries** - Wait for confirmation
   ✓ Bollinger Band breakouts + volume = 72% win rate

5. **Psychology** - Master your emotions
   ✓ Stick to your trading plan, avoid revenge trading

🎯 Action: Which tip would you like me to elaborate on?`;

  if (input.includes("signal") || input.includes("trade idea"))
    return `📊 Current Trading Signals:

🟢 STRONG BUY - EUR/USD (1H)
Entry: 1.0854 | Stop: 1.0800 | Target: 1.0920
Confidence: 85% | Win Rate: 78%

🔴 STRONG SELL - GBP/JPY (4H)
Entry: 188.74 | Stop: 189.20 | Target: 187.50
Confidence: 82% | Win Rate: 75%

🟡 NEUTRAL - BTC/USD (1D)
Waiting for breakout above $65,000
Next Support: $63,500

Would you like to execute any of these signals?`;

  return `✨ Smart Response:

I can help you with:
• Market Analysis & Trends
• Technical Signal Generation
• Risk/Position Sizing
• Trade Journaling
• Performance Analysis
• Economic Event Impact

Please ask me about any specific currency pair, commodity, or crypto, and I'll provide detailed technical analysis with entry/exit levels.

What would you like to explore? 📈`;
}
