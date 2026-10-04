"use client";
import { useEffect, useState } from "react";
import type { Household } from "@/lib/types";
import type { SolarResult } from "@/lib/solarYear";
import SourceBadge from "./SourceBadge";
const money = (n: number) =>
  new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
export default function SolarYear({
  household,
  sample,
}: {
  household: Household;
  sample: boolean;
}) {
  const requestKey = JSON.stringify({ household, sample });
  const [result, setResult] = useState<{
    key: string;
    data?: SolarResult;
    error?: string;
  } | null>(null);
  const data = result?.key === requestKey ? result.data : undefined;
  const error = result?.key === requestKey ? result.error : undefined;
  useEffect(() => {
    if (!household.solar) return;
    const controller = new AbortController();
    fetch("/api/solar", {
      method: "POST",
      body: JSON.stringify({ household, sample }),
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
    })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        setResult({ key: requestKey, data: d });
      })
      .catch((e) => {
        if (e.name !== "AbortError")
          setResult({ key: requestKey, error: e.message });
      });
    return () => controller.abort();
  }, [household, sample, requestKey]);
  if (!household.solar)
    return (
      <section className="solar-empty">
        <div className="eyebrow">A LITTLE SUN GOES A LONG WAY</div>
        <h2>Meet your solar year.</h2>
        <p>
          Switch on solar panels in your home settings to explore generation,
          export earnings and your annual bill.
        </p>
      </section>
    );
  if (error) return <p role="alert">{error}</p>;
  if (!data) return <div className="loading">Calculating your solar year…</div>;
  const max = Math.max(...data.months.flatMap((m) => [m.generation, m.usage])),
    maxBalance = Math.max(1, ...data.months.map((m) => Math.abs(m.balance)));
  return (
    <section className="solar-panel">
      <div className="section-heading">
        <div>
          <div className="eyebrow">LET SUMMER DO SOME OF THE WORK</div>
          <h2>Your energy, through the seasons.</h2>
        </div>
        <SourceBadge>
          Estimate · PVGIS{data.source.usedSample ? " sample" : ""}
        </SourceBadge>
      </div>
      <div className="solar-stats">
        {[
          [
            "Annual generation",
            `${Math.round(data.annual.generation).toLocaleString()} kWh`,
          ],
          ["Export earnings", money(data.annual.credit)],
          ["Net annual bill", money(data.annual.net)],
          ["Estimated bill reduction", money(data.annual.savings)],
        ].map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <div
        className="solar-chart"
        role="img"
        aria-label="Monthly solar generation and household demand from April to March"
      >
        {data.months.map((m) => (
          <div
            className="month"
            key={m.month}
            title={`${m.label}: ${Math.round(m.generation)} kWh generation; ${Math.round(m.selfUse)} self-used; ${Math.round(m.exported)} exported; net bill ${money(m.net)}`}
          >
            <div className="month-bars">
              <div
                className="generation"
                style={{ height: `${(m.generation / max) * 100}%` }}
              >
                <span
                  style={{ height: `${(m.selfUse / m.generation) * 100}%` }}
                />
              </div>
              <div
                className="usage"
                style={{ height: `${(m.usage / max) * 100}%` }}
              />
            </div>
            <span>{m.label}</span>
          </div>
        ))}
      </div>
      <div className="solar-legend">
        <span>
          <i className="dot green" />
          Self-used solar
        </span>
        <span>
          <i className="dot amber" />
          Exported solar
        </span>
        <span>
          <i className="dot neutral" />
          Household use
        </span>
      </div>
      <div className="balance-chart">
        <h3>
          Running balance <span>April → March · starts at €0</span>
        </h3>
        <svg
          viewBox="0 0 1000 110"
          preserveAspectRatio="none"
          role="img"
          aria-label={`Year-end balance ${money(data.months.at(-1)!.balance)}. Positive means credit; negative means owed.`}
        >
          <line
            x1="0"
            x2="1000"
            y1="50"
            y2="50"
            stroke="#ffffff30"
            strokeDasharray="4 4"
          />
          <polyline
            points={data.months
              .map(
                (m, i) =>
                  `${20 + (i / 11) * 960},${50 - (m.balance / maxBalance) * 45}`,
              )
              .join(" ")}
            fill="none"
            stroke="#c4a8ef"
            strokeWidth="2"
          />
          {data.months.map((m, i) => (
            <circle
              key={m.month}
              cx={20 + (i / 11) * 960}
              cy={50 - (m.balance / maxBalance) * 45}
              r="3"
              fill="#c4a8ef"
            >
              <title>
                {m.label}: {money(m.balance)}
              </title>
            </circle>
          ))}
        </svg>
        <p>
          Year-end:{" "}
          <strong>
            {money(Math.abs(data.months.at(-1)!.balance))}{" "}
            {data.months.at(-1)!.balance >= 0 ? "in credit" : "owed"}
          </strong>
          . Summer exports reduce winter costs; they may not cover them.
        </p>
      </div>
      <details className="source-details">
        <summary>Assumptions & monthly figures</summary>
        <p>
          {Math.round(data.assumptions.selfUseShare * 100)}% self-use{" "}
          {household.battery ? "with" : "without"} a battery, capped at
          household demand. {data.assumptions.note}
        </p>
        <p>
          {data.source.note}{" "}
          <a href={data.source.url} target="_blank" rel="noreferrer">
            PVGIS source ↗
          </a>
        </p>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Month</th>
                <th>Generated</th>
                <th>Self-use</th>
                <th>Export</th>
                <th>Import bill</th>
                <th>Credit</th>
                <th>Net</th>
              </tr>
            </thead>
            <tbody>
              {data.months.map((m) => (
                <tr key={m.month}>
                  <td>{m.label}</td>
                  <td>{Math.round(m.generation)} kWh</td>
                  <td>{Math.round(m.selfUse)} kWh</td>
                  <td>{Math.round(m.exported)} kWh</td>
                  <td>{money(m.bill)}</td>
                  <td>{money(m.credit)}</td>
                  <td>{money(m.net)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
