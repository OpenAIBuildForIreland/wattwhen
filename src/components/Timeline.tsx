"use client";
import { motion, useReducedMotion } from "motion/react";
import { dayLabel, timeLabel } from "@/lib/time";
import type { Grid, Window } from "@/lib/types";
import { tariff as defaultTariff } from "@/lib/tariffs";
import SourceBadge from "./SourceBadge";
export default function Timeline({
  grid,
  window,
  selected,
  onSelect,
  rates = defaultTariff.rates,
}: {
  grid: Grid;
  window?: Window;
  selected: number;
  onSelect: (i: number) => void;
  rates?: typeof defaultTariff.rates;
}) {
  const reduced = useReducedMotion(),
    slots = grid.slots,
    current = slots[selected] ?? slots[0];
  const first = Date.parse(slots[0].start),
    length = slots.length * 1800000;
  return (
    <section className="timeline-panel">
      <div className="section-heading">
        <div>
          <div className="eyebrow">THE BIGGER PICTURE</div>
          <h2>Your next 36 hours</h2>
        </div>
        <div className="timeline-legend">
          <span>
            <i className="dot green" />
            Cleaner
          </span>
          <span>
            <i className="dot amber" />
            Moderate
          </span>
          <span>
            <i className="dot red" />
            Higher carbon
          </span>
        </div>
      </div>
      <div className="timeline-readout">
        <strong>
          {dayLabel(current.start)} · {timeLabel(current.start)}
        </strong>
        <span>
          {Math.round(current.co2)} gCO₂/kWh · {Math.round(current.windMW)} MW
          wind · {(current.price * 100).toFixed(0)}c/kWh · {current.band}
          {current.solarKW !== undefined
            ? ` · ${current.solarKW.toFixed(1)} kW solar`
            : ""}
        </span>
        <SourceBadge>
          {current.co2Estimated ? "Carbon estimate" : "Carbon actual"}
          {grid.meta.usedSample ? " · sample" : ""}
        </SourceBadge>
      </div>
      <div className="chart-wrap">
        <svg
          viewBox="0 0 1200 90"
          preserveAspectRatio="none"
          className="wind-chart"
          role="img"
          aria-label="Wind generation forecast, higher values indicate more wind"
        >
          <defs>
            <linearGradient id="windfill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#b8ed8b" stopOpacity=".25" />
              <stop offset="100%" stopColor="#b8ed8b" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[20, 50, 80].map((y) => (
            <line key={y} x1="0" x2="1200" y1={y} y2={y} stroke="#ffffff09" />
          ))}
          <path
            d={`M0 90 ${slots.map((s, i) => `L${(i / 71) * 1200} ${85 - (s.windMW / 4000) * 70}`).join(" ")} L1200 90Z`}
            fill="url(#windfill)"
          />
          <polyline
            points={slots
              .map(
                (s, i) => `${(i / 71) * 1200},${85 - (s.windMW / 4000) * 70}`,
              )
              .join(" ")}
            fill="none"
            stroke="#a9d789"
            strokeWidth="2"
          />
          {slots.some((s) => s.solarKW) && (
            <polyline
              points={slots
                .map(
                  (s, i) => `${(i / 71) * 1200},${85 - (s.solarKW ?? 0) * 15}`,
                )
                .join(" ")}
              fill="none"
              stroke="#f5cd7c"
              strokeWidth="2"
            />
          )}
        </svg>
        <div className="carbon-band">
          {slots.map((s, i) => (
            <button
              key={s.start}
              aria-label={`${dayLabel(s.start)} ${timeLabel(s.start)}, ${Math.round(s.co2)} grams carbon, ${s.band} rate`}
              onClick={() => onSelect(i)}
              onFocus={() => onSelect(i)}
              title={`${timeLabel(s.start)} · ${Math.round(s.co2)} gCO₂/kWh · ${(s.price * 100).toFixed(0)}c`}
              style={{
                background:
                  s.co2 < 150 ? "#94d9a0" : s.co2 < 250 ? "#d4bd76" : "#ce876b",
              }}
              className={s.co2Estimated ? "estimated" : ""}
            />
          ))}
        </div>
        <div className="tariff-band">
          {slots.map((s) => (
            <span key={s.start} className={s.band} />
          ))}
        </div>
        {window && (
          <motion.div
            className="window-overlay"
            layout="position"
            initial={false}
            style={{
              left: `${((Date.parse(window.start) - first) / length) * 100}%`,
              width: `${((Date.parse(window.end) - Date.parse(window.start)) / length) * 100}%`,
            }}
            transition={{ duration: reduced ? 0 : 0.35 }}
          >
            <span>BEST WINDOW</span>
          </motion.div>
        )}
        <div
          className="time-cursor"
          style={{ left: `${(selected / 72) * 100}%` }}
        >
          <span>{selected === 0 ? "START" : timeLabel(current.start)}</span>
        </div>
      </div>
      <div className="axis">
        {[0, 12, 24, 36, 48, 60, 71].map((i) => (
          <span key={i}>
            {timeLabel(slots[i].start)}
            <small>
              {i === 0 || i === 24 || i === 48 ? dayLabel(slots[i].start) : ""}
            </small>
          </span>
        ))}
      </div>
      <div className="timeline-footer">
        <span>
          <i className="night-swatch" />
          Night rate {(rates.night * 100).toFixed(0)}c{" "}
          <i className="day-swatch" />
          Day {(rates.day * 100).toFixed(0)}c <i className="peak-swatch" />
          Peak {(rates.peak * 100).toFixed(0)}c
        </span>
        <span>
          Sample tariff · Dashed = carbon estimate · All times Ireland
        </span>
      </div>
    </section>
  );
}
