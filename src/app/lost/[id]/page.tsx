"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function LostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const router = useRouter();
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const justPublished = params.get("justPublished");
  const matchCount = params.get("matchCount");

  async function load() {
    const res = await fetch(`/api/lost/${id}`);
    const data = await res.json();
    setItem(data.item || null);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function act(action: string) {
    setBusy(true);
    await fetch(`/api/lost/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    await load();
    setBusy(false);
  }

  if (loading) return <p className="p-10 font-mono-tag text-sm text-ink/50">Loading…</p>;
  if (!item) return <p className="p-10 font-mono-tag text-sm text-ink/50">This report doesn&apos;t exist.</p>;

  return (
    <div className="corkboard min-h-[calc(100vh-64px)] px-4 py-12 flex justify-center">
      <div className="flyer w-full max-w-xl p-8 pt-10">
        {justPublished && (
          <div className="bg-highlight/30 border border-highlight text-sm rounded px-3 py-2 mb-6">
            🔔 Report published.{" "}
            {Number(matchCount) > 0
              ? `AI found ${matchCount} possible match${Number(matchCount) > 1 ? "es" : ""} already — check your Matches tab.`
              : "No matches yet — we'll notify you if a found item lines up."}
          </div>
        )}

        <p className="text-[11px] font-mono-tag tracking-widest text-pin-red">LOST</p>
        <h1 className="font-display text-3xl mt-1 mb-1">{item.title}</h1>
        <p className="text-sm text-ink/50 mb-4">{item.category}</p>

        {item.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image} alt={item.title} className="w-full max-h-72 object-cover rounded border border-ink/10 mb-4" />
        )}

        <p className="text-sm mb-4">{item.isOwner ? item.description : item.summary}</p>

        <dl className="text-sm space-y-1 mb-4">
          <div><b>Last seen:</b> {item.lostLocation}</div>
          <div><b>Date:</b> {new Date(item.lostDate).toLocaleDateString("en-IN")}</div>
          {item.color && <div><b>Color:</b> {item.color}</div>}
          {item.isOwner && item.brand && <div><b>Brand:</b> {item.brand}</div>}
          {item.isOwner && item.model && <div><b>Model:</b> {item.model}</div>}
          {item.isOwner && item.identifyingFeatures && (
            <div><b>Identifying marks (private):</b> {item.identifyingFeatures}</div>
          )}
          <div><b>Status:</b> {item.status.replace(/_/g, " ")}</div>
        </dl>

        {item.rewardAmount > 0 && (
          <div className="inline-block bg-highlight text-ink font-mono-tag text-sm px-3 py-1.5 rounded mb-4">
            ₹{item.rewardAmount} reward — {item.rewardStatus.replace(/_/g, " ")}
          </div>
        )}

        {!item.isOwner && (
          <p className="text-xs text-ink/50 mb-4">
            Reported by {item.reporterName}. Think this might be yours to return? Report it as
            found and CampusFind will connect you both.
          </p>
        )}

        {item.isOwner && item.status !== "cancelled" && item.status !== "case_closed" && (
          <div className="flex gap-3 mt-6">
            <button
              disabled={busy}
              onClick={() => act("mark_recovered")}
              className="px-4 py-2 rounded bg-pin-green text-paper font-display text-sm hover:bg-highlight hover:text-ink transition-colors disabled:opacity-50"
            >
              Mark as recovered
            </button>
            <button
              disabled={busy}
              onClick={() => act("cancel")}
              className="px-4 py-2 rounded border border-ink/20 text-sm hover:border-pin-red hover:text-pin-red transition-colors disabled:opacity-50"
            >
              Cancel report
            </button>
          </div>
        )}

        <Link href="/matches" className="block text-sm text-pin-red underline underline-offset-4 mt-6">
          View suggested matches →
        </Link>
      </div>
    </div>
  );
}
