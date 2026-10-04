"use client";
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { Household, Mode } from "@/lib/types";
import Icon from "./Icon";
import SourceBadge from "./SourceBadge";
type Message = { role: "user" | "assistant"; content: string; kind?: string };
export default function Chat({
  household,
  mode,
  sample,
  onClose,
}: {
  household: Household;
  mode: Mode;
  sample: boolean;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]),
    [value, setValue] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const dialog = useRef<HTMLDivElement>(null),
    end = useRef<HTMLDivElement>(null),
    reduced = useReducedMotion();
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    dialog.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function key(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const nodes = dialog.current?.querySelectorAll<HTMLElement>(
          "button:not(:disabled),textarea,a,input",
        );
        if (!nodes?.length) return;
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      document.body.style.overflow = old;
      previous?.focus();
    };
  }, [onClose]);
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: reduced ? "instant" : "smooth" });
  }, [messages, busy, reduced]);
  async function send(text: string) {
    if (busy || !text.trim()) return;
    const next: Message[] = [
      ...messages,
      { role: "user", content: text.trim() },
    ];
    setMessages(next);
    setValue("");
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          household,
          mode,
          sample,
          messages: next
            .slice(-16)
            .map(({ role, content }) => ({ role, content })),
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setMessages([
        ...next,
        { role: "assistant", content: data.text, kind: data.kind },
      ]);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not connect. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="chat-scrim" onClick={onClose} />
      <motion.div
        ref={dialog}
        className="chat-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="chat-title"
        initial={{ opacity: 0, x: reduced ? 0 : 30 }}
        animate={{ opacity: 1, x: 0 }}
      >
        <div className="chat-header">
          <Icon name="bolt" />
          <h2 id="chat-title">Ask WattWhen</h2>
          <button onClick={onClose} aria-label="Close chat">
            <Icon name="close" />
          </button>
        </div>
        <div className="chat-body">
          <h3 className="chat-intro">
            Make yourself at home.
            <br />
            What’s on your mind?
          </h3>
          <p>
            I’ll use your household and the energy forecast to help you find a
            better time.
          </p>
          <div className="chat-suggestions">
            {[
              "When should I run the immersion?",
              household.ev
                ? "Charge my car from 30% to 80% by 08:00 tomorrow."
                : "Why is later tonight a better time?",
              household.solar
                ? "How much could my panels earn in a year?"
                : "What changes when I choose less carbon?",
            ].map((q) => (
              <button key={q} onClick={() => send(q)} disabled={busy}>
                {q} ↗
              </button>
            ))}
          </div>
          <div aria-live="polite">
            {messages.map((m, i) => (
              <div key={i} className={`message ${m.role}`}>
                {m.role === "assistant" && (
                  <SourceBadge kind={m.kind === "ai" ? "ai" : "estimate"}>
                    {m.kind === "ai"
                      ? "AI · explained from tool results"
                      : "Calculated planner · not AI"}
                  </SourceBadge>
                )}
                {m.content}
              </div>
            ))}
            {busy && <p className="loading">Checking your energy plan…</p>}
            {error && (
              <p className="error-message" role="alert">
                {error}
              </p>
            )}
          </div>
          <div ref={end} />
        </div>
        <form
          className="chat-form"
          onSubmit={(e) => {
            e.preventDefault();
            send(value);
          }}
        >
          <label htmlFor="chat-message">Your question</label>
          <div className="chat-input-row">
            <textarea
              id="chat-message"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="A better time to put a wash on?"
              maxLength={3000}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(value);
                }
              }}
            />
            <button aria-label="Send question" disabled={busy || !value.trim()}>
              <Icon name="arrow" />
            </button>
          </div>
          <p>
            AI explains. Code calculates. Estimates use a synthetic household
            and sample tariff.
          </p>
        </form>
      </motion.div>
    </>
  );
}
