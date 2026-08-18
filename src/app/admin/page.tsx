"use client";

import { useEffect, useState } from "react";

type Stats = {
  totalLost: number;
  totalFound: number;
  totalMatches: number;
  verifiedMatches: number;
  recovered: number;
  disputed: number;
  recoveryRate: number;
  rewardsOffered: number;
  rewardsReleased: number;
  topCategories: { category: string; c: number }[];
  topLocations: { location: string; c: number }[];
};

type ReportRow = {
  id: string;
  title: string;
  category: string;
  status: string;
  reward_amount?: number;
  created_at: number;
  reporter: string;
  reporter_email: string;
};

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  isVerified: number;
  isBanned: number;
  createdAt: number;
};

export default function AdminPage() {
  const [tab, setTab] = useState<"overview" | "lost" | "found" | "disputes" | "users">("overview");
  const [stats, setStats] = useState<Stats | null>(null);
  const [lost, setLost] = useState<ReportRow[]>([]);
  const [found, setFound] = useState<ReportRow[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [forbidden, setForbidden] = useState(false);

  async function loadAll() {
    const [s, r, u] = await Promise.all([
      fetch("/api/admin/stats"),
      fetch("/api/admin/reports"),
      fetch("/api/admin/users"),
    ]);
    if (s.status === 403) {
      setForbidden(true);
      return;
    }
    setStats(await s.json());
    const rd = await r.json();
    setLost(rd.lost || []);
    setFound(rd.found || []);
    setDisputes(rd.disputes || []);
    const ud = await u.json();
    setUsers(ud.users || []);
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function removeReport(itemType: "lost" | "found", id: string) {
    await fetch("/api/admin/reports", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemType, id, action: "remove" }),
    });
    loadAll();
  }

  async function toggleBan(userId: string, ban: boolean) {
    await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action: ban ? "ban" : "unban" }),
    });
    loadAll();
  }

  if (forbidden) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <h1 className="font-display text-3xl mb-3">Admins only</h1>
        <p className="text-sm text-ink/60">
          This dashboard is restricted to college administrators. Your account&apos;s role must
          be set to <code>admin</code> in the database.
        </p>
      </div>
    );
  }

  const tabs: { key: typeof tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "lost", label: `Lost (${lost.length})` },
    { key: "found", label: `Found (${found.length})` },
    { key: "disputes", label: `Disputes (${disputes.length})` },
    { key: "users", label: `Users (${users.length})` },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <p className="text-[11px] font-mono-tag tracking-widest text-pin-red">COLLEGE ADMINISTRATION</p>
      <h1 className="font-display text-4xl mb-6">Admin Dashboard</h1>

      <div className="flex flex-wrap gap-2 mb-8">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-full text-sm font-mono-tag border ${
              tab === t.key ? "bg-ink text-paper border-ink" : "border-ink/20"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && stats && (
        <div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            <Stat label="Lost items" value={stats.totalLost} />
            <Stat label="Found items" value={stats.totalFound} />
            <Stat label="Total matches" value={stats.totalMatches} />
            <Stat label="Verified matches" value={stats.verifiedMatches} />
            <Stat label="Recovery rate" value={`${stats.recoveryRate}%`} />
            <Stat label="Disputed cases" value={stats.disputed} />
            <Stat label="Rewards offered" value={`₹${stats.rewardsOffered}`} />
            <Stat label="Rewards released" value={`₹${stats.rewardsReleased}`} />
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-display text-lg mb-2">Most common categories</h3>
              <ul className="text-sm space-y-1">
                {stats.topCategories.map((c) => (
                  <li key={c.category} className="flex justify-between border-b border-ink/10 py-1">
                    <span>{c.category}</span>
                    <span className="font-mono-tag">{c.c}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-display text-lg mb-2">Most common locations</h3>
              <ul className="text-sm space-y-1">
                {stats.topLocations.map((l) => (
                  <li key={l.location} className="flex justify-between border-b border-ink/10 py-1">
                    <span>{l.location}</span>
                    <span className="font-mono-tag">{l.c}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {tab === "lost" && (
        <ReportTable rows={lost} onRemove={(id) => removeReport("lost", id)} />
      )}
      {tab === "found" && (
        <ReportTable rows={found} onRemove={(id) => removeReport("found", id)} />
      )}

      {tab === "disputes" && (
        <div className="space-y-3">
          {disputes.length === 0 ? (
            <p className="font-mono-tag text-sm text-ink/50">No open disputes.</p>
          ) : (
            disputes.map((d) => (
              <div key={d.id} className="border border-pin-red/40 rounded p-4">
                <p className="font-medium">
                  {d.lost_title} ↔ {d.found_title}
                </p>
                <p className="text-xs text-ink/50 font-mono-tag">Match score: {d.overall_score}%</p>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "users" && (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left border-b border-ink/20 font-mono-tag text-xs">
              <th className="py-2">Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Verified</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-ink/10">
                <td className="py-2">{u.name}</td>
                <td>{u.email}</td>
                <td>{u.role}</td>
                <td>{u.isVerified ? "Yes" : "No"}</td>
                <td>{u.isBanned ? "Banned" : "Active"}</td>
                <td>
                  <button
                    onClick={() => toggleBan(u.id, !u.isBanned)}
                    className="text-xs underline underline-offset-4 text-pin-red"
                  >
                    {u.isBanned ? "Unban" : "Ban"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border border-ink/10 rounded p-4 bg-paper-dark/30">
      <p className="text-[11px] font-mono-tag text-ink/50 uppercase">{label}</p>
      <p className="font-display text-2xl">{value}</p>
    </div>
  );
}

function ReportTable({ rows, onRemove }: { rows: ReportRow[]; onRemove: (id: string) => void }) {
  return (
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr className="text-left border-b border-ink/20 font-mono-tag text-xs">
          <th className="py-2">Title</th>
          <th>Category</th>
          <th>Status</th>
          <th>Reporter</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id} className="border-b border-ink/10">
            <td className="py-2">{r.title}</td>
            <td>{r.category}</td>
            <td>{r.status.replace(/_/g, " ")}</td>
            <td>
              {r.reporter} <span className="text-ink/40">({r.reporter_email})</span>
            </td>
            <td>
              {r.status !== "cancelled" && (
                <button
                  onClick={() => onRemove(r.id)}
                  className="text-xs underline underline-offset-4 text-pin-red"
                >
                  Remove
                </button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
