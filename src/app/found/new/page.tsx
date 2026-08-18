"use client";

import { useState } from "react";
import Link from "next/link";
import { CATEGORIES, CAMPUS_LOCATIONS, CONTACT_PREFERENCES } from "@/lib/constants";

const STEPS = ["What you found", "Where", "When", "Photo", "Details", "AI matching"];

type MatchPreview = { lostItemId: string; lostTitle: string; score: number; reasons: string[] };

export default function ReportFoundPage() {
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState<MatchPreview[] | null>(null);
  const [form, setForm] = useState({
    title: "",
    category: CATEGORIES[0],
    description: "",
    color: "",
    brand: "",
    model: "",
    identifyingFeatures: "",
    foundDate: "",
    foundTime: "",
    foundLocation: CAMPUS_LOCATIONS[0],
    currentLocation: "",
    additionalDetails: "",
    contactPreference: "platform",
    image: "",
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function onImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => update("image", reader.result as string);
    reader.readAsDataURL(file);
  }

  const canNext = [
    form.title.trim().length > 1 && form.description.trim().length > 4,
    form.foundLocation,
    form.foundDate,
    true,
    true,
    true,
  ][step];

  async function submit() {
    setError("");
    setLoading(true);
    const res = await fetch("/api/found", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Something went wrong.");
      return;
    }
    setMatches(data.matches || []);
    setStep(5);
  }

  return (
    <div className="corkboard min-h-[calc(100vh-64px)] px-4 py-12 flex justify-center">
      <div className="flyer w-full max-w-2xl p-8 pt-10">
        <p className="text-[11px] font-mono-tag tracking-widest text-pin-green">REPORT A FOUND ITEM</p>
        <h1 className="font-display text-3xl mt-1 mb-2">Thanks for turning this in</h1>
        <p className="text-sm text-ink/60 mb-6">
          A photo helps a lot — CampusFind compares it and your description against active
          lost reports.
        </p>

        <ol className="flex flex-wrap gap-2 mb-8 text-xs font-mono-tag">
          {STEPS.map((s, i) => (
            <li
              key={s}
              className={`px-2.5 py-1 rounded-full border ${
                i === step
                  ? "border-pin-green text-pin-green font-semibold"
                  : i < step
                  ? "border-ink/20 text-ink/40 line-through"
                  : "border-ink/10 text-ink/30"
              }`}
            >
              {i + 1}. {s}
            </li>
          ))}
        </ol>

        {step === 0 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">What did you find?</label>
              <input
                value={form.title}
                onChange={(e) => update("title", e.target.value)}
                placeholder="e.g. Black backpack"
                className="w-full px-3 py-2 rounded border border-ink/20 bg-paper-dark/40 focus:outline-none focus:ring-2 focus:ring-pin-green"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <select
                value={form.category}
                onChange={(e) => update("category", e.target.value)}
                className="w-full px-3 py-2 rounded border border-ink/20 bg-paper-dark/40"
              >
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                rows={3}
                placeholder="Color, brand, condition, anything distinctive…"
                className="w-full px-3 py-2 rounded border border-ink/20 bg-paper-dark/40"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Color</label>
                <input
                  value={form.color}
                  onChange={(e) => update("color", e.target.value)}
                  className="w-full px-3 py-2 rounded border border-ink/20 bg-paper-dark/40"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Brand</label>
                <input
                  value={form.brand}
                  onChange={(e) => update("brand", e.target.value)}
                  className="w-full px-3 py-2 rounded border border-ink/20 bg-paper-dark/40"
                />
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Where did you find it?</label>
              <select
                value={form.foundLocation}
                onChange={(e) => update("foundLocation", e.target.value)}
                className="w-full px-3 py-2 rounded border border-ink/20 bg-paper-dark/40"
              >
                {CAMPUS_LOCATIONS.map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Where is it now?</label>
              <input
                value={form.currentLocation}
                onChange={(e) => update("currentLocation", e.target.value)}
                placeholder="e.g. with me, or handed to security office"
                className="w-full px-3 py-2 rounded border border-ink/20 bg-paper-dark/40"
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Date found</label>
              <input
                type="date"
                value={form.foundDate}
                onChange={(e) => update("foundDate", e.target.value)}
                className="w-full px-3 py-2 rounded border border-ink/20 bg-paper-dark/40"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Approximate time</label>
              <input
                type="time"
                value={form.foundTime}
                onChange={(e) => update("foundTime", e.target.value)}
                className="w-full px-3 py-2 rounded border border-ink/20 bg-paper-dark/40"
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <label className="block text-sm font-medium mb-1">Photo of the item</label>
            <input type="file" accept="image/*" onChange={onImage} className="text-sm" />
            {form.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.image} alt="preview" className="w-full max-h-64 object-cover rounded border border-ink/10" />
            )}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Anything else worth noting?</label>
              <textarea
                value={form.additionalDetails}
                onChange={(e) => update("additionalDetails", e.target.value)}
                rows={2}
                className="w-full px-3 py-2 rounded border border-ink/20 bg-paper-dark/40"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">How should the owner reach you?</label>
              <select
                value={form.contactPreference}
                onChange={(e) => update("contactPreference", e.target.value)}
                className="w-full px-3 py-2 rounded border border-ink/20 bg-paper-dark/40"
              >
                {CONTACT_PREFERENCES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {step === 5 && (
          <div>
            {matches === null ? (
              <p className="font-mono-tag text-sm text-ink/50">Analyzing your found item…</p>
            ) : matches.length === 0 ? (
              <div>
                <h2 className="font-display text-xl mb-2">No matches yet</h2>
                <p className="text-sm text-ink/60">
                  We didn&apos;t find a close match against current lost reports. Your report is
                  live — we&apos;ll notify you if one shows up later.
                </p>
              </div>
            ) : (
              <div>
                <h2 className="font-display text-xl mb-3">Potential matches found</h2>
                <ul className="space-y-3">
                  {matches.map((m, i) => (
                    <li key={m.lostItemId} className="border border-ink/10 rounded p-3 bg-paper-dark/30">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          {i + 1}. {m.lostTitle}
                        </span>
                        <span className="font-mono-tag text-sm font-semibold text-pin-green">
                          {m.score}% match
                        </span>
                      </div>
                      <ul className="text-xs text-ink/60 mt-1 list-disc list-inside">
                        {m.reasons.map((r) => (
                          <li key={r}>{r}</li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <Link
              href="/matches"
              className="inline-block mt-6 px-5 py-2 rounded bg-pin-green text-paper font-display hover:bg-highlight hover:text-ink transition-colors"
            >
              Review in Matches →
            </Link>
          </div>
        )}

        {error && <p className="text-sm text-pin-red mt-4">{error}</p>}

        {step < 5 && (
          <div className="flex justify-between mt-8">
            <button
              type="button"
              disabled={step === 0}
              onClick={() => setStep((s) => s - 1)}
              className="px-4 py-2 rounded border border-ink/20 disabled:opacity-30"
            >
              Back
            </button>
            {step < 4 ? (
              <button
                type="button"
                disabled={!canNext}
                onClick={() => setStep((s) => s + 1)}
                className="px-5 py-2 rounded bg-pin-green text-paper font-display hover:bg-highlight hover:text-ink transition-colors disabled:opacity-40"
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                disabled={loading}
                onClick={submit}
                className="px-5 py-2 rounded bg-pin-green text-paper font-display hover:bg-highlight hover:text-ink transition-colors disabled:opacity-60"
              >
                {loading ? "Analyzing…" : "Submit & find matches"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
