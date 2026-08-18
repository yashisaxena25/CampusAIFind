"use client";

import { useEffect, useState } from "react";
import { HANDOVER_LOCATIONS } from "@/lib/constants";
import MessageThread from "@/components/MessageThread";

type Match = {
  id: string;
  lostItemId: string;
  foundItemId: string;
  lostTitle: string;
  foundTitle: string;
  lostImage?: string;
  foundImage?: string;
  rewardAmount: number;
  overallScore: number;
  reasons: string[];
  status: string;
  perspective: "owner" | "finder";
};

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  possible_match: { label: "Possible Match", color: "text-ink/60" },
  strong_match: { label: "Strong Match", color: "text-pin-green" },
  verified_match: { label: "Verified Match", color: "text-pin-green" },
  rejected_match: { label: "Rejected", color: "text-ink/40" },
  disputed: { label: "Disputed", color: "text-pin-red" },
};

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState(true);

  async function load() {
    const res = await fetch("/api/matches");
    if (res.status === 401) {
      setSignedIn(false);
      setMatches([]);
      return;
    }
    const data = await res.json();
    setMatches(data.matches || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function act(id: string, action: string) {
    setBusyId(id);
    await fetch(`/api/matches/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    await load();
    setBusyId(null);
  }

  if (!signedIn) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h1 className="font-display text-3xl mb-3">Sign in to see your matches</h1>
        <a href="/login" className="text-pin-red underline underline-offset-4">Log in</a>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <p className="text-[11px] font-mono-tag tracking-widest text-pin-red">AI SUGGESTIONS</p>
      <h1 className="font-display text-4xl mb-2">Matches</h1>
      <p className="text-sm text-ink/60 mb-8">
        CampusFind never declares a match final — it only estimates confidence. Ownership is
        always confirmed by the people involved.
      </p>

      {matches === null ? (
        <p className="font-mono-tag text-sm text-ink/50">Loading…</p>
      ) : matches.length === 0 ? (
        <p className="font-mono-tag text-sm text-ink/50">
          No matches yet. They&apos;ll show up here as soon as a lost and found report line up.
        </p>
      ) : (
        <ul className="space-y-6">
          {matches.map((m) => {
            const s = STATUS_LABEL[m.status] || { label: m.status, color: "text-ink/60" };
            return (
              <li key={m.id} className="flyer p-6 pt-8">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono-tag text-xs">
                    {m.perspective === "owner" ? "Your lost report" : "Your found report"}
                  </span>
                  <span className={`font-mono-tag text-xs font-semibold ${s.color}`}>{s.label}</span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs text-pin-red font-mono-tag">LOST</p>
                    <p className="font-medium">{m.lostTitle}</p>
                  </div>
                  <div className="font-display text-2xl text-pin-green">{m.overallScore}%</div>
                  <div className="text-right">
                    <p className="text-xs text-pin-green font-mono-tag">FOUND</p>
                    <p className="font-medium">{m.foundTitle}</p>
                  </div>
                </div>

                <ul className="text-xs text-ink/60 mt-4 list-disc list-inside space-y-0.5">
                  {m.reasons.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>

                {m.rewardAmount > 0 && (
                  <p className="text-xs font-mono-tag bg-highlight/30 inline-block px-2 py-1 rounded mt-3">
                    ₹{m.rewardAmount} reward pledged — released once the owner confirms recovery
                  </p>
                )}

                {m.status === "verified_match" && (
                  <div className="mt-4 text-sm bg-paper-dark/40 border border-ink/10 rounded p-3">
                    <b>Suggested safe handover locations:</b>{" "}
                    {HANDOVER_LOCATIONS.join(", ")}. Avoid meeting in private or unsupervised
                    spaces.
                  </div>
                )}

                <MessageThread matchId={m.id} />

                {(m.status === "possible_match" || m.status === "strong_match") && (
                  <div className="flex gap-3 mt-4">
                    <button
                      disabled={busyId === m.id}
                      onClick={() => act(m.id, "confirm")}
                      className="px-4 py-2 rounded bg-pin-green text-paper text-sm font-display hover:bg-highlight hover:text-ink transition-colors disabled:opacity-50"
                    >
                      This is a match
                    </button>
                    <button
                      disabled={busyId === m.id}
                      onClick={() => act(m.id, "reject")}
                      className="px-4 py-2 rounded border border-ink/20 text-sm hover:border-pin-red hover:text-pin-red transition-colors disabled:opacity-50"
                    >
                      Not a match
                    </button>
                    <button
                      disabled={busyId === m.id}
                      onClick={() => act(m.id, "dispute")}
                      className="px-4 py-2 rounded border border-ink/20 text-sm hover:border-pin-red hover:text-pin-red transition-colors disabled:opacity-50 ml-auto"
                    >
                      Flag a dispute
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
