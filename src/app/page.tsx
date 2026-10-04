"use client";

import dynamic from "next/dynamic";
import { motion } from "motion/react";
import { BatteryCharging, Car, Fan, Heater, ShowerHead, Sun, Utensils, WashingMachine, Wind } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Hotspot, HouseConfig } from "@/components/House3D";
import Chat from "@/components/Chat";
import SolarYear, { type SolarYearData } from "@/components/SolarYear";
import Timeline from "@/components/Timeline";
import { HOUSEHOLDS } from "@/lib/households";
import type { Appliance, Household, Mode, Timeline as TimelineData, Window } from "@/lib/types";

const House3D = dynamic(() => import("@/components/House3D"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-panel" />,
});

const fmt = new Intl.DateTimeFormat("en-IE", { timeZone: "Europe/Dublin", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const fmtDay = new Intl.DateTimeFormat("en-IE", { timeZone: "Europe/Dublin", weekday: "short" });
const fmtClock = new Intl.DateTimeFormat("en-IE", { timeZone: "Europe/Dublin", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const when = (w: Window) => {
  const s = new Date(w.start);
  const d = fmtDay.format(s);
  return `${d === fmtDay.format(new Date()) ? "Today" : d} ${fmt.format(s)}–${fmt.format(new Date(w.end))}`;
};

const ICON: Record<Appliance["kind"], typeof Car> = {
  washer: WashingMachine,
  dryer: Wind,
  dishwasher: Utensils,
  immersion: ShowerHead,
  ev: Car,
  heatpump: Fan,
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

const MODES: { id: Mode; label: string }[] = [
  { id: "cost", label: "Cost" },
  { id: "carbon", label: "Carbon" },
  { id: "both", label: "Both" },
];

const TOGGLES: { key: keyof HouseConfig; label: string; Icon: typeof Car }[] = [
  { key: "solar", label: "Solar", Icon: Sun },
  { key: "ev", label: "EV", Icon: Car },
  { key: "battery", label: "Battery", Icon: BatteryCharging },
  { key: "heatpump", label: "Heat pump", Icon: Heater },
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

function Segmented<T extends string>({
  value,
  options,
  onChange,
  id,
}: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (v: T) => void;
  id: string;
}) {
  return (
    <div className="flex rounded-md border border-line bg-panel p-0.5 text-sm">
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={`relative rounded px-3 py-1 ${value === o.id ? "text-background" : "text-muted hover:text-foreground"}`}
        >
          {value === o.id && <motion.span layoutId={id} className="absolute inset-0 rounded bg-foreground" transition={{ type: "spring", stiffness: 400, damping: 36 }} />}
          <span className="relative">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

export default function Home() {
  const [householdId, setHouseholdId] = useState("default");
  const [presetId, setPresetId] = useState("default");
  const [showPresets, setShowPresets] = useState(true);
  const [smartSaved, setSmartSaved] = useState<number | null>(null);
  const base = HOUSEHOLDS.find((h) => h.id === householdId)!;
  const [cfg, setCfg] = useState<HouseConfig>({ solar: false, ev: false, battery: false, heatpump: false });
  const [mode, setMode] = useState<Mode>("both");
  const [tab, setTab] = useState<"today" | "year">("today");
  const [timeline, setTimeline] = useState<TimelineData | null>(null);
  const [windows, setWindows] = useState<Window[]>([]);
  const [year, setYear] = useState<SolarYearData | null>(null);
  const [selected, setSelected] = useState<string | null>("washer");
  const [chatWindows, setChatWindows] = useState<Window[]>([]);

  const selectPreset = (id: string) => {
    setPresetId(id);
    if (id === "custom") return;
    const h = HOUSEHOLDS.find((x) => x.id === id)!;
    setHouseholdId(id);
    setCfg({ solar: !!h.solar, ev: !!h.ev, battery: !!h.battery, heatpump: false });
  };

  // ⌘D / Ctrl+D hides the demo preset switcher.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "d") {
        e.preventDefault();
        setShowPresets((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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
    if (household.tariffId === "standard") {
      fetch("/api/plan", { method: "POST", body: JSON.stringify({ household: { ...household, tariffId: "smart-standard" }, mode }) })
        .then((r) => r.json())
        .then((d: { windows: Window[] }) => !off && setSmartSaved(d.windows.reduce((t, w) => t + Math.max(0, w.savedEUR), 0)));
    }
    return () => {
      off = true;
    };
  }, [household, mode]);
  const flat = household.tariffId === "standard";

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
  const co2Source = timeline?.sources[0];

  const hotspots: Hotspot[] = household.appliances.map((a) => {
    const w = windows.find((x) => x.applianceId === a.id);
    const Icon = ICON[a.kind];
    return {
      id: a.id,
      label: a.name.replace(/ \(.*\)/, ""),
      icon: <Icon size={13} strokeWidth={1.75} />,
      position: SPOT[a.kind],
      hint: w ? fmt.format(new Date(w.start)) : undefined,
    };
  });

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-4 px-6 py-5">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
          <div className="flex items-baseline gap-3">
            <h1 className="text-lg font-semibold tracking-tight">WattWhen</h1>
            <p className="text-sm text-muted">When to use, store and sell electricity in Ireland</p>
          </div>
          <div className="flex items-center gap-4">
            {showPresets && (
              <Segmented
                id="hh"
                value={presetId}
                onChange={selectPreset}
                options={[...HOUSEHOLDS.map((h) => ({ id: h.id, label: h.name })), { id: "custom", label: "Custom" }]}
              />
            )}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted">Optimise for</span>
              <Segmented id="mode" value={mode} onChange={setMode} options={MODES} />
            </div>
          </div>
        </header>

        <section className="grid grid-cols-12 gap-4">
          <div className="relative col-span-12 h-[520px] overflow-hidden rounded-lg border border-line bg-panel lg:col-span-8">
            <House3D config={cfg} hotspots={hotspots} selected={selected} onSelect={setSelected} sunStrength={sunStrength} gridCo2={nowSlot?.co2 ?? null} />
            <div className="absolute left-4 top-4 w-[260px] rounded-md border border-line bg-background/85 p-3 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">{presetId === "custom" ? `Custom, ${base.name.toLowerCase()}` : base.name}</div>
                <span className="text-[11px] text-muted">synthetic</span>
              </div>
              <p className="mt-0.5 text-xs leading-relaxed text-muted">{base.blurb}</p>
              <div className="mt-3 grid grid-cols-2 gap-1">
                {TOGGLES.map(({ key, label, Icon }) => (
                  <button
                    key={key}
                    onClick={() => {
                      setCfg((c) => ({ ...c, [key]: !c[key] }));
                      setPresetId("custom");
                    }}
                    className={`flex items-center gap-1.5 rounded border px-2 py-1 text-xs ${
                      cfg[key] ? "border-foreground/40 bg-foreground/10 text-foreground" : "border-line text-muted hover:text-foreground"
                    }`}
                  >
                    <Icon size={13} strokeWidth={1.75} />
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="absolute bottom-4 left-4 flex items-baseline gap-4 rounded-md border border-line bg-background/85 px-3 py-2 text-xs backdrop-blur-sm">
              <span className="text-muted">Grid now</span>
              <span>
                <span className="font-mono text-base">{nowSlot?.co2 ?? "–"}</span> <span className="text-muted">gCO2/kWh</span>
              </span>
              <span>
                <span className="font-mono text-base">{nowSlot?.windMW ? (nowSlot.windMW / 1000).toFixed(1) : "–"}</span> <span className="text-muted">GW wind</span>
              </span>
              <span className="text-muted">
                {co2Source?.usedSample ? "sample data" : `EirGrid, ${co2Source ? fmtClock.format(new Date(co2Source.fetchedAt)) : "…"}`}
              </span>
            </div>
          </div>

          <div className="col-span-12 flex h-[520px] flex-col gap-3 lg:col-span-4">
            <div className="rounded-lg border border-line bg-panel p-4">
              <div className="text-sm text-muted">Following today&apos;s plan saves</div>
              <div className="mt-1 flex items-baseline gap-3">
                <span className="font-mono text-4xl font-medium">€{totalSaved.toFixed(2)}</span>
                <span className="text-sm text-muted">
                  and <span className="text-foreground">{(totalCo2 / 1000).toFixed(1)} kg</span> CO2 vs your usual times
                </span>
              </div>
              {flat && (
                <p className="mt-2 border-t border-line pt-2 text-xs leading-relaxed text-muted">
                  On a flat rate, timing changes your carbon, not your bill. On a smart rate, today&apos;s plan would save{" "}
                  <span className="font-mono text-best">€{(smartSaved ?? 0).toFixed(2)}</span>.
                </p>
              )}
            </div>
            <div className="flex-1 overflow-y-auto rounded-lg border border-line bg-panel">
              {windows.map((w) => {
                const a = household.appliances.find((x) => x.id === w.applianceId);
                if (!a) return null;
                const on = selected === w.applianceId;
                const Icon = ICON[a.kind];
                return (
                  <button
                    key={w.applianceId}
                    onClick={() => setSelected(w.applianceId)}
                    className={`relative block w-full border-b border-line px-4 py-3 text-left last:border-b-0 ${on ? "bg-foreground/[0.04]" : "hover:bg-foreground/[0.02]"}`}
                  >
                    {on && <span className="absolute inset-y-0 left-0 w-0.5 bg-best" />}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Icon size={15} strokeWidth={1.75} className="text-muted" />
                        {a.name}
                      </div>
                      <span className="font-mono text-sm text-best">{when(w)}</span>
                    </div>
                    <div className="mt-1 flex gap-3 pl-[23px] text-xs text-muted">
                      <span>
                        saves <span className="text-foreground">€{Math.max(0, w.savedEUR).toFixed(2)}</span>
                      </span>
                      <span>
                        <span className="text-foreground">{Math.max(0, w.savedCO2g)} g</span> CO2
                      </span>
                      <span>vs usual {fmt.format(new Date(w.usual.start))}</span>
                    </div>
                    {on && <div className="mt-1.5 pl-[23px] text-xs leading-relaxed text-muted">{w.reason}</div>}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-line bg-panel p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <Segmented
              id="tab"
              value={tab}
              onChange={setTab}
              options={[
                { id: "today", label: "Next 36 hours" },
                { id: "year", label: "Solar year" },
              ]}
            />
            {tab === "today" ? (
              <div className="flex flex-wrap items-center gap-4 text-xs text-muted">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-6 rounded-sm bg-gradient-to-r from-[#5fb98a] via-[#d9b44a] to-[#d4685c]" /> grid CO2, cleaner to dirtier
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-5 border-t border-dashed border-[#8fb3d9]" /> wind
                </span>
                {cfg.solar && (
                  <span className="flex items-center gap-1.5">
                    <span className="w-5 border-t-2 border-sun" /> your solar
                  </span>
                )}
                {flat ? (
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-3 rounded-sm bg-[#3a3d45]" /> flat rate all day
                  </span>
                ) : (
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-3 rounded-sm bg-[#3d4a7a]" /> night
                  <span className="ml-1 h-2 w-3 rounded-sm bg-[#2b2e35]" /> day
                  <span className="ml-1 h-2 w-3 rounded-sm bg-[#8a3b33]" /> peak
                  <span className="ml-1 h-2 w-3 rounded-sm bg-[#2f6b4f]" /> EV boost
                </span>
                )}
              </div>
            ) : (
              year && (
                <div className="flex flex-wrap items-center gap-4 text-xs text-muted">
                  <span>
                    <span className="font-mono text-foreground">{year.totals.genKWh.toLocaleString()}</span> kWh generated
                  </span>
                  <span>
                    <span className="font-mono text-foreground">€{year.totals.exportEUR}</span> export credit
                  </span>
                  <span>
                    bill <span className="font-mono text-foreground">€{year.totals.netEUR}</span> vs <span className="font-mono">€{year.totals.noSolarBillEUR}</span> without solar
                  </span>
                </div>
              )
            )}
          </div>
          {tab === "today" ? (
            timeline ? (
              <Timeline slots={timeline.slots} now={timeline.now} windows={[...windows, ...chatWindows]} selected={selected} showSolar={cfg.solar} kWp={household.solar?.kWp ?? 0} />
            ) : (
              <div className="h-[170px]" />
            )
          ) : year ? (
            <div>
              <SolarYear data={year} />
              <div className="mt-1 flex gap-5 text-xs text-muted">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-3 rounded-sm bg-sun" /> solar generated
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-3 rounded-sm bg-[#4a4d55]" /> household use
                </span>
                <span>Line: monthly bill after export credit. Above zero, the grid pays you.</span>
              </div>
            </div>
          ) : (
            <div className="h-[170px]" />
          )}
          <p className="mt-4 border-t border-line pt-3 text-[11px] leading-relaxed text-muted">
            {tab === "today" ? (
              <>
                Sources: EirGrid Smart Grid Dashboard (CO2 intensity, wind forecast), Met Éireann (solar radiation). CO2 after now is our estimate
                from the wind forecast (r² {timeline?.fit.r2 ?? "–"}), shown lighter. Tariff rates are samples. Households are synthetic.
              </>
            ) : (
              <>
                Source: PVGIS, EU Joint Research Centre. Assumes {year ? Math.round(year.assumptions.selfUseShare * 100) : "–"}% of solar is used at
                home and sample tariff rates. Households are synthetic.
              </>
            )}
          </p>
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
