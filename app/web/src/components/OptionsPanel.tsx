import { useState, type JSX } from "react";
import { ScenarioSelector } from "./ScenarioSelector";

interface Props {
  scenario: string;
  compareScenario: string | null;
  onScenarioChange: (scenario: string) => void;
  onCompareChange: (scenario: string | null) => void;
  inlandMode: "truck" | "rail";
  onInlandModeChange: (mode: "truck" | "rail") => void;
  hs6: string;
  onHs6Change: (hs6: string) => void;
  collapse: boolean;
  onCollapseChange: (v: boolean) => void;
}

export function OptionsPanel({
  scenario,
  compareScenario,
  onScenarioChange,
  onCompareChange,
  inlandMode,
  onInlandModeChange,
  hs6,
  onHs6Change,
  collapse,
  onCollapseChange,
}: Props): JSX.Element {
  const [open, setOpen] = useState(false);

  return (
    <div className="options-panel">
      <button
        type="button"
        className="options-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {open ? "▾ Advanced options" : "▸ Advanced options"}
      </button>

      {open && (
        <div className="options-body">
          <ScenarioSelector
            scenario={scenario}
            compareScenario={compareScenario}
            onScenarioChange={onScenarioChange}
            onCompareChange={onCompareChange}
          />

          <label>
            Inland mode
            <select
              value={inlandMode}
              onChange={(e) =>
                onInlandModeChange(e.target.value as "truck" | "rail")
              }
            >
              <option value="truck">Truck</option>
              <option value="rail">Rail</option>
            </select>
          </label>

          <label>
            HS-6 code
            <input
              type="text"
              value={hs6}
              onChange={(e) => onHs6Change(e.target.value)}
              placeholder="e.g. 841810"
              maxLength={6}
            />
          </label>

          <label className="collapse-toggle">
            <input
              type="checkbox"
              checked={collapse}
              onChange={(e) => onCollapseChange(e.target.checked)}
            />
            Group similar routes
          </label>
        </div>
      )}
    </div>
  );
}
