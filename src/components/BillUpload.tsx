"use client";
import { useState } from "react";
import { validateBillTariff } from "@/lib/bill";
import type { BillFields, BillTariff } from "@/lib/bill";
import Icon from "./Icon";
import SourceBadge from "./SourceBadge";
export default function BillUpload({
  onApply,
}: {
  onApply: (bill: BillTariff) => void;
}) {
  const [fields, setFields] = useState<BillFields | null>(null),
    [kind, setKind] = useState(""),
    [busy, setBusy] = useState(false),
    [note, setNote] = useState(""),
    [error, setError] = useState("");
  async function extract(image?: string) {
    setBusy(true);
    setError("");
    setFields(null);
    try {
      const r = await fetch("/api/bill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(image ? { image } : { sample: true }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setFields(d.fields);
      setKind(d.kind);
      setNote(d.note);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read bill");
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="bill-upload">
      <summary>
        <Icon name="upload" size={14} />
        Read a sample bill
      </summary>
      <p>
        Upload a public sample bill with no personal details. The image is sent
        to OpenAI for extraction and is not saved by this app.
      </p>
      <label className="bill-file-label">
        Sample bill image
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            if (f.size > 3_000_000) {
              setError("Use a sample image under 3 MB.");
              return;
            }
            const reader = new FileReader();
            reader.onload = () => extract(String(reader.result));
            reader.readAsDataURL(f);
          }}
        />
      </label>
      <button className="bill-demo" onClick={() => extract()} disabled={busy}>
        {busy ? "Reading bill…" : "Try a fictional demo bill"}
      </button>
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
      {fields && (
        <div className="bill-review">
          <SourceBadge kind={kind === "ai" ? "ai" : "estimate"}>
            {kind === "ai"
              ? "AI extraction · review required"
              : "Fictional demo · not AI"}
          </SourceBadge>
          <p>{note}</p>
          <p>
            {fields.supplier ?? "Supplier not detected"} ·{" "}
            {fields.plan ?? "Plan not detected"}
            {fields.kWh !== null ? ` · ${fields.kWh} kWh billed` : ""}
          </p>
          <div className="settings-grid">
            {(["day", "night", "peak", "standingPerDay"] as const).map(
              (key) => (
                <label key={key}>
                  {key === "standingPerDay"
                    ? "Standing · €/day"
                    : `${key[0].toUpperCase() + key.slice(1)} · €/kWh`}
                  <input
                    type="number"
                    min="0"
                    max={key === "standingPerDay" ? 5 : 2}
                    step="0.001"
                    value={fields[key] ?? ""}
                    onChange={(e) =>
                      setFields({
                        ...fields,
                        [key]: e.target.value === "" ? null : +e.target.value,
                      })
                    }
                  />
                </label>
              ),
            )}
          </div>
          <button
            className="bill-apply"
            onClick={() => {
              try {
                const tariff = validateBillTariff(fields);
                onApply(tariff);
                setNote(
                  "Reviewed sample rates applied. Export rate remains the illustrative 19c/kWh; billed consumption does not change the annual household profile.",
                );
                setError("");
              } catch (e) {
                setError(
                  e instanceof Error
                    ? e.message
                    : "Fill every rate before applying",
                );
              }
            }}
          >
            Confirm sample rates & apply
          </button>
        </div>
      )}
    </details>
  );
}
