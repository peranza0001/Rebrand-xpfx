/**
 * Forex/Stocks Trading Page
 * Main entry point for traders to access the trading terminal
 */

import { ForexTradingTerminal } from '@/components/forex-trading-terminal';
import { useAuth } from '@/lib/auth';
import { useLocation } from 'wouter';
import { useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function Trading() {
  const { user, isDemo, accountTier } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!user && !isDemo) {
      navigate('/login');
    }
  }, [user, isDemo, navigate]);

  if (!user && !isDemo) {
    return null;
  }

  // Demo users have limited trading capabilities
  const isDemoTradingRestricted = isDemo || (accountTier ?? 0) < 1;

  return (
    <div className="w-full h-screen bg-slate-950">
      {isDemoTradingRestricted && (
        <div className="absolute top-0 left-0 right-0 z-50 bg-yellow-900/30 border-b border-yellow-700 p-3">
          <div className="max-w-7xl mx-auto flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-semibold text-yellow-300">
                {isDemo ? 'Demo Mode' : 'Limited Access'}
              </p>
              <p className="text-yellow-200 text-xs mt-1">
                {isDemo 
                  ? 'You are using demo trading with simulated positions. No real money involved.'
                  : 'Upgrade your account to enable live trading and higher leverage. Complete your KYC verification.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main trading terminal */}
      <div className={isDemoTradingRestricted ? 'mt-16' : ''}>
        <ForexTradingTerminal />
      </div>

      {/* Quick help overlay for first-time traders */}
      <div className="fixed bottom-4 right-4 z-40">
        <Card className="w-80 bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <span>✨ Trading Tips</span>
              <button className="ml-auto text-gray-400 hover:text-gray-300">✕</button>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-2 text-gray-300">
            <p>• Always use stop-loss orders to manage risk</p>
            <p>• Monitor economic calendar events for high volatility</p>
            <p>• Set price alerts for key support/resistance levels</p>
            <p>• Start with small position sizes while learning</p>
            <Button size="sm" variant="outline" className="w-full mt-2">
              View Trading Guide
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
