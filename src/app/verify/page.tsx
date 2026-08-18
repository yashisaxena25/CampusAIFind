"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function VerifyForm() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get("email") || "";
  const devOtp = params.get("devOtp") || "";
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Something went wrong.");
      return;
    }
    router.push("/lost");
    router.refresh();
  }

  return (
    <div className="corkboard min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-16">
      <form onSubmit={onSubmit} className="flyer w-full max-w-sm p-8 pt-10 text-center">
        <p className="text-[11px] font-mono-tag tracking-widest text-pin-red">ONE MORE STEP</p>
        <h1 className="font-display text-3xl mt-1 mb-2">Check your inbox</h1>
        <p className="text-sm text-ink/60 mb-6">
          We sent a 6-digit code to <span className="font-medium">{email}</span>
        </p>

        {devOtp && (
          <p className="text-xs font-mono-tag bg-highlight/30 border border-highlight rounded px-3 py-2 mb-6">
            Demo mode — no email server configured. Your code: <b>{devOtp}</b>
          </p>
        )}

        <input
          required
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
          className="w-full text-center tracking-[0.5em] text-2xl font-mono-tag mb-4 px-3 py-3 rounded border border-ink/20 bg-paper-dark/40 focus:outline-none focus:ring-2 focus:ring-pin-red"
          placeholder="000000"
        />

        {error && <p className="text-sm text-pin-red mb-4">{error}</p>}

        <button
          disabled={loading || otp.length !== 6}
          className="w-full font-display text-lg py-3 bg-pin-red text-paper rounded hover:bg-highlight hover:text-ink transition-colors disabled:opacity-60"
        >
          {loading ? "Verifying…" : "Verify & continue"}
        </button>
      </form>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={null}>
      <VerifyForm />
    </Suspense>
  );
}
