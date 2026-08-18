"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      if (data.needsVerification) {
        router.push(`/verify?email=${encodeURIComponent(form.email)}`);
        return;
      }
      setError(data.error || "Something went wrong.");
      return;
    }
    router.push("/lost");
    router.refresh();
  }

  return (
    <div className="corkboard min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-16">
      <form onSubmit={onSubmit} className="flyer w-full max-w-md p-8 pt-10">
        <p className="text-[11px] font-mono-tag tracking-widest text-pin-red">WELCOME BACK</p>
        <h1 className="font-display text-3xl mt-1 mb-6">Log in</h1>

        <label className="block text-sm font-medium mb-1">College email</label>
        <input
          required
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="w-full mb-4 px-3 py-2 rounded border border-ink/20 bg-paper-dark/40 focus:outline-none focus:ring-2 focus:ring-pin-red"
          placeholder="you@college.edu"
        />

        <label className="block text-sm font-medium mb-1">Password</label>
        <input
          required
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          className="w-full mb-6 px-3 py-2 rounded border border-ink/20 bg-paper-dark/40 focus:outline-none focus:ring-2 focus:ring-pin-red"
          placeholder="Your password"
        />

        {error && <p className="text-sm text-pin-red mb-4">{error}</p>}

        <button
          disabled={loading}
          className="w-full font-display text-lg py-3 bg-pin-red text-paper rounded hover:bg-highlight hover:text-ink transition-colors disabled:opacity-60"
        >
          {loading ? "Logging in…" : "Log in"}
        </button>

        <p className="text-sm text-center mt-4 text-ink/60">
          New here?{" "}
          <a href="/register" className="text-pin-red underline underline-offset-4">
            Create an account
          </a>
        </p>
      </form>
    </div>
  );
}
