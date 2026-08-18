"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIES, CAMPUS_LOCATIONS, CONTACT_PREFERENCES } from "@/lib/constants";

const STEPS = ["Basics", "Details", "Location & date", "Photo", "Reward", "Review"];

export default function ReportLostPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    category: CATEGORIES[0],
    description: "",
    color: "",
    brand: "",
    model: "",
    identifyingFeatures: "",
    lostDate: "",
    lostTime: "",
    lostLocation: CAMPUS_LOCATIONS[0],
    additionalDetails: "",
    estimatedValue: "",
    rewardAmount: "",
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
    form.title.trim().length > 1,
    form.description.trim().length > 4,
    form.lostDate && form.lostLocation,
    true,
    true,
    true,
  ][step];

  async function submit() {
    setError("");
    setLoading(true);
    const res = await fetch("/api/lost", {
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
    router.push(`/lost/${data.id}?justPublished=1&matchCount=${data.matchCount}`);
  }

  return (
    <div className="corkboard min-h-[calc(100vh-64px)] px-4 py-12 flex justify-center">
      <div className="flyer w-full max-w-2xl p-8 pt-10">
        <p className="text-[11px] font-mono-tag tracking-widest text-pin-red">REPORT A LOST ITEM</p>
        <h1 className="font-display text-3xl mt-1 mb-2">Tell us what happened</h1>
        <p className="text-sm text-ink/60 mb-6">
          Your report will be visible to verified college users. Identifying details stay
          private until you choose to share them.
        </p>

        <ol className="flex flex-wrap gap-2 mb-8 text-xs font-mono-tag">
          {STEPS.map((s, i) => (
            <li
              key={s}
              className={`px-2.5 py-1 rounded-full border ${
                i === step
                  ? "border-pin-red text-pin-red font-semibold"
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
              <label className="block text-sm font-medium mb-1">Item name</label>
              <input
                value={form.title}
                onChange={(e) => update("title", e.target.value)}
                placeholder="e.g. Black Nike Backpack"
                className="w-full px-3 py-2 rounded border border-ink/20 bg-paper-dark/40 focus:outline-none focus:ring-2 focus:ring-pin-red"
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
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Detailed description</label>
              <textarea
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                rows={4}
                placeholder="What does it look like? Any wear, stickers, or damage?"
                className="w-full px-3 py-2 rounded border border-ink/20 bg-paper-dark/40 focus:outline-none focus:ring-2 focus:ring-pin-red"
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Model</label>
                <input
                  value={form.model}
                  onChange={(e) => update("model", e.target.value)}
                  className="w-full px-3 py-2 rounded border border-ink/20 bg-paper-dark/40"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Estimated value (₹)</label>
                <input
                  type="number"
                  value={form.estimatedValue}
                  onChange={(e) => update("estimatedValue", e.target.value)}
                  className="w-full px-3 py-2 rounded border border-ink/20 bg-paper-dark/40"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Identifying marks{" "}
                <span className="text-ink/40 font-normal">(kept private — used to verify ownership)</span>
              </label>
              <textarea
                value={form.identifyingFeatures}
                onChange={(e) => update("identifyingFeatures", e.target.value)}
                rows={2}
                placeholder="e.g. torn side pocket, a scratch near the charging port…"
                className="w-full px-3 py-2 rounded border border-ink/20 bg-paper-dark/40"
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Date lost</label>
                <input
                  type="date"
                  value={form.lostDate}
                  onChange={(e) => update("lostDate", e.target.value)}
                  className="w-full px-3 py-2 rounded border border-ink/20 bg-paper-dark/40"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Approximate time</label>
                <input
                  type="time"
                  value={form.lostTime}
                  onChange={(e) => update("lostTime", e.target.value)}
                  className="w-full px-3 py-2 rounded border border-ink/20 bg-paper-dark/40"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Last known location</label>
              <select
                value={form.lostLocation}
                onChange={(e) => update("lostLocation", e.target.value)}
                className="w-full px-3 py-2 rounded border border-ink/20 bg-paper-dark/40"
              >
                {CAMPUS_LOCATIONS.map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Additional details (optional)</label>
              <textarea
                value={form.additionalDetails}
                onChange={(e) => update("additionalDetails", e.target.value)}
                rows={2}
                className="w-full px-3 py-2 rounded border border-ink/20 bg-paper-dark/40"
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <label className="block text-sm font-medium mb-1">Reference photo (optional)</label>
            <input type="file" accept="image/*" onChange={onImage} className="text-sm" />
            {form.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.image} alt="preview" className="w-full max-h-64 object-cover rounded border border-ink/10" />
            )}
            <div>
              <label className="block text-sm font-medium mb-1 mt-4">
                How should finders reach you?
              </label>
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

        {step === 4 && (
          <div className="space-y-4">
            <label className="block text-sm font-medium mb-1">
              Offer a reward? <span className="text-ink/40 font-normal">(optional, pledged only for now)</span>
            </label>
            <input
              type="number"
              min={0}
              value={form.rewardAmount}
              onChange={(e) => update("rewardAmount", e.target.value)}
              placeholder="₹ amount, or leave blank"
              className="w-full px-3 py-2 rounded border border-ink/20 bg-paper-dark/40"
            />
            <p className="text-xs text-ink/50">
              The reward isn&apos;t charged now. It&apos;s only released after you confirm the
              item was recovered.
            </p>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-2 text-sm">
            <h2 className="font-display text-xl mb-2">Review</h2>
            <p><b>{form.title}</b> · {form.category}</p>
            <p className="text-ink/70">{form.description}</p>
            <p className="text-ink/70">
              {form.color && `Color: ${form.color} `}
              {form.brand && `· Brand: ${form.brand} `}
              {form.model && `· Model: ${form.model}`}
            </p>
            <p className="text-ink/70">
              Lost at {form.lostLocation} on {form.lostDate || "—"}
            </p>
            {form.rewardAmount && <p className="text-highlight-foreground">Reward: ₹{form.rewardAmount}</p>}
            <p className="text-xs text-ink/40 pt-2">
              Publishing runs CampusFind&apos;s matching engine against active found-item
              reports right away.
            </p>
          </div>
        )}

        {error && <p className="text-sm text-pin-red mt-4">{error}</p>}

        <div className="flex justify-between mt-8">
          <button
            type="button"
            disabled={step === 0}
            onClick={() => setStep((s) => s - 1)}
            className="px-4 py-2 rounded border border-ink/20 disabled:opacity-30"
          >
            Back
          </button>
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              disabled={!canNext}
              onClick={() => setStep((s) => s + 1)}
              className="px-5 py-2 rounded bg-pin-red text-paper font-display hover:bg-highlight hover:text-ink transition-colors disabled:opacity-40"
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              disabled={loading}
              onClick={submit}
              className="px-5 py-2 rounded bg-pin-red text-paper font-display hover:bg-highlight hover:text-ink transition-colors disabled:opacity-60"
            >
              {loading ? "Publishing…" : "Publish report"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
