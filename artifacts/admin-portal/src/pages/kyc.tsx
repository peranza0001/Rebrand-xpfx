import { useEffect, useMemo, useState } from "react";
import { Loader2, Search, CheckCircle2, XCircle, ArrowLeft } from "lucide-react";
import { customFetch, useDecideKyc } from "@workspace/api-client-react";

interface KycRecord {
  id: string;
  userId: string;
  status: "not_submitted" | "pending" | "approved" | "rejected";
  idType?: string | null;
  idNumber?: string | null;
  addressLine1?: string | null;
  city?: string | null;
  country?: string | null;
  rejectionReason?: string | null;
  submittedAt?: string | null;
  decidedAt?: string | null;
}

interface UserSummary {
  id: string;
  fullName: string;
  email: string;
}

export function KycPage() {
  const [records, setRecords] = useState<KycRecord[]>([]);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | KycRecord["status"]>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const decideKycMutation = useDecideKyc();

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [kycRows, userRows] = await Promise.all([
          customFetch<KycRecord[]>("/api/admin/kyc", { method: "GET", credentials: "include" }),
          customFetch<UserSummary[]>("/api/admin/users", { method: "GET", credentials: "include" }),
        ]);
        if (active) {
          setRecords(kycRows ?? []);
          setUsers(userRows ?? []);
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Failed to load KYC queue.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const userMap = useMemo(() => new Map(users.map((user) => [user.id, user])), [users]);

  const filtered = useMemo(() => {
    return records.filter((record) => {
      const user = userMap.get(record.userId);
      const text = `${user?.fullName ?? ""} ${user?.email ?? ""} ${record.idType ?? ""} ${record.country ?? ""}`.toLowerCase();
      const matchesStatus = statusFilter === "all" || record.status === statusFilter;
      const matchesSearch = text.includes(search.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [records, search, statusFilter, userMap]);

  const selected = filtered.find((item) => item.id === selectedId) ?? records.find((item) => item.id === selectedId) ?? null;

  const updateStatus = async (userId: string, action: "approve" | "reject") => {
    try {
      await decideKycMutation.mutateAsync({ userId, data: { decision: action, reason: action === "reject" ? "Manual review" : undefined } });
      setRecords((rows) => rows.map((row) => (row.userId === userId ? { ...row, status: action === "approve" ? "approved" : "rejected", decidedAt: new Date().toISOString() } : row)));
      if (selected?.userId === userId) {
        setSelectedId(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : `Could not ${action} KYC.`);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">KYC queue</h1>
          <p className="text-sm text-muted-foreground">Review submitted identity documents and decide whether they should be approved or rejected.</p>
        </div>
        <div className="flex gap-1 rounded-lg bg-muted/30 p-1">
          {(["all", "pending", "approved", "rejected"] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter as typeof statusFilter)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${statusFilter === filter ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by user or country..."
          className="w-full rounded-lg border border-border bg-input py-2 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {error ? <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</div> : null}

      <div className="grid gap-4 xl:grid-cols-[1.4fr_0.8fr]">
        <div className="overflow-hidden rounded-xl border border-card-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">User</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Document</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Loading KYC reviews...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">No KYC submissions match the filters.</td>
                  </tr>
                ) : (
                  filtered.map((record) => {
                    const user = userMap.get(record.userId);
                    return (
                      <tr key={record.id} className="hover:bg-accent/30">
                        <td className="px-4 py-3">
                          <button className="text-left" onClick={() => setSelectedId(record.id)}>
                            <p className="font-medium text-foreground">{user?.fullName ?? "Unknown user"}</p>
                            <p className="text-xs text-muted-foreground">{user?.email ?? ""}</p>
                          </button>
                        </td>
                        <td className="px-4 py-3 text-foreground">{record.idType ?? "—"} • {record.country ?? "—"}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${record.status === "approved" ? "bg-green-500/20 text-green-400" : record.status === "rejected" ? "bg-red-500/20 text-red-400" : "bg-yellow-500/20 text-yellow-400"}`}>
                            {record.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {record.status === "pending" ? (
                            <div className="flex justify-end gap-2">
                              <button className="text-xs text-green-400 hover:opacity-80" onClick={() => updateStatus(record.userId, "approve")}>Approve</button>
                              <button className="text-xs text-red-400 hover:opacity-80" onClick={() => updateStatus(record.userId, "reject")}>Reject</button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">Handled</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-card-border bg-card p-4">
          {selected ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">KYC details</p>
                  <p className="text-xs text-muted-foreground">{selected.id}</p>
                </div>
                <button className="rounded-md p-1 text-muted-foreground hover:bg-accent" onClick={() => setSelectedId(null)}>
                  <ArrowLeft className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-4 space-y-3 text-sm">
                <div className="rounded-lg border border-border bg-muted/20 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Identity</p>
                  <p className="font-medium text-foreground">{userMap.get(selected.userId)?.fullName ?? "Unknown user"}</p>
                  <p className="text-muted-foreground">{userMap.get(selected.userId)?.email ?? ""}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Type</p>
                    <p className="font-semibold text-foreground">{selected.idType ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Country</p>
                    <p className="font-semibold text-foreground">{selected.country ?? "—"}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Address</p>
                  <p className="text-foreground">{selected.addressLine1 ?? "—"}</p>
                  <p className="text-foreground">{selected.city ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Submitted</p>
                  <p className="text-foreground">{selected.submittedAt ? new Date(selected.submittedAt).toLocaleString() : "—"}</p>
                </div>
                {selected.rejectionReason ? <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Rejection reason</p><p className="text-foreground">{selected.rejectionReason}</p></div> : null}
              </div>
              {selected.status === "pending" ? (
                <div className="mt-5 flex gap-2">
                  <button className="flex items-center gap-2 rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white hover:opacity-90" onClick={() => updateStatus(selected.userId, "approve")}>
                    <CheckCircle2 className="h-4 w-4" /> Approve
                  </button>
                  <button className="flex items-center gap-2 rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:opacity-90" onClick={() => updateStatus(selected.userId, "reject")}>
                    <XCircle className="h-4 w-4" /> Reject
                  </button>
                </div>
              ) : null}
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Select a KYC record to review its details.</div>
          )}
        </div>
      </div>
    </div>
  );
}
