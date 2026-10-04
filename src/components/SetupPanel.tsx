"use client";
import type { Household } from "@/lib/types";
import { appliances, households } from "@/lib/households";
import Icon from "./Icon";
import BillUpload from "./BillUpload";
export default function SetupPanel({
  household: h,
  onChange,
}: {
  household: Household;
  onChange: (h: Household) => void;
}) {
  function toggle(key: "ev" | "solar" | "battery") {
    const next = structuredClone(h);
    if (next[key]) delete next[key];
    else if (key === "ev") next.ev = { batteryKWh: 60, chargerKW: 7 };
    else if (key === "solar") next.solar = { kWp: 4, aspect: 0, tilt: 35 };
    else next.battery = { kWh: 5 };
    next.appliances = next.appliances.filter((a) => a.id !== "ev");
    if (next.ev)
      next.appliances.push({ ...appliances[5], kW: next.ev.chargerKW });
    onChange(next);
  }
  return (
    <div className="setup-content">
      <label className="field-label" htmlFor="household">
        YOUR HOUSEHOLD <span>Synthetic profile</span>
      </label>
      <select
        id="household"
        value={h.id}
        onChange={(e) =>
          onChange(
            structuredClone(households.find((h) => h.id === e.target.value)!),
          )
        }
      >
        {households.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <div className="feature-toggles">
        {(["ev", "solar", "battery"] as const).map((key) => (
          <button
            key={key}
            className={h[key] ? "feature active" : "feature"}
            aria-pressed={!!h[key]}
            onClick={() => toggle(key)}
          >
            <Icon name={key === "solar" ? "sun" : key} />
            <span>
              {key === "ev"
                ? "Electric car"
                : key === "solar"
                  ? "Solar panels"
                  : "Battery"}
            </span>
            <span className="toggle-dot" />
          </button>
        ))}
      </div>
      <details className="configure">
        <summary>
          <Icon name="settings" size={15} /> Customise your home <span>+</span>
        </summary>
        <div className="settings-grid">
          <label>
            County
            <select
              aria-label="County"
              value={h.county}
              onChange={(e) => {
                const coords: Record<string, number[]> = {
                  Dublin: [53.35, -6.25],
                  Cork: [51.9, -8.47],
                  Galway: [53.27, -9.05],
                  Limerick: [52.66, -8.63],
                  Donegal: [54.95, -7.73],
                };
                onChange({
                  ...h,
                  county: e.target.value,
                  lat: coords[e.target.value][0],
                  lon: coords[e.target.value][1],
                });
              }}
            >
              {["Dublin", "Cork", "Galway", "Limerick", "Donegal"].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            Annual use · kWh
            <input
              type="number"
              min="100"
              max="40000"
              value={h.annualKWh}
              onChange={(e) => onChange({ ...h, annualKWh: +e.target.value })}
            />
          </label>
          {h.solar && (
            <>
              <label>
                Solar size · kWp
                <input
                  type="number"
                  min="0.5"
                  max="20"
                  step="0.5"
                  value={h.solar.kWp}
                  onChange={(e) =>
                    onChange({
                      ...h,
                      solar: { ...h.solar!, kWp: +e.target.value },
                    })
                  }
                />
              </label>
              <label>
                Roof direction
                <select
                  value={h.solar.aspect}
                  onChange={(e) =>
                    onChange({
                      ...h,
                      solar: { ...h.solar!, aspect: +e.target.value },
                    })
                  }
                >
                  <option value="0">South</option>
                  <option value="-90">East</option>
                  <option value="90">West</option>
                </select>
              </label>
              <label>
                Roof tilt · degrees
                <input
                  type="number"
                  min="0"
                  max="90"
                  value={h.solar.tilt}
                  onChange={(e) =>
                    onChange({
                      ...h,
                      solar: { ...h.solar!, tilt: +e.target.value },
                    })
                  }
                />
              </label>
            </>
          )}
          {h.ev && (
            <>
              <label>
                Charger · kW
                <input
                  type="number"
                  min="1"
                  max="22"
                  value={h.ev.chargerKW}
                  onChange={(e) =>
                    onChange({
                      ...h,
                      ev: { ...h.ev!, chargerKW: +e.target.value },
                      appliances: h.appliances.map((a) =>
                        a.id === "ev" ? { ...a, kW: +e.target.value } : a,
                      ),
                    })
                  }
                />
              </label>
              <label>
                EV battery · kWh
                <input
                  type="number"
                  min="10"
                  max="150"
                  value={h.ev.batteryKWh}
                  onChange={(e) =>
                    onChange({
                      ...h,
                      ev: { ...h.ev!, batteryKWh: +e.target.value },
                    })
                  }
                />
              </label>
            </>
          )}
          {h.battery && (
            <label>
              Home battery · kWh
              <input
                type="number"
                min="1"
                max="30"
                value={h.battery.kWh}
                onChange={(e) =>
                  onChange({ ...h, battery: { kWh: +e.target.value } })
                }
              />
            </label>
          )}
        </div>
        <div className="appliance-checks">
          {appliances
            .filter((a) => a.id !== "ev")
            .map((a) => (
              <label key={a.id}>
                <input
                  type="checkbox"
                  checked={h.appliances.some((p) => p.id === a.id)}
                  onChange={(e) =>
                    onChange({
                      ...h,
                      appliances: e.target.checked
                        ? [...h.appliances, a]
                        : h.appliances.filter((p) => p.id !== a.id),
                    })
                  }
                />
                {a.name}
              </label>
            ))}
        </div>
        <BillUpload onApply={(bill) => onChange({ ...h, billTariff: bill })} />
        {h.billTariff && (
          <button
            className="bill-demo"
            onClick={() => onChange({ ...h, billTariff: undefined })}
          >
            Reset to default sample tariff
          </button>
        )}
      </details>
    </div>
  );
}
