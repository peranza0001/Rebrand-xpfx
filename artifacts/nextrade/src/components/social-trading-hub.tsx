import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Copy, Star, TrendingUp, Award } from "lucide-react";

interface TopTrader {
  id: string;
  name: string;
  avatar: string;
  winRate: number;
  monthlyReturn: number;
  followers: number;
  profitFactor: number;
  maxDrawdown: number;
  totalTrades: number;
  riskPerTrade: number;
  copiedBy: number;
  isFollowing?: boolean;
}

interface SocialTradingProps {
  topTraders?: TopTrader[];
  onCopyTrader?: (traderId: string) => void;
  onFollowTrader?: (traderId: string) => void;
}

export function SocialTradingHub({
  topTraders = defaultTopTraders,
  onCopyTrader,
  onFollowTrader,
}: SocialTradingProps) {
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());

  const handleFollow = (traderId: string) => {
    const newFollowing = new Set(followingIds);
    if (newFollowing.has(traderId)) {
      newFollowing.delete(traderId);
    } else {
      newFollowing.add(traderId);
    }
    setFollowingIds(newFollowing);
    onFollowTrader?.(traderId);
  };

  const sortedTraders = useMemo(
    () => [...topTraders].sort((a, b) => b.monthlyReturn - a.monthlyReturn),
    [topTraders]
  );

  const stats = useMemo(() => {
    const avgWinRate = sortedTraders.reduce((sum, t) => sum + t.winRate, 0) / sortedTraders.length;
    const avgReturn = sortedTraders.reduce((sum, t) => sum + t.monthlyReturn, 0) / sortedTraders.length;
    const totalFollowers = sortedTraders.reduce((sum, t) => sum + t.followers, 0);

    return {
      avgWinRate: avgWinRate.toFixed(1),
      avgReturn: avgReturn.toFixed(2),
      totalFollowers,
      topPerformer: sortedTraders[0],
    };
  }, [sortedTraders]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Active Traders</div>
            <div className="text-2xl font-bold mt-1">{topTraders.length}</div>
            <div className="text-xs text-muted-foreground mt-2">In network</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Avg Win Rate</div>
            <div className="text-2xl font-bold mt-1 text-emerald-600">{stats.avgWinRate}%</div>
            <div className="text-xs text-muted-foreground mt-2">Network average</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Avg Monthly Return</div>
            <div className="text-2xl font-bold mt-1 text-primary">+{stats.avgReturn}%</div>
            <div className="text-xs text-muted-foreground mt-2">All traders</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Total Followers</div>
            <div className="text-2xl font-bold mt-1">{(stats.totalFollowers / 1000).toFixed(1)}K+</div>
            <div className="text-xs text-muted-foreground mt-2">In community</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Top Traders
            </CardTitle>
            <CardDescription>Copy the trades of successful traders</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {sortedTraders.map((trader, index) => (
              <div
                key={trader.id}
                className="rounded-lg border border-border p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="relative">
                      <img
                        src={trader.avatar}
                        alt={trader.name}
                        className="w-12 h-12 rounded-full"
                      />
                      {index < 3 && (
                        <div className="absolute -top-1 -right-1 bg-primary rounded-full p-1">
                          <Award className="h-3 w-3 text-white" />
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="font-semibold">{trader.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {trader.followers.toLocaleString()} followers • {trader.copiedBy} copying
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-bold ${trader.monthlyReturn >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                      {trader.monthlyReturn >= 0 ? "+" : ""}{trader.monthlyReturn.toFixed(2)}%
                    </div>
                    <div className="text-xs text-muted-foreground">Monthly Return</div>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3 mb-3 text-center text-xs">
                  <div className="rounded-lg bg-muted p-2">
                    <div className="text-muted-foreground">Win Rate</div>
                    <div className="font-bold text-emerald-600">{trader.winRate}%</div>
                  </div>
                  <div className="rounded-lg bg-muted p-2">
                    <div className="text-muted-foreground">Profit Factor</div>
                    <div className="font-bold">{trader.profitFactor.toFixed(2)}</div>
                  </div>
                  <div className="rounded-lg bg-muted p-2">
                    <div className="text-muted-foreground">Max Drawdown</div>
                    <div className="font-bold text-rose-600">{trader.maxDrawdown}%</div>
                  </div>
                  <div className="rounded-lg bg-muted p-2">
                    <div className="text-muted-foreground">Trades</div>
                    <div className="font-bold">{trader.totalTrades}</div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 gap-1"
                    onClick={() => onCopyTrader?.(trader.id)}
                  >
                    <Copy className="h-4 w-4" />
                    Copy Trader
                  </Button>
                  <Button
                    size="sm"
                    variant={followingIds.has(trader.id) ? "default" : "outline"}
                    className="gap-1"
                    onClick={() => handleFollow(trader.id)}
                  >
                    <Star
                      className="h-4 w-4"
                      fill={followingIds.has(trader.id) ? "currentColor" : "none"}
                    />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="h-4 w-4" />
              Elite Trader
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats.topPerformer && (
              <>
                <div className="flex flex-col items-center text-center">
                  <img
                    src={stats.topPerformer.avatar}
                    alt={stats.topPerformer.name}
                    className="w-16 h-16 rounded-full mb-3 border-2 border-primary"
                  />
                  <div>
                    <div className="font-bold text-lg">{stats.topPerformer.name}</div>
                    <Badge className="mt-2">⭐ Top Performer</Badge>
                  </div>
                </div>

                <div className="rounded-lg bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-primary/20 p-4">
                  <div className="text-sm text-muted-foreground mb-2">Performance</div>
                  <div className="text-3xl font-bold text-primary mb-1">
                    +{stats.topPerformer.monthlyReturn}%
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {stats.topPerformer.totalTrades} trades • {stats.topPerformer.winRate}% win rate
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Profit Factor</span>
                    <span className="font-semibold">{stats.topPerformer.profitFactor.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Max Drawdown</span>
                    <span className="font-semibold text-rose-600">{stats.topPerformer.maxDrawdown}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Risk/Trade</span>
                    <span className="font-semibold">{stats.topPerformer.riskPerTrade}%</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-border">
                    <span className="text-muted-foreground">Followers</span>
                    <span className="font-semibold">{(stats.topPerformer.followers / 1000).toFixed(1)}K</span>
                  </div>
                </div>

                <Button className="w-full gap-1">
                  <Copy className="h-4 w-4" />
                  Copy {stats.topPerformer.name}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

const defaultTopTraders: TopTrader[] = [
  {
    id: "1",
    name: "Alex Pro Trader",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex",
    winRate: 72,
    monthlyReturn: 18.5,
    followers: 2450,
    profitFactor: 2.8,
    maxDrawdown: 12,
    totalTrades: 145,
    riskPerTrade: 1.5,
    copiedBy: 380,
  },
  {
    id: "2",
    name: "Sarah FX Master",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
    winRate: 68,
    monthlyReturn: 15.2,
    followers: 1820,
    profitFactor: 2.4,
    maxDrawdown: 14,
    totalTrades: 198,
    riskPerTrade: 2.0,
    copiedBy: 320,
  },
  {
    id: "3",
    name: "Mike Momentum",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mike",
    winRate: 65,
    monthlyReturn: 12.8,
    followers: 1560,
    profitFactor: 2.1,
    maxDrawdown: 16,
    totalTrades: 220,
    riskPerTrade: 1.8,
    copiedBy: 280,
  },
  {
    id: "4",
    name: "Elena Strategy",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Elena",
    winRate: 70,
    monthlyReturn: 14.5,
    followers: 1340,
    profitFactor: 2.5,
    maxDrawdown: 13,
    totalTrades: 176,
    riskPerTrade: 1.6,
    copiedBy: 240,
  },
  {
    id: "5",
    name: "James Scalper",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=James",
    winRate: 61,
    monthlyReturn: 9.3,
    followers: 890,
    profitFactor: 1.8,
    maxDrawdown: 18,
    totalTrades: 312,
    riskPerTrade: 1.2,
    copiedBy: 160,
  },
];
