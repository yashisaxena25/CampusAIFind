"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import FlyerCard from "@/components/FlyerCard";
import { CATEGORIES, CAMPUS_LOCATIONS } from "@/lib/constants";

type FoundItem = {
  id: string;
  title: string;
  category: string;
  color?: string;
  foundLocation: string;
  foundDate: string;
  summary: string;
  image?: string;
};

export default function FoundDashboard() {
  const [items, setItems] = useState<FoundItem[]>([]);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("all");
  const [location, setLocation] = useState("all");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (category !== "all") params.set("category", category);
    if (location !== "all") params.set("location", location);
    const res = await fetch(`/api/found?${params.toString()}`);
    const data = await res.json();
    setItems(data.items || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <p className="text-[11px] font-mono-tag tracking-widest text-pin-green">THE BOARD</p>
          <h1 className="font-display text-4xl">Found Items</h1>
        </div>
        <Link
          href="/found/new"
          className="font-display text-sm px-5 py-3 bg-pin-green text-paper rounded hover:bg-highlight hover:text-ink transition-colors self-start"
        >
          + Report Found Item
        </Link>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          load();
        }}
        className="flex flex-wrap gap-3 mb-8 bg-paper-dark/40 border border-ink/10 rounded p-4"
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search title, description, brand…"
          className="flex-1 min-w-[200px] px-3 py-2 rounded border border-ink/20 bg-paper focus:outline-none focus:ring-2 focus:ring-pin-green"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="px-3 py-2 rounded border border-ink/20 bg-paper"
        >
          <option value="all">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="px-3 py-2 rounded border border-ink/20 bg-paper"
        >
          <option value="all">All locations</option>
          {CAMPUS_LOCATIONS.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
        <button
          type="submit"
          onClick={load}
          className="px-4 py-2 rounded border border-ink/30 hover:border-pin-green hover:text-pin-green transition-colors"
        >
          Filter
        </button>
      </form>

      {loading ? (
        <p className="font-mono-tag text-sm text-ink/50">Pinning up listings…</p>
      ) : items.length === 0 ? (
        <p className="font-mono-tag text-sm text-ink/50">
          Nothing matches yet. Try clearing a filter, or be the first to report.
        </p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-10">
          {items.map((it) => (
            <FlyerCard
              key={it.id}
              href={`/found/${it.id}`}
              kind="found"
              title={it.title}
              location={it.foundLocation}
              date={it.foundDate}
              summary={it.summary}
              image={it.image}
            />
          ))}
        </div>
      )}
    </div>
  );
}
