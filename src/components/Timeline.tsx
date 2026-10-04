"use client";

import { motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Slot, Window } from "@/lib/types";

const SLOT_MS = 30 * 60 * 1000;
const fmt = new Intl.DateTimeFormat("en-IE", { timeZone: "Europe/Dublin", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const fmtDay = new Intl.DateTimeFormat("en-IE", { timeZone: "Europe/Dublin", weekday: "short" });

const BAND_COLOR: Record<Slot["band"], string> = {
  night: "#4f46e5",
  day: "#334155",
  peak: "#e11d48",
  boost: "#059669",
};

// green → amber → red, relative to the range shown
function co2Color(v: number, min: number, max: number) {
  const t = max > min ? (v - min) / (max - min) : 0;
  const stops = [
    [16, 185, 129],
    [251, 191, 36],
    [248, 113, 113],
  ];
  const seg = t < 0.5 ? 0 : 1;
  const u = t < 0.5 ? t / 0.5 : (t - 0.5) / 0.5;
  const c = stops[seg].map((a, i) => Math.round(a + (stops[seg + 1][i] - a) * u));
  return `rgb(${c.join(",")})`;
}

export default function Timeline({
  slots,
  now,
  windows,
  selected,
  showSolar,
  kWp,
}: {
  slots: Slot[];
  now: string;
  windows: Window[];
  selected: string | null;
  showSolar: boolean;
  kWp: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(1000);
  const [hover, setHover] = useState<number | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  const H = 170;
  const chartTop = 18;
  const chartH = 100;
  const bandY = chartTop + chartH + 8;
  const t0 = slots.length ? Date.parse(slots[0].start) : 0;
  const t1 = slots.length ? Date.parse(slots[slots.length - 1].start) + SLOT_MS : 1;
  const x = (t: number) => ((t - t0) / (t1 - t0)) * w;
  const sw = slots.length ? w / slots.length : 0;

  const co2s = slots.map((s) => s.co2).filter((v): v is number => v !== null);
  const min = Math.min(...co2s);
  const max = Math.max(...co2s);
  const maxWind = Math.max(1, ...slots.map((s) => s.windMW ?? 0));
  const maxSun = Math.max(0.001, ...slots.map((s) => (s.solarKW ?? 0) * kWp));
  const yCo2 = (v: number) => chartTop + chartH - (0.25 + (0.75 * (v - min)) / Math.max(1, max - min)) * chartH;

  const windPath = useMemo(
    () =>
      slots
        .map((s, i) => (s.windMW === null ? null : `${i === 0 ? "M" : "L"}${(i + 0.5) * sw},${chartTop + chartH - (s.windMW / maxWind) * chartH * 0.95}`))
        .filter(Boolean)
        .join(" "),
    [slots, sw, maxWind],
  );
  const sunPath = useMemo(() => {
    if (!showSolar) return "";
    const pts = slots.map((s, i) => `${(i + 0.5) * sw},${chartTop + chartH - (((s.solarKW ?? 0) * kWp) / maxSun) * chartH * 0.9}`);
    return `M0,${chartTop + chartH} L${pts.join(" L")} L${w},${chartTop + chartH} Z`;
  }, [slots, sw, kWp, maxSun, showSolar, w]);

  const nowX = x(Date.parse(now));
  const ticks = slots.filter((s) => new Date(s.start).getUTCMinutes() === 0 && Date.parse(s.start) % (3 * 3600 * 1000) === 0);
  const sel = windows.find((wd) => wd.applianceId === selected);
  const hs = hover !== null ? slots[hover] : null;

  return (
    <div ref={ref} className="relative w-full select-none" onMouseLeave={() => setHover(null)}>
      <svg width={w} height={H} className="block overflow-visible">
        <defs>
          <linearGradient id="sun" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#fde047" stopOpacity={0.55} />
            <stop offset="100%" stopColor="#fde047" stopOpacity={0.02} />
          </linearGradient>
          <pattern id="hatch" width="6" height="6" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(7,10,18,0.55)" strokeWidth="2.5" />
          </pattern>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* CO2 bars */}
        {slots.map((s, i) =>
          s.co2 === null ? null : (
            <g key={s.start} opacity={s.past ? 0.35 : 1}>
              <rect
                x={i * sw + 0.5}
                y={yCo2(s.co2)}
                width={Math.max(1, sw - 1)}
                height={chartTop + chartH - yCo2(s.co2)}
                rx={1.5}
                fill={co2Color(s.co2, min, max)}
                opacity={hover === i ? 1 : 0.88}
              />
              {s.co2Estimated && (
                <rect x={i * sw + 0.5} y={yCo2(s.co2)} width={Math.max(1, sw - 1)} height={chartTop + chartH - yCo2(s.co2)} fill="url(#hatch)" />
              )}
            </g>
          ),
        )}

        {showSolar && <path d={sunPath} fill="url(#sun)" stroke="#fde047" strokeWidth={1.2} />}
        <path d={windPath} fill="none" stroke="#7dd3fc" strokeWidth={1.6} strokeDasharray="3 3" opacity={0.9} />

        {/* selected window */}
        {sel && (
          <motion.rect
            initial={false}
            animate={{ x: x(Date.parse(sel.start)), width: x(Date.parse(sel.end)) - x(Date.parse(sel.start)) }}
            transition={{ type: "spring", stiffness: 180, damping: 24 }}
            y={chartTop - 10}
            height={chartH + 10 + 26}
            rx={8}
            fill="rgba(52,211,153,0.12)"
            stroke="#34d399"
            strokeWidth={2}
            filter="url(#glow)"
          />
        )}
        {/* usual time */}
        {sel && (
          <motion.rect
            initial={false}
            animate={{ x: x(Date.parse(sel.usual.start)) }}
            transition={{ type: "spring", stiffness: 180, damping: 24 }}
            y={chartTop - 10}
            width={x(Date.parse(sel.end)) - x(Date.parse(sel.start))}
            height={chartH + 10 + 26}
            rx={8}
            fill="none"
            stroke="#f87171"
            strokeDasharray="5 4"
            strokeWidth={1.5}
            opacity={0.8}
          />
        )}

        {/* tariff bands */}
        {slots.map((s, i) => (
          <rect key={`b${i}`} x={i * sw} y={bandY} width={sw + 0.5} height={12} fill={BAND_COLOR[s.band]} opacity={s.past ? 0.35 : 0.85} />
        ))}

        {/* ticks */}
        {ticks.map((s) => {
          const tx = x(Date.parse(s.start));
          const label = fmt.format(new Date(s.start));
          return (
            <g key={`t${s.start}`}>
              <line x1={tx} x2={tx} y1={chartTop} y2={bandY + 12} stroke="rgba(148,163,184,0.12)" />
              <text x={tx + 3} y={H - 14} fill="#94a3b8" fontSize={10}>
                {label === "00:00" ? fmtDay.format(new Date(s.start)) : label}
              </text>
            </g>
          );
        })}

        {/* now */}
        <line x1={nowX} x2={nowX} y1={4} y2={bandY + 14} stroke="#f8fafc" strokeWidth={1.5} />
        <circle cx={nowX} cy={4} r={3.5} fill="#f8fafc" />
        <text x={nowX + 6} y={10} fill="#f8fafc" fontSize={10} fontWeight={600}>
          now
        </text>

        {/* hover capture */}
        {slots.map((s, i) => (
          <rect key={`h${i}`} x={i * sw} y={0} width={sw} height={H} fill="transparent" onMouseEnter={() => setHover(i)} />
        ))}
      </svg>

      {hs && hover !== null && (
        <div
          className="pointer-events-none absolute top-0 z-10 w-52 rounded-xl border border-white/10 bg-slate-950/90 p-3 text-xs text-slate-200 shadow-xl backdrop-blur"
          style={{ left: Math.min(Math.max(0, (hover + 0.5) * sw - 104), w - 208), transform: "translateY(-105%)" }}
        >
          <div className="mb-1 font-semibold text-white">
            {fmtDay.format(new Date(hs.start))} {fmt.format(new Date(hs.start))}
          </div>
          <div className="flex justify-between">
            <span>Grid CO2</span>
            <span className="font-mono">
              {hs.co2 ?? "–"} g/kWh {hs.co2Estimated && <span className="text-amber-300">est.</span>}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Wind forecast</span>
            <span className="font-mono">{hs.windMW ?? "–"} MW</span>
          </div>
          <div className="flex justify-between">
            <span>Tariff</span>
            <span className="font-mono">
              {hs.band} €{hs.price.toFixed(2)}
            </span>
          </div>
          {showSolar && (
            <div className="flex justify-between">
              <span>Your solar</span>
              <span className="font-mono">{((hs.solarKW ?? 0) * kWp).toFixed(1)} kW</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
