import { useGetAdminBilling } from "@workspace/api-client-react";

export function BillingPage() {
  const { data, isLoading } = useGetAdminBilling();

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-foreground">Billing</h1>
        <p className="text-sm text-muted-foreground">Monthly fee overview per user</p>
      </div>

      {data?.defaults && (
        <div className="bg-card border border-card-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-3">Default Rates</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-muted/30 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Maintenance</p>
              <p className="text-lg font-bold text-foreground">${data.defaults.maintenance}</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">AI Bot</p>
              <p className="text-lg font-bold text-foreground">${data.defaults.aiBot}</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Active Trade</p>
              <p className="text-lg font-bold text-foreground">${data.defaults.activeTrade}</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-card border border-card-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">User</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Rates</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total Due</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground text-sm">Loading...</td>
                </tr>
              ) : (data?.rows ?? []).length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground text-sm">No billing data.</td>
                </tr>
              ) : (
                (data?.rows ?? []).map((row) => (
                  <tr key={row.userId} className="hover:bg-accent/20 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{row.userName}</p>
                      <p className="text-xs text-muted-foreground">{row.userEmail}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {row.usingDefaults ? "Default" : `M:$${row.rates.maintenance} AI:$${row.rates.aiBot} T:$${row.rates.activeTrade}`}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-foreground">
                      ${row.currentCycle.totalDue.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        row.currentCycle.fullySettled ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"
                      }`}>
                        {row.currentCycle.fullySettled ? "Paid" : "Unpaid"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
