"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { Household, Mode, Window } from "@/lib/types";

type Msg =
  | { role: "user" | "assistant"; content: string; tools?: string[] }
  | { role: "bill"; fields: Record<string, string | number | null> };

const SUGGESTIONS = [
  "My car needs 80% charge by 8am tomorrow. When should I plug in?",
  "When's the cleanest time to run the washing tonight?",
  "How much would solar panels save me in a year?",
];

const BILL_LABELS: Record<string, string> = {
  supplier: "Supplier",
  plan: "Plan",
  billing_period: "Period",
  day_rate_eur_kwh: "Day rate €/kWh",
  night_rate_eur_kwh: "Night rate €/kWh",
  peak_rate_eur_kwh: "Peak rate €/kWh",
  standing_charge_eur_day: "Standing €/day",
  export_rate_eur_kwh: "Export €/kWh",
  kwh_used: "kWh used",
  total_eur: "Total €",
};

export default function Chat({
  household,
  mode,
  onWindows,
}: {
  household: Household;
  mode: Mode;
  onWindows: (w: Window[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [msgs, busy]);

  async function send(text: string) {
    if (!text.trim() || busy) return;
    const next: Msg[] = [...msgs, { role: "user", content: text }];
    setMsgs(next);
    setInput("");
    setBusy(true);
    setError(null);
    try {
      const history = next.filter((m): m is Extract<Msg, { content: string }> => m.role !== "bill").map(({ role, content }) => ({ role, content }));
      const res = await fetch("/api/chat", { method: "POST", body: JSON.stringify({ messages: history, household, mode }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      setMsgs((m) => [...m, { role: "assistant", content: data.text, tools: data.toolsUsed }]);
      if (data.windows?.length) onWindows(data.windows);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function uploadBill(file: File) {
    setBusy(true);
    setError(null);
    setMsgs((m) => [...m, { role: "user", content: `📄 ${file.name}` }]);
    try {
      const form = new FormData();
      form.append("bill", file);
      const res = await fetch("/api/bill", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't read that bill");
      setMsgs((m) => [...m, { role: "bill", fields: data.fields ?? {} }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <motion.button
        onClick={() => setOpen((o) => !o)}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.97 }}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-500 to-sky-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_0_40px_rgba(217,70,239,0.45)]"
      >
        ✨ {open ? "Close" : "Ask WattWhen"}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.aside
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            className="fixed bottom-24 right-6 z-40 flex h-[560px] w-[420px] flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-950/95 shadow-2xl backdrop-blur-xl"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div>
                <div className="text-sm font-semibold">Ask WattWhen</div>
                <div className="text-[11px] text-slate-400">Answers use live grid data through tools. € and CO2 come from code, not the model.</div>
              </div>
              <span className="rounded-full border border-fuchsia-400/30 bg-fuchsia-400/10 px-2 py-0.5 text-[10px] text-fuchsia-300">AI · Claude Haiku 4.5</span>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3 text-sm">
              {msgs.length === 0 && (
                <div className="space-y-2">
                  <div className="text-xs text-slate-400">Try:</div>
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="block w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-left text-slate-200 hover:border-fuchsia-300/40 hover:bg-white/[0.06]"
                    >
                      {s}
                    </button>
                  ))}
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="block w-full rounded-xl border border-dashed border-white/15 px-3 py-2 text-left text-slate-300 hover:border-sky-300/50"
                  >
                    📄 Upload a photo of your electricity bill to use your real tariff
                  </button>
                </div>
              )}
              {msgs.map((m, i) =>
                m.role === "bill" ? (
                  <div key={i} className="rounded-2xl border border-sky-400/20 bg-sky-400/5 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-medium text-sky-200">Read from your bill</span>
                      <span className="rounded-full border border-fuchsia-400/30 bg-fuchsia-400/10 px-2 py-0.5 text-[10px] text-fuchsia-300">AI extraction · check it</span>
                    </div>
                    <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                      {Object.entries(BILL_LABELS).map(([k, l]) => (
                        <div key={k} className="flex justify-between gap-2">
                          <dt className="text-slate-400">{l}</dt>
                          <dd className="font-mono text-slate-100">{m.fields[k] ?? "–"}</dd>
                        </div>
                      ))}
                    </dl>
                    <div className="mt-2 text-[10px] text-slate-500">Names, addresses, account numbers and MPRNs are ignored.</div>
                  </div>
                ) : (
                  <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
                    <div
                      className={`max-w-[90%] whitespace-pre-wrap rounded-2xl px-3 py-2 ${
                        m.role === "user" ? "bg-sky-500/20 text-sky-50" : "border border-white/10 bg-white/[0.04] text-slate-100"
                      }`}
                    >
                      {m.content}
                      {m.role === "assistant" && m.tools && m.tools.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {[...new Set(m.tools)].map((t) => (
                            <span key={t} className="rounded-full bg-sky-400/10 px-2 py-0.5 font-mono text-[10px] text-sky-300">
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ),
              )}
              {busy && (
                <div className="flex gap-1 px-1">
                  {[0, 1, 2].map((d) => (
                    <motion.span
                      key={d}
                      className="h-2 w-2 rounded-full bg-fuchsia-300"
                      animate={{ opacity: [0.2, 1, 0.2] }}
                      transition={{ repeat: Infinity, duration: 1, delay: d * 0.15 }}
                    />
                  ))}
                </div>
              )}
              {error && <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">{error}</div>}
              <div ref={endRef} />
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="flex items-center gap-2 border-t border-white/10 p-3"
            >
              <button type="button" onClick={() => fileRef.current?.click()} title="Upload a bill photo" className="rounded-xl border border-white/10 px-2.5 py-2 text-slate-300 hover:text-white">
                📄
              </button>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="When should I charge the car?"
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none placeholder:text-slate-500 focus:border-fuchsia-300/50"
              />
              <button disabled={busy} className="rounded-xl bg-fuchsia-500 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
                Send
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadBill(f);
                  e.target.value = "";
                }}
              />
            </form>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
