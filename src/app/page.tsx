"use client";

import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import type { Hotspot, HouseConfig } from "@/components/House3D";
import Chat from "@/components/Chat";
import Icon, { type IconName } from "@/components/Icon";
import SolarYear, { type SolarYearData } from "@/components/SolarYear";
import Timeline from "@/components/Timeline";
import { HOUSEHOLDS } from "@/lib/households";
import type { Appliance, Household, Mode, Timeline as TimelineData, Window } from "@/lib/types";

const House3D = dynamic(() => import("@/components/House3D"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded-3xl bg-slate-900/60" />,
});

const fmt = new Intl.DateTimeFormat("en-IE", { timeZone: "Europe/Dublin", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const fmtDay = new Intl.DateTimeFormat("en-IE", { timeZone: "Europe/Dublin", weekday: "short" });
const when = (w: Window) => {
  const s = new Date(w.start);
  const today = fmtDay.format(new Date());
  const d = fmtDay.format(s);
  return `${d === today ? "Today" : d} ${fmt.format(s)}–${fmt.format(new Date(w.end))}`;
};

const ICON: Record<Appliance["kind"], IconName> = {
  washer: "washer",
  dryer: "dryer",
  dishwasher: "dishwasher",
  immersion: "immersion",
  ev: "ev",
  heatpump: "heatpump",
};
const SPOT: Record<Appliance["kind"], [number, number, number]> = {
  washer: [-3.9, 2.6, 2.6],
  dryer: [-3.9, 1.3, 2.6],
  dishwasher: [3.9, 3.3, 1.2],
  immersion: [0, 4.9, 2.9],
  ev: [5.3, 2.5, 3.4],
  heatpump: [-4.4, 1.9, -1.2],
};

const EV_APPLIANCE: Appliance = { id: "ev", name: "EV charge (40 kWh)", kW: 7.2, hours: 5.5, usualStart: "18:30", kind: "ev" };
const HP_APPLIANCE: Appliance = { id: "heatpump", name: "Heat pump boost", kW: 2.5, hours: 3, usualStart: "17:00", kind: "heatpump" };

const MODES: { id: Mode; label: string; icon: IconName }[] = [
  { id: "cost", label: "Cost", icon: "cost" },
  { id: "carbon", label: "Carbon", icon: "carbon" },
  { id: "both", label: "Both", icon: "scale" },
];

const HOME_FEATURES: { id: keyof HouseConfig; label: string; icon: IconName }[] = [
  { id: "solar", label: "Solar", icon: "solar" },
  { id: "ev", label: "EV", icon: "ev" },
  { id: "battery", label: "Battery", icon: "battery" },
  { id: "heatpump", label: "Heat pump", icon: "heatpump" },
];

function buildHousehold(base: Household, cfg: HouseConfig): Household {
  let apps = base.appliances.filter((a) => a.kind !== "ev" && a.kind !== "heatpump");
  if (cfg.ev) apps = [...apps, EV_APPLIANCE];
  if (cfg.heatpump) apps = [...apps, HP_APPLIANCE];
  return {
    ...base,
    appliances: apps,
    ev: cfg.ev ? base.ev ?? { batteryKWh: 60, chargerKW: 7.2 } : undefined,
    solar: cfg.solar ? base.solar ?? { kWp: 4, aspect: 0, tilt: 35 } : undefined,
    battery: cfg.battery ? base.battery ?? { kWh: 5 } : undefined,
  };
}

function Badge({ kind, children }: { kind: "data" | "estimate" | "ai" | "sample"; children: React.ReactNode }) {
  const c = {
    data: "border-sky-400/30 bg-sky-400/10 text-sky-300",
    estimate: "border-amber-400/30 bg-amber-400/10 text-amber-300",
    ai: "border-fuchsia-400/30 bg-fuchsia-400/10 text-fuchsia-300",
    sample: "border-slate-400/30 bg-slate-400/10 text-slate-300",
  }[kind];
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${c}`}>{children}</span>;
}

export default function Home() {
  const [householdId, setHouseholdId] = useState("general");
  const base = HOUSEHOLDS.find((h) => h.id === householdId)!;
  const [cfg, setCfg] = useState<HouseConfig>({ solar: false, ev: false, battery: false, heatpump: false });
  const [mode, setMode] = useState<Mode>("both");
  const [tab, setTab] = useState<"today" | "year">("today");
  const [timeline, setTimeline] = useState<TimelineData | null>(null);
  const [windows, setWindows] = useState<Window[]>([]);
  const [year, setYear] = useState<SolarYearData | null>(null);
  const [selected, setSelected] = useState<string | null>("washer");
  const [chatWindows, setChatWindows] = useState<Window[]>([]);

  const selectHousehold = (id: string) => {
    const h = HOUSEHOLDS.find((x) => x.id === id)!;
    setHouseholdId(id);
    setCfg({ solar: !!h.solar, ev: !!h.ev, battery: !!h.battery, heatpump: false });
  };

  const household = useMemo(() => buildHousehold(base, cfg), [base, cfg]);

  useEffect(() => {
    let off = false;
    fetch(`/api/grid?household=${householdId}`)
      .then((r) => r.json())
      .then((d) => !off && setTimeline(d));
    return () => {
      off = true;
    };
  }, [householdId]);

  useEffect(() => {
    let off = false;
    fetch("/api/plan", { method: "POST", body: JSON.stringify({ household, mode }) })
      .then((r) => r.json())
      .then((d) => !off && setWindows(d.windows));
    return () => {
      off = true;
    };
  }, [household, mode]);

  useEffect(() => {
    if (tab !== "year") return;
    let off = false;
    fetch("/api/solar-year", { method: "POST", body: JSON.stringify({ household: { ...household, solar: household.solar ?? { kWp: 4, aspect: 0, tilt: 35 } } }) })
      .then((r) => r.json())
      .then((d) => !off && setYear(d));
    return () => {
      off = true;
    };
  }, [tab, household]);

  const nowSlot = timeline?.slots.find((s) => !s.past);
  const maxSun = Math.max(0.001, ...(timeline?.slots.map((s) => s.solarKW ?? 0) ?? [0]));
  const sunStrength = cfg.solar ? (nowSlot?.solarKW ?? 0) / maxSun : 0;
  const totalSaved = windows.reduce((s, w) => s + Math.max(0, w.savedEUR), 0);
  const totalCo2 = windows.reduce((s, w) => s + Math.max(0, w.savedCO2g), 0);
  const usedSample = timeline?.sources.some((s) => s.usedSample);

  const hotspots: Hotspot[] = household.appliances.map((a) => {
    const w = windows.find((x) => x.applianceId === a.id);
    return { id: a.id, label: a.name.replace(/ \(.*\)/, ""), icon: ICON[a.kind], position: SPOT[a.kind], hint: w ? fmt.format(new Date(w.start)) : undefined };
  });

  return (
    <main id="main-content" className="min-h-dvh overflow-x-hidden bg-[#0f172a] text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(16,185,129,0.16),transparent_42%),radial-gradient(ellipse_at_bottom_right,rgba(56,189,248,0.13),transparent_44%)]" />
      <div className="pointer-events-none fixed inset-0 opacity-[0.035] [background-image:linear-gradient(rgba(255,255,255,.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.8)_1px,transparent_1px)] [background-size:32px_32px]" />
      <div className="relative mx-auto flex max-w-[1500px] flex-col gap-4 px-4 py-4 sm:px-6 sm:py-5">
        {/* header */}
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-sky-500 text-emerald-950 shadow-[0_0_30px_rgba(52,211,153,0.45)]"><Icon name="bolt" className="h-5 w-5" /></div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">WattWhen</h1>
              <p className="text-xs text-slate-400">When to use, store and sell your electricity in Ireland</p>
            </div>
          </div>
          <div className="flex items-center gap-1 rounded-2xl border border-white/10 bg-white/5 p-1">
            {HOUSEHOLDS.map((h) => (
              <button
                key={h.id}
                onClick={() => selectHousehold(h.id)}
                aria-pressed={householdId === h.id}
                className={`relative min-h-10 rounded-xl px-3 py-1.5 text-sm transition-colors ${householdId === h.id ? "text-slate-950" : "text-slate-300 hover:text-white"}`}
              >
                {householdId === h.id && <motion.span layoutId="hh" className="absolute inset-0 rounded-xl bg-emerald-400" transition={{ type: "spring", stiffness: 300, damping: 30 }} />}
                <span className="relative">{h.name}</span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-slate-400 sm:inline">Optimise for</span>
            <div className="flex items-center gap-1 rounded-2xl border border-white/10 bg-white/5 p-1">
              {MODES.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  aria-pressed={mode === m.id}
                  className={`relative flex min-h-10 items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm transition-colors ${mode === m.id ? "text-slate-950" : "text-slate-300 hover:text-white"}`}
                >
                  {mode === m.id && <motion.span layoutId="mode" className="absolute inset-0 rounded-xl bg-sky-400" transition={{ type: "spring", stiffness: 300, damping: 30 }} />}
                  <span className="relative flex items-center gap-1.5"><Icon name={m.icon} className="h-3.5 w-3.5" />{m.label}</span>
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* main */}
        <section className="grid grid-cols-12 gap-4">
          <div className="relative col-span-12 h-[460px] overflow-hidden rounded-3xl border border-white/15 bg-slate-950/65 shadow-[0_24px_80px_rgba(2,6,23,0.28)] sm:h-[520px] lg:col-span-8">
            <House3D config={cfg} hotspots={hotspots} selected={selected} onSelect={setSelected} sunStrength={sunStrength} gridCo2={nowSlot?.co2 ?? null} />
            <div className="absolute left-4 top-4 flex flex-col gap-2">
              <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-3 backdrop-blur-md">
                <div className="text-sm font-medium">{base.name}</div>
                <div className="max-w-[240px] text-xs text-slate-400">{base.blurb}</div>
                <div className="mt-2">
                  <Badge kind="sample">Synthetic household</Badge>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {HOME_FEATURES.map(({ id, label, icon }) => (
                  <button
                    key={id}
                    onClick={() => setCfg((c) => ({ ...c, [id]: !c[id] }))}
                    aria-pressed={cfg[id]}
                    className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-all ${
                      cfg[id] ? "border-emerald-300/60 bg-emerald-400/20 text-emerald-200" : "border-white/10 bg-slate-950/60 text-slate-300 hover:border-white/20 hover:text-white"
                    }`}
                  >
                    <Icon name={icon} className="h-3.5 w-3.5" />{label}
                  </button>
                ))}
              </div>
            </div>
            <div className="absolute bottom-4 left-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs backdrop-blur-md">
              <span className="text-slate-400">Grid right now</span>
              <span className="font-mono text-base text-white">{nowSlot?.co2 ?? "–"}</span>
              <span className="text-slate-400">gCO2/kWh</span>
              <span className="text-slate-600">·</span>
              <span className="font-mono text-base text-white">{nowSlot?.windMW ? (nowSlot.windMW / 1000).toFixed(1) : "–"}</span>
              <span className="text-slate-400">GW wind</span>
              <Badge kind={usedSample ? "sample" : "data"}>{usedSample ? "Sample data" : "Live · EirGrid"}</Badge>
            </div>
          </div>

          {/* windows */}
          <div className="col-span-12 flex h-auto min-h-[420px] flex-col gap-3 lg:col-span-4 lg:h-[520px]">
            <div className="rounded-3xl border border-emerald-300/20 bg-gradient-to-br from-emerald-500/20 to-sky-500/12 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.06)]">
              <div className="text-xs uppercase tracking-wider text-emerald-300/80">If you follow today&apos;s plan</div>
              <div className="mt-1 flex items-baseline gap-4">
                <motion.span key={totalSaved.toFixed(2)} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="text-4xl font-semibold text-white">
                  €{totalSaved.toFixed(2)}
                </motion.span>
                <span className="text-sm text-slate-300">saved vs your usual times</span>
              </div>
              <div className="mt-1 text-sm text-slate-300">
                and <span className="font-semibold text-emerald-300">{(totalCo2 / 1000).toFixed(1)} kg</span> less CO2
              </div>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto pr-1">
              <AnimatePresence initial={false}>
                {windows.map((w) => {
                  const a = household.appliances.find((x) => x.id === w.applianceId);
                  if (!a) return null;
                  const on = selected === w.applianceId;
                  return (
                    <motion.button
                      layout
                      key={w.applianceId}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setSelected(w.applianceId)}
                      className={`w-full rounded-2xl border p-3 text-left transition-colors ${
                        on ? "border-emerald-300/60 bg-emerald-400/10 shadow-[0_0_30px_rgba(52,211,153,0.15)]" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                          <span className="grid h-8 w-8 place-items-center rounded-xl bg-white/5 text-emerald-200"><Icon name={ICON[a.kind]} className="h-4 w-4" /></span>
                          <span className="font-medium">{a.name}</span>
                        </div>
                        <span className="font-mono text-sm text-emerald-300">{when(w)}</span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-3 text-xs text-slate-300">
                        <span>
                          saves <b className="text-white">€{Math.max(0, w.savedEUR).toFixed(2)}</b>
                        </span>
                        <span>
                          <b className="text-white">{Math.max(0, w.savedCO2g)} g</b> CO2
                        </span>
                        <span className="text-slate-500">vs {fmt.format(new Date(w.usual.start))}</span>
                        {w.usesEstimate && <Badge kind="estimate">CO2 estimate</Badge>}
                      </div>
                      {on && <div className="mt-1.5 text-xs text-slate-400">{w.reason}</div>}
                    </motion.button>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        </section>

        {/* bottom */}
        <section className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1 rounded-2xl border border-white/10 bg-white/5 p-1">
              {(
                [
                  ["today", "Next 36 hours"],
                  ["year", "Solar year"],
                ] as const
              ).map(([id, label]) => (
                  <button key={id} onClick={() => setTab(id)} aria-pressed={tab === id} className={`relative min-h-10 rounded-xl px-3 py-1.5 text-sm transition-colors ${tab === id ? "text-slate-950" : "text-slate-300 hover:text-white"}`}>
                  {tab === id && <motion.span layoutId="tab" className="absolute inset-0 rounded-xl bg-white" />}
                  <span className="relative">{label}</span>
                </button>
              ))}
            </div>
            {tab === "today" ? (
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-6 rounded-sm bg-gradient-to-r from-emerald-500 via-amber-400 to-rose-400" /> grid CO2, cleaner → dirtier
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-5 border-t border-dashed border-sky-300" /> wind forecast
                </span>
                {cfg.solar && (
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-4 rounded-sm bg-yellow-300/60" /> your solar
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-3 rounded-sm bg-indigo-600" /> night
                  <span className="h-2.5 w-3 rounded-sm bg-slate-700" /> day
                  <span className="h-2.5 w-3 rounded-sm bg-rose-600" /> peak
                  <span className="h-2.5 w-3 rounded-sm bg-emerald-600" /> EV boost
                </span>
                <Badge kind="data">EirGrid · Met Éireann</Badge>
                <Badge kind="estimate">Hatched = our CO2 estimate from wind (r² {timeline?.fit.r2 ?? "–"})</Badge>
                <Badge kind="sample">Sample tariff</Badge>
              </div>
            ) : (
              year && (
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
                  <span>
                    <b className="text-yellow-300">{year.totals.genKWh.toLocaleString()} kWh</b> generated
                  </span>
                  <span>
                    <b className="text-white">€{year.totals.exportEUR}</b> export credit
                  </span>
                  <span>
                    bill <b className="text-white">€{year.totals.netEUR}</b> vs <s>€{year.totals.noSolarBillEUR}</s> without solar
                  </span>
                  <Badge kind="data">PVGIS · EU JRC</Badge>
                  <Badge kind="estimate">{Math.round(year.assumptions.selfUseShare * 100)}% self-use assumed</Badge>
                </div>
              )
            )}
          </div>
          {tab === "today" ? (
            timeline ? (
              <Timeline slots={timeline.slots} now={timeline.now} windows={[...windows, ...chatWindows]} selected={selected} showSolar={cfg.solar} kWp={household.solar?.kWp ?? 0} />
            ) : (
              <div className="h-[170px] animate-pulse rounded-2xl bg-slate-900/60" />
            )
          ) : year ? (
            <div>
              <SolarYear data={year} />
              <div className="mt-1 flex gap-4 text-[11px] text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-3 rounded-sm bg-yellow-400" /> solar generated
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-3 rounded-sm bg-slate-500" /> household use
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-5 border-t-2 border-slate-200" /> monthly bill after export credit: <b className="text-emerald-300">green = the grid pays you</b>, red = you pay
                </span>
              </div>
            </div>
          ) : (
            <div className="h-[170px] animate-pulse rounded-2xl bg-slate-900/60" />
          )}
        </section>
      </div>
      <Chat
        household={household}
        mode={mode}
        onWindows={(ws) => {
          const tagged = ws.map((w) => ({ ...w, applianceId: w.applianceId === "custom" ? "chat" : w.applianceId }));
          setChatWindows(tagged.filter((w) => w.applianceId === "chat"));
          setSelected(tagged[tagged.length - 1].applianceId);
          setTab("today");
        }}
      />
    </main>
  );
}
