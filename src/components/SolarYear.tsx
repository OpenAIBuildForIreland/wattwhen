"use client";

import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { SolarMonth } from "@/lib/solarYear";

export type SolarYearData = {
  months: SolarMonth[];
  totals: { genKWh: number; exportKWh: number; exportEUR: number; billEUR: number; netEUR: number; noSolarBillEUR: number; savedEUR: number };
  assumptions: { selfUseShare: number; unitRate: number; tariffSample: boolean };
  source: { name: string; usedSample: boolean };
};

export default function SolarYear({ data }: { data: SolarYearData }) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(900);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  const H = 170;
  const top = 12;
  const ch = 120;
  const n = data.months.length;
  const gw = w / n;
  const maxKWh = Math.max(...data.months.flatMap((m) => [m.genKWh, m.useKWh]));
  const bals = data.months.map((m) => -m.netEUR);
  const bmin = Math.min(0, ...bals);
  const bmax = Math.max(0, ...bals);
  const yb = (v: number) => top + ch - ((v - bmin) / Math.max(1, bmax - bmin)) * ch;
  const order = [3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 1, 2];
  const line = order.map((mi, k) => `${k ? "L" : "M"}${(k + 0.5) * gw},${yb(-data.months[mi].netEUR)}`).join(" ");
  const summary = `Estimated annual solar generation is ${Math.round(data.totals.genKWh).toLocaleString()} kilowatt-hours. Estimated export credit is €${data.totals.exportEUR.toFixed(0)}.`;

  return (
    <div ref={ref} className="w-full">
      <p id="solar-year-summary" className="sr-only">{summary}</p>
      <svg width={w} height={H} className="block overflow-visible" role="img" aria-labelledby="solar-year-title solar-year-summary">
        <title id="solar-year-title">Solar generation, household use and bill forecast by month</title>
        <line x1={0} x2={w} y1={yb(0)} y2={yb(0)} stroke="rgba(148,163,184,0.25)" strokeDasharray="4 4" />
        {order.map((mi, i) => {
          const m = data.months[mi];
          const hg = (m.genKWh / maxKWh) * ch;
          const hu = (m.useKWh / maxKWh) * ch;
          return (
            <g key={m.month}>
              <motion.rect
                initial={{ height: 0, y: top + ch }}
                animate={{ height: hg, y: top + ch - hg }}
                transition={{ delay: i * 0.04, type: "spring", stiffness: 120, damping: 18 }}
                x={i * gw + gw * 0.14}
                width={gw * 0.34}
                rx={3}
                fill="#facc15"
              />
              <motion.rect
                initial={{ height: 0, y: top + ch }}
                animate={{ height: hu, y: top + ch - hu }}
                transition={{ delay: i * 0.04 + 0.1, type: "spring", stiffness: 120, damping: 18 }}
                x={i * gw + gw * 0.52}
                width={gw * 0.34}
                rx={3}
                fill="#64748b"
              />
              <text x={(i + 0.5) * gw} y={H - 18} textAnchor="middle" fill="#94a3b8" fontSize={10}>
                {m.month}
              </text>
            </g>
          );
        })}
        <motion.path
          d={line}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={1.5}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.4, ease: "easeInOut" }}
        />
        {order.map((mi, k) => (
          <g key={mi}>
            <circle cx={(k + 0.5) * gw} cy={yb(-data.months[mi].netEUR)} r={4} fill={data.months[mi].netEUR < 0 ? "#34d399" : "#f87171"} />
            <text x={(k + 0.5) * gw} y={yb(-data.months[mi].netEUR) - 8} textAnchor="middle" fontSize={10} fill={data.months[mi].netEUR < 0 ? "#6ee7b7" : "#fca5a5"}>
              {data.months[mi].netEUR < 0 ? `+€${-data.months[mi].netEUR}` : `−€${data.months[mi].netEUR}`}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
