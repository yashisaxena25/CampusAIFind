"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function VerifyForm() {
  const router = useRouter();
  const params = useSearchParams();
  const initialEmail = params.get("email") || "";
  const devOtp = params.get("devOtp") || "";
  
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setLoading(true);
    const res = await fetch("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim().toLowerCase(), otp }),
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

  async function onResend() {
    if (!email) {
      setError("Please enter your college email address first.");
      return;
    }
    setError("");
    setSuccessMsg("");
    setResending(true);
    const res = await fetch("/api/auth/resend-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    });
    const data = await res.json();
    setResending(false);
    if (!res.ok) {
      setError(data.error || "Could not resend OTP code.");
    } else {
      setSuccessMsg("A new verification OTP code has been sent to your email!");
    }
  }

  return (
    <div className="corkboard min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-16">
      <form onSubmit={onSubmit} className="flyer w-full max-w-sm p-8 pt-10 text-center">
        <p className="text-[11px] font-mono-tag tracking-widest text-pin-red">ONE MORE STEP</p>
        <h1 className="font-display text-3xl mt-1 mb-2">Check your inbox</h1>
        <p className="text-sm text-ink/60 mb-4">
          Enter your college email and the 6-digit verification code below.
        </p>

        <label className="block text-left text-xs font-medium text-ink/70 mb-1">College Email</label>
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-4 px-3 py-2 rounded border border-ink/20 bg-paper-dark/40 text-sm focus:outline-none focus:ring-2 focus:ring-pin-red text-center font-mono-tag"
          placeholder="you@college.edu"
        />

        {devOtp && (
          <p className="text-xs font-mono-tag bg-highlight/30 border border-highlight rounded px-3 py-2 mb-4">
            Demo mode — your code: <b>{devOtp}</b>
          </p>
        )}

        <label className="block text-left text-xs font-medium text-ink/70 mb-1">6-Digit OTP Code</label>
        <input
          required
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
          className="w-full text-center tracking-[0.5em] text-2xl font-mono-tag mb-4 px-3 py-3 rounded border border-ink/20 bg-paper-dark/40 focus:outline-none focus:ring-2 focus:ring-pin-red"
          placeholder="000000"
        />

        {error && <p className="text-sm text-pin-red mb-4">{error}</p>}
        {successMsg && <p className="text-sm text-emerald-600 mb-4">{successMsg}</p>}

        <button
          disabled={loading || otp.length !== 6 || !email}
          className="w-full font-display text-lg py-3 bg-pin-red text-paper rounded hover:bg-highlight hover:text-ink transition-colors disabled:opacity-60 mb-3"
        >
          {loading ? "Verifying…" : "Verify & continue"}
        </button>

        <button
          type="button"
          onClick={onResend}
          disabled={resending || !email}
          className="text-xs text-pin-red underline underline-offset-2 hover:text-highlight disabled:opacity-50"
        >
          {resending ? "Sending code..." : "Resend OTP code"}
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
