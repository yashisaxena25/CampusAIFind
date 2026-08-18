"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function FoundDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch(`/api/found/${id}`);
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
    await fetch(`/api/found/${id}`, {
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
        <p className="text-[11px] font-mono-tag tracking-widest text-pin-green">FOUND</p>
        <h1 className="font-display text-3xl mt-1 mb-1">{item.title}</h1>
        <p className="text-sm text-ink/50 mb-4">{item.category}</p>

        {item.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image} alt={item.title} className="w-full max-h-72 object-cover rounded border border-ink/10 mb-4" />
        )}

        <p className="text-sm mb-4">{item.isOwner ? item.description : item.summary}</p>

        <dl className="text-sm space-y-1 mb-4">
          <div><b>Found near:</b> {item.foundLocation}</div>
          <div><b>Date:</b> {new Date(item.foundDate).toLocaleDateString("en-IN")}</div>
          {item.color && <div><b>Color:</b> {item.color}</div>}
          {item.isOwner && item.brand && <div><b>Brand:</b> {item.brand}</div>}
          {item.isOwner && item.currentLocation && <div><b>Currently at:</b> {item.currentLocation}</div>}
          <div><b>Status:</b> {item.status.replace(/_/g, " ")}</div>
        </dl>

        {!item.isOwner && (
          <p className="text-xs text-ink/50 mb-4">
            Found by {item.finderName}. If this is yours, report it as lost (or check Matches
            if you already have) so ownership can be verified before handover.
          </p>
        )}

        {item.isOwner && item.status !== "cancelled" && item.status !== "case_closed" && (
          <div className="flex gap-3 mt-6">
            <button
              disabled={busy}
              onClick={() => act("mark_returned")}
              className="px-4 py-2 rounded bg-pin-green text-paper font-display text-sm hover:bg-highlight hover:text-ink transition-colors disabled:opacity-50"
            >
              Mark as returned
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

        <Link href="/matches" className="block text-sm text-pin-green underline underline-offset-4 mt-6">
          View suggested matches →
        </Link>
      </div>
    </div>
  );
}
