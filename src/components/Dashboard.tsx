"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { motion, MotionConfig } from "motion/react";
import { tariffFor } from "@/lib/tariffs";
import { households } from "@/lib/households";
import { dayLabel, timeLabel } from "@/lib/time";
import type { Grid, Household, Mode, Window } from "@/lib/types";
import Icon from "./Icon";
import SourceBadge from "./SourceBadge";
import SetupPanel from "./SetupPanel";
import Timeline from "./Timeline";
import SolarYear from "./SolarYear";
const House3D = dynamic(() => import("./House3D"), {
  ssr: false,
  loading: () => (
    <div className="scene-fallback">
      <Icon name="home" size={64} />
      <p>Bringing your home to life…</p>
    </div>
  ),
});
const Chat = dynamic(() => import("./Chat"), { ssr: false });
const money = (n: number) =>
  new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(
    n,
  );
export default function Dashboard() {
  const [household, setHousehold] = useState<Household>(households[0]),
    [mode, setMode] = useState<Mode>("both"),
    [grid, setGrid] = useState<Grid | null>(null),
    [windows, setWindows] = useState<Window[]>([]),
    [selected, setSelected] = useState("immersion"),
    [slotIndex, setSlotIndex] = useState(0),
    [tab, setTab] = useState("today"),
    [sample, setSample] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [chat, setChat] = useState(false),
    [paused, setPaused] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      setLoading(true);
      setError("");
      fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ household, mode, sample }),
        signal: controller.signal,
      })
        .then(async (r) => {
          const d = await r.json();
          if (!r.ok) throw new Error(d.error);
          setGrid(d.grid);
          setWindows(d.windows);
          setLoading(false);
        })
        .catch((e) => {
          if (e.name !== "AbortError") {
            setError(e.message);
            setWindows([]);
            setGrid(null);
            setLoading(false);
          }
        });
    }, 180);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [household, mode, sample]);
  const chosen = windows.find((w) => w.applianceId === selected) ?? windows[0],
    appliance = household.appliances.find((a) => a.id === chosen?.applianceId),
    slot = grid?.slots[slotIndex];
  function changeHouse(h: Household) {
    setHousehold(h);
    if (!h.appliances.some((a) => a.id === selected))
      setSelected(h.appliances[0]?.id ?? "");
  }
  return (
    <MotionConfig reducedMotion="user">
      <div className="app-shell">
        <header className="topbar">
          <Link className="wordmark" href="/" aria-label="WattWhen home">
            <span className="logo-mark">
              <Icon name="bolt" size={23} />
            </span>
            watt<span>when</span>
            <i>IE</i>
          </Link>
          <nav className="main-nav" aria-label="View">
            <button
              className={tab === "today" ? "active" : ""}
              onClick={() => setTab("today")}
            >
              <Icon name="home" size={16} />
              Your home
            </button>
            <button
              className={tab === "solar" ? "active" : ""}
              onClick={() => setTab("solar")}
            >
              <Icon name="sun" size={17} />
              Solar year
            </button>
          </nav>
          <div className="header-right">
            <span className="irish-grid">
              <i />
              Made for the Irish grid
            </span>
            <button
              className="avatar"
              aria-label="Open household settings"
              onClick={() => document.getElementById("household")?.focus()}
            >
              M
            </button>
          </div>
        </header>
        <main id="main">
          <div className="page-heading">
            <div>
              <div className="eyebrow">SMALL SHIFTS. BETTER ENERGY.</div>
              <h1>
                A good time to <em>power your home.</em>
              </h1>
              <p>A little planning. A lighter bill. A cleaner grid.</p>
            </div>
            <div className="date-block">
              <span>
                {grid ? dayLabel(grid.meta.anchor) : "YOUR ENERGY, IN FOCUS"}
              </span>
              <button
                onClick={() => setSample(!sample)}
                className={sample ? "replay active" : "replay"}
                aria-pressed={sample}
              >
                <Icon name="clock" size={14} />
                {sample ? "Demo replay on" : "Use demo replay"}
              </button>
            </div>
          </div>
          <div className="workspace">
            <div className="visual-column">
              {tab === "today" ? (
                <section className="house-panel">
                  <div className="house-topline">
                    <div>
                      <span className="live-dot" /> {household.county}, Ireland{" "}
                      <span className="house-context">/ {household.name}</span>
                    </div>
                    <span className="outline-pill">SYNTHETIC HOME</span>
                  </div>
                  <div className="house-caption">
                    <h2>
                      Every home has
                      <br />a better <span>when.</span>
                    </h2>
                    <p>
                      Explore your appliances.
                      <br />
                      Find their moment.
                    </p>
                  </div>
                  <div className="house-canvas">
                    <House3D
                      household={household}
                      slot={slot}
                      selected={selected}
                      onSelect={setSelected}
                      paused={paused}
                    />
                  </div>
                  <div className="scene-toolbar">
                    <span>
                      <Icon name="grid" size={14} />
                      ILLUSTRATIVE FLOWS
                    </span>
                    <button
                      onClick={() => setPaused(!paused)}
                      aria-pressed={paused}
                    >
                      {paused ? "Play flows" : "Pause flows"}
                    </button>
                    <span>Drag to explore</span>
                  </div>
                  <div className="house-metrics">
                    <div>
                      <span>
                        <Icon name="wind" size={17} /> Wind forecast
                      </span>
                      <strong>
                        {slot ? Math.round(slot.windMW).toLocaleString() : "—"}{" "}
                        <small>MW</small>
                      </strong>
                      <SourceBadge kind="data">
                        EirGrid
                        {grid
                          ? " · " + timeLabel(grid.meta.sources[1].updatedAt)
                          : ""}
                        {grid?.meta.usedSample ? " · sample" : ""}
                      </SourceBadge>
                    </div>
                    <div>
                      <span>
                        <Icon name="leaf" size={17} /> Grid carbon
                      </span>
                      <strong>
                        {slot ? Math.round(slot.co2) : "—"}{" "}
                        <small>gCO₂/kWh</small>
                      </strong>
                      <SourceBadge>
                        {slot?.co2Estimated ? "Estimate" : "Actual"}
                        {grid?.meta.usedSample ? " · sample" : ""}
                      </SourceBadge>
                    </div>
                    <div>
                      <span>
                        <Icon name="bolt" size={17} /> {slot?.band ?? "Current"}{" "}
                        rate
                      </span>
                      <strong>
                        {slot ? (slot.price * 100).toFixed(0) : "—"}
                        <small>c / kWh</small>
                      </strong>
                      <SourceBadge>Sample tariff</SourceBadge>
                    </div>
                  </div>
                </section>
              ) : (
                <SolarYear household={household} sample={sample} />
              )}
              {tab === "today" && (
                <div className="insight-strip">
                  <span className="insight-icon">
                    <Icon name="wind" size={22} />
                  </span>
                  <div>
                    <strong>
                      The cheapest hour isn’t always the cleanest.
                    </strong>
                    <p>
                      Wind changes. Your tariff doesn’t. Find the moment that
                      works for both.
                    </p>
                  </div>
                  <Icon name="arrow" size={19} />
                </div>
              )}
            </div>
            <aside className="plan-panel">
              <div className="panel-title">
                <h2>Your home, your plan</h2>
                <Icon name="settings" size={19} />
              </div>
              <SetupPanel household={household} onChange={changeHouse} />
              <div className="optimise">
                <span className="field-label">WHAT MATTERS TO YOU?</span>
                <div className="segmented">
                  {(["cost", "carbon", "both"] as Mode[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => setMode(m)}
                      aria-pressed={mode === m}
                      className={mode === m ? "active" : ""}
                    >
                      {m === "cost"
                        ? "Lower bills"
                        : m === "carbon"
                          ? "Less carbon"
                          : "A bit of both"}
                      {mode === m && (
                        <motion.span
                          layoutId="mode-indicator"
                          className="segment-highlight"
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>
              <div className="plan-heading">
                <h3>Your best windows</h3>
                <span>
                  {loading ? "Updating…" : `${windows.length} appliances`}
                </span>
              </div>
              {error && (
                <p role="alert" className="error-message">
                  {error}
                </p>
              )}
              <div
                className={`window-list ${loading ? "updating" : ""}`}
                aria-busy={loading}
              >
                {windows.length ? (
                  windows.map((w) => {
                    const a = household.appliances.find(
                      (a) => a.id === w.applianceId,
                    );
                    if (!a) return null;
                    return (
                      <motion.button
                        layout="position"
                        key={w.applianceId}
                        className={`window-card ${chosen?.applianceId === w.applianceId ? "selected" : ""}`}
                        onClick={() => {
                          setSelected(w.applianceId);
                          setTab("today");
                        }}
                        aria-pressed={chosen?.applianceId === w.applianceId}
                      >
                        <span className="appliance-icon">
                          <Icon name={a.id} />
                        </span>
                        <span className="window-content">
                          <span className="window-name">
                            {a.name}
                            <span>{a.hours}h</span>
                          </span>
                          <strong>
                            {timeLabel(w.start)} <span>→</span>{" "}
                            {timeLabel(w.end)}{" "}
                            <small>
                              {new Intl.DateTimeFormat("en-IE", {
                                timeZone: "Europe/Dublin",
                                weekday: "short",
                              }).format(new Date(w.start))}
                            </small>
                          </strong>
                          <span className="savings">
                            <span>
                              {w.vsUsual.savedEUR >= 0 ? "Save" : "Extra"}{" "}
                              {money(Math.abs(w.vsUsual.savedEUR))}
                            </span>
                            <span>·</span>
                            <span>
                              {Math.abs(w.vsUsual.savedCO2g / 1000).toFixed(2)}{" "}
                              kg CO₂{" "}
                              {w.vsUsual.savedCO2g >= 0 ? "less" : "more"}
                            </span>
                          </span>
                          {chosen?.applianceId === w.applianceId && (
                            <span className="window-reason">{w.reason}</span>
                          )}
                        </span>
                        <Icon name="chevron" size={15} />
                      </motion.button>
                    );
                  })
                ) : (
                  <div className="loading">
                    {loading
                      ? "Finding a better when…"
                      : "Choose appliances in your home settings."}
                  </div>
                )}
              </div>
              {chosen && <p className="selected-reason">{chosen.reason}</p>}
              <p className="plan-disclaimer">
                Estimates vs usual{" "}
                {chosen ? timeLabel(chosen.usualStart) : "19:00"} use. Sample
                rates. Each appliance planned independently; overlapping solar
                savings cannot be added.
              </p>
              {chosen && appliance && (
                <div className="run-cost">
                  <span>{appliance.name} · proposed run</span>
                  <strong>
                    {money(chosen.costEUR)}{" "}
                    <span>/ {(chosen.co2g / 1000).toFixed(2)} kg CO₂</span>
                  </strong>
                </div>
              )}
            </aside>
          </div>
          {grid && tab === "today" && (
            <Timeline
              rates={tariffFor(household).rates}
              grid={grid}
              window={chosen}
              selected={slotIndex}
              onSelect={setSlotIndex}
            />
          )}
          <details className="provenance">
            <summary>
              <Icon name="info" size={15} />
              {grid?.meta.usedSample
                ? "Sample data in use · dated replay or source fallback"
                : "Data sources & methodology"}
              <span>View sources ↗</span>
            </summary>
            <p>{grid?.meta.note}</p>
            {grid?.meta.sources.map((s) => (
              <p key={s.name}>
                <a href={s.url} target="_blank" rel="noreferrer">
                  {s.name} ↗
                </a>{" "}
                · {s.usedSample ? "Sample" : "Data"} · source updated{" "}
                {dayLabel(s.updatedAt)} {timeLabel(s.updatedAt)} · fetched{" "}
                {timeLabel(s.fetchedAt)}. {s.note}
              </p>
            ))}
            <p>
              All households are synthetic. Tariffs are illustrative and
              unverified. CO₂ uses a linear fit against wind; solar assumes 80%
              performance. Appliances are independent; battery dispatch and
              whole-home load are not simulated.
            </p>
          </details>
          <footer>
            <span>
              WattWhen <span className="footer-slash">/</span> Better timing.
              Better energy.
            </span>
            <span>Built for Ireland · 2026</span>
          </footer>
        </main>
        <button className="ask-button" onClick={() => setChat(true)}>
          <Icon name="chat" size={19} />
          <span>Ask WattWhen</span>
          <span className="ai-pill">AI</span>
        </button>
        {chat && (
          <Chat
            household={household}
            mode={mode}
            sample={sample || !!grid?.meta.usedSample}
            onClose={() => setChat(false)}
          />
        )}
      </div>
    </MotionConfig>
  );
}
