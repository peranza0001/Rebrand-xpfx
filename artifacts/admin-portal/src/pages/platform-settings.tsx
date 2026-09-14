import { useEffect, useState } from "react";
import {
  useGetPlatformSettings,
  useUpdatePlatformSettings,
} from "@workspace/api-client-react";
import { Loader2, Save, Settings } from "lucide-react";
import { AdminNotificationsPage } from "@/pages/admin-notifications";

export function PlatformSettingsPage() {
  const { data: settings, isLoading, refetch } = useGetPlatformSettings();
  const updateMutation = useUpdatePlatformSettings();

  const [tradingEnabled, setTradingEnabled] = useState(true);
  const [registrationEnabled, setRegistrationEnabled] = useState(true);
  const [demoModeEnabled, setDemoModeEnabled] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState("");
  const [providerFallback, setProviderFallback] = useState({ kyc: true, aml: true, otp: true, email: true, payments: true });
  const [copyTrading, setCopyTrading] = useState({ enabled: true, feePercent: 20, maxFollowersPerLead: 1000 });
  const [tradeManager, setTradeManager] = useState({ liveTradingEnabled: true, demoTradingEnabled: true, maxLeverage: 100, stopOutPercent: 50, maxOpenTradesPerUser: 50 });
  const [networkFees, setNetworkFees] = useState({ deposit: 65, withdrawal: 55, cryptoBuy: 95, cryptoSell: 135, p2p: 75, tradeSettlement: 35 });
  const [savedMsg, setSavedMsg] = useState("");

  useEffect(() => {
    if (settings) {
      setTradingEnabled(settings.tradingEnabled);
      setRegistrationEnabled(settings.registrationEnabled);
      setDemoModeEnabled(settings.demoModeEnabled);
      setMaintenanceMode(settings.maintenanceMode);
      setMaintenanceMessage(settings.maintenanceMessage ?? "");
      setProviderFallback(settings.providerFallback);
      setCopyTrading(settings.copyTrading);
      setTradeManager(settings.tradeManager);
      setNetworkFees(settings.networkFees);
    }
  }, [settings]);

  const save = async () => {
    await updateMutation.mutateAsync({
      data: {
        tradingEnabled,
        registrationEnabled,
        demoModeEnabled,
        maintenanceMode,
        maintenanceMessage: maintenanceMessage.trim(),
        providerFallback,
        copyTrading,
        tradeManager,
        networkFees,
      },
    });
    setSavedMsg("Settings saved.");
    refetch();
    setTimeout(() => setSavedMsg(""), 3000);
  };

  if (isLoading || !settings) {
    return (
      <div className="p-4 sm:p-6 flex items-center gap-2 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading settings...
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-2xl">
      <div className="flex items-center gap-2">
        <Settings className="w-5 h-5 text-primary" />
        <div>
          <h1 className="text-xl font-bold text-foreground">Platform Settings</h1>
          <p className="text-sm text-muted-foreground">Global controls for the trading platform.</p>
        </div>
      </div>

      <div className="bg-card border border-card-border rounded-xl divide-y divide-border">
        <Toggle
          label="Trading Enabled"
          description="When off, all users are blocked from opening or closing trades."
          value={tradingEnabled}
          onChange={setTradingEnabled}
        />
        <Toggle
          label="Registration Enabled"
          description="Allow new users to sign up via the public form."
          value={registrationEnabled}
          onChange={setRegistrationEnabled}
        />
        <Toggle
          label="Demo Mode Available"
          description="Allow visitors to spin up a demo account with seeded balances."
          value={demoModeEnabled}
          onChange={setDemoModeEnabled}
        />
        <Toggle
          label="Maintenance Mode"
          description="Show the maintenance banner to all users."
          value={maintenanceMode}
          onChange={setMaintenanceMode}
        />
      </div>

      <SettingsSection title="Provider fallback" description="Keep core workflows available when an external provider is unavailable.">
        {(["kyc", "aml", "otp", "email", "payments"] as const).map((key) => (
          <Toggle key={key} label={`Admin fallback: ${key.toUpperCase()}`} description="Allow the internal control plane to complete this workflow." value={providerFallback[key]} onChange={(value) => setProviderFallback((current) => ({ ...current, [key]: value }))} />
        ))}
      </SettingsSection>

      <SettingsSection title="Copy trading" description="Global participation rules applied to lead traders and followers.">
        <Toggle label="Copy trading enabled" description="Allow users to follow approved lead traders." value={copyTrading.enabled} onChange={(value) => setCopyTrading((current) => ({ ...current, enabled: value }))} />
        <NumberField label="Performance fee (%)" value={copyTrading.feePercent} min={0} max={100} onChange={(value) => setCopyTrading((current) => ({ ...current, feePercent: value }))} />
        <NumberField label="Maximum followers per lead" value={copyTrading.maxFollowersPerLead} min={1} onChange={(value) => setCopyTrading((current) => ({ ...current, maxFollowersPerLead: value }))} />
      </SettingsSection>

      <SettingsSection title="Trade manager" description="Risk gates for live and demo execution.">
        <Toggle label="Live trading enabled" description="Permit live order execution." value={tradeManager.liveTradingEnabled} onChange={(value) => setTradeManager((current) => ({ ...current, liveTradingEnabled: value }))} />
        <Toggle label="Demo trading enabled" description="Permit simulated order execution." value={tradeManager.demoTradingEnabled} onChange={(value) => setTradeManager((current) => ({ ...current, demoTradingEnabled: value }))} />
        <NumberField label="Maximum leverage" value={tradeManager.maxLeverage} min={1} onChange={(value) => setTradeManager((current) => ({ ...current, maxLeverage: value }))} />
        <NumberField label="Stop-out threshold (%)" value={tradeManager.stopOutPercent} min={0} max={100} onChange={(value) => setTradeManager((current) => ({ ...current, stopOutPercent: value }))} />
        <NumberField label="Maximum open trades per user" value={tradeManager.maxOpenTradesPerUser} min={1} onChange={(value) => setTradeManager((current) => ({ ...current, maxOpenTradesPerUser: value }))} />
      </SettingsSection>

      <SettingsSection title="Network and processing fees" description="Professional fee schedule used by fallback settlement workflows (USD).">
        {(["deposit", "withdrawal", "cryptoBuy", "cryptoSell", "p2p", "tradeSettlement"] as const).map((key) => (
          <NumberField key={key} label={key === "cryptoBuy" ? "Crypto buy" : key === "cryptoSell" ? "Crypto sell" : key === "tradeSettlement" ? "Trade settlement" : key[0].toUpperCase() + key.slice(1)} value={networkFees[key]} min={0} onChange={(value) => setNetworkFees((current) => ({ ...current, [key]: value }))} />
        ))}
      </SettingsSection>

      <div className="bg-card border border-card-border rounded-xl p-5 space-y-3">
        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Maintenance Banner Message
        </label>
        <textarea
          value={maintenanceMessage}
          onChange={(e) => setMaintenanceMessage(e.target.value)}
          rows={3}
          placeholder="We'll be back shortly..."
          className="w-full px-3 py-2 bg-input border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
      </div>

      {savedMsg && <p className="text-sm text-primary">{savedMsg}</p>}

      <button
        onClick={save}
        disabled={updateMutation.isPending}
        className="flex items-center gap-2 bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
      >
        {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 shrink-0" />}
        Save Settings
      </button>

      <div className="border-t border-border pt-6 mt-6 -mx-4 sm:-mx-6 px-0">
        <div className="px-4 sm:px-0">
          <h2 className="text-lg font-semibold text-foreground">Notifications</h2>
          <p className="text-sm text-muted-foreground">
            Manage admin alert toggles, email destinations, and broadcasts.
          </p>
        </div>
        <div className="-mx-4 sm:mx-0">
          <AdminNotificationsPage />
        </div>
      </div>
    </div>
  );
}

function SettingsSection({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="bg-card border border-card-border rounded-xl overflow-hidden">
      <div className="p-5 border-b border-border"><h2 className="text-sm font-semibold text-foreground">{title}</h2><p className="text-xs text-muted-foreground mt-1">{description}</p></div>
      <div className="divide-y divide-border">{children}</div>
    </section>
  );
}

function NumberField({ label, value, min, max, onChange }: { label: string; value: number; min: number; max?: number; onChange: (value: number) => void }) {
  return (
    <label className="flex items-center justify-between gap-4 p-5 text-sm font-medium text-foreground">
      <span>{label}</span>
      <input type="number" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} className="w-32 px-3 py-2 bg-input border border-border rounded-md text-right text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
    </label>
  );
}

function Toggle({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between p-5 gap-4">
      <div>
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${
          value ? "bg-primary" : "bg-muted"
        }`}
      >
        <span
          className={`inline-block w-5 h-5 mt-0.5 rounded-full bg-white transition-transform ${
            value ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}
