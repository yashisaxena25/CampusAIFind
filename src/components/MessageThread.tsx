"use client";

import { useEffect, useRef, useState } from "react";

type Msg = { id: string; body: string; senderName: string; isMe: boolean; createdAt: number };

export default function MessageThread({ matchId }: { matchId: string }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[] | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function load() {
    const res = await fetch(`/api/matches/${matchId}/messages`);
    const data = await res.json();
    setMessages(data.messages || []);
  }

  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages]);

  async function send() {
    if (!draft.trim()) return;
    setSending(true);
    await fetch(`/api/matches/${matchId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: draft.trim() }),
    });
    setDraft("");
    await load();
    setSending(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs font-mono-tag text-ink/60 underline underline-offset-4 mt-3"
      >
        Message about this match →
      </button>
    );
  }

  return (
    <div className="mt-4 border border-ink/10 rounded bg-paper-dark/30 p-3">
      <div className="max-h-48 overflow-y-auto space-y-2 mb-2 pr-1">
        {messages === null ? (
          <p className="text-xs text-ink/40 font-mono-tag">Loading conversation…</p>
        ) : messages.length === 0 ? (
          <p className="text-xs text-ink/40 font-mono-tag">
            No messages yet — say hello without sharing contact details.
          </p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`text-sm ${m.isMe ? "text-right" : "text-left"}`}>
              <span
                className={`inline-block px-3 py-1.5 rounded-lg max-w-[80%] ${
                  m.isMe ? "bg-pin-green text-paper" : "bg-paper border border-ink/10"
                }`}
              >
                {m.body}
              </span>
              <div className="text-[10px] text-ink/40 font-mono-tag mt-0.5">
                {m.isMe ? "You" : m.senderName}
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Type a message…"
          className="flex-1 px-3 py-2 rounded border border-ink/20 bg-paper text-sm focus:outline-none focus:ring-2 focus:ring-pin-green"
        />
        <button
          disabled={sending}
          onClick={send}
          className="px-4 py-2 rounded bg-pin-green text-paper text-sm font-display disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}
