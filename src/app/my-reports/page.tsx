"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import FlyerCard from "@/components/FlyerCard";

type LostRow = {
  id: string;
  title: string;
  category: string;
  lostLocation: string;
  lostDate: string;
  status: string;
  rewardAmount: number;
  rewardStatus: string;
  image?: string;
  matchCount: number;
};

type FoundRow = {
  id: string;
  title: string;
  category: string;
  foundLocation: string;
  foundDate: string;
  status: string;
  image?: string;
  matchCount: number;
};

export default function MyReportsPage() {
  const [lost, setLost] = useState<LostRow[] | null>(null);
  const [found, setFound] = useState<FoundRow[] | null>(null);
  const [signedIn, setSignedIn] = useState(true);
  const [tab, setTab] = useState<"lost" | "found">("lost");

  useEffect(() => {
    fetch("/api/my-reports").then(async (res) => {
      if (res.status === 401) {
        setSignedIn(false);
        return;
      }
      const data = await res.json();
      setLost(data.lost || []);
      setFound(data.found || []);
    });
  }, []);

  if (!signedIn) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h1 className="font-display text-3xl mb-3">Sign in to see your reports</h1>
        <Link href="/login" className="text-pin-red underline underline-offset-4">Log in</Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <p className="text-[11px] font-mono-tag tracking-widest text-pin-red">YOUR ACTIVITY</p>
      <h1 className="font-display text-4xl mb-6">My Reports</h1>

      <div className="flex gap-2 mb-8">
        <button
          onClick={() => setTab("lost")}
          className={`px-4 py-2 rounded-full text-sm font-mono-tag border ${
            tab === "lost" ? "bg-pin-red text-paper border-pin-red" : "border-ink/20"
          }`}
        >
          Lost ({lost?.length ?? "…"})
        </button>
        <button
          onClick={() => setTab("found")}
          className={`px-4 py-2 rounded-full text-sm font-mono-tag border ${
            tab === "found" ? "bg-pin-green text-paper border-pin-green" : "border-ink/20"
          }`}
        >
          Found ({found?.length ?? "…"})
        </button>
      </div>

      {tab === "lost" ? (
        lost === null ? (
          <p className="font-mono-tag text-sm text-ink/50">Loading…</p>
        ) : lost.length === 0 ? (
          <EmptyState kind="lost" />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-10">
            {lost.map((it) => (
              <FlyerCard
                key={it.id}
                href={`/lost/${it.id}`}
                kind="lost"
                title={it.title}
                location={it.lostLocation}
                date={it.lostDate}
                image={it.image}
                rewardAmount={it.rewardAmount}
                matchCount={it.matchCount}
              />
            ))}
          </div>
        )
      ) : found === null ? (
        <p className="font-mono-tag text-sm text-ink/50">Loading…</p>
      ) : found.length === 0 ? (
        <EmptyState kind="found" />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-10">
          {found.map((it) => (
            <FlyerCard
              key={it.id}
              href={`/found/${it.id}`}
              kind="found"
              title={it.title}
              location={it.foundLocation}
              date={it.foundDate}
              image={it.image}
              matchCount={it.matchCount}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({ kind }: { kind: "lost" | "found" }) {
  return (
    <div className="font-mono-tag text-sm text-ink/50">
      Nothing here yet.{" "}
      <Link
        href={kind === "lost" ? "/lost/new" : "/found/new"}
        className="text-pin-red underline underline-offset-4"
      >
        Report a {kind} item
      </Link>
      .
    </div>
  );
}
