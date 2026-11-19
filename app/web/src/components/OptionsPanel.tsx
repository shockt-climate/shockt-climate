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
  collapseSensitivity: number | null;
  onCollapseSensitivityChange: (v: number | null) => void;
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
  collapseSensitivity,
  onCollapseSensitivityChange,
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

          {collapse && (
            <label className="granularity-slider">
              Grouping granularity
              <div className="slider-row">
                <span className="slider-label">Fewer</span>
                <input
                  type="range"
                  min={1.5}
                  max={6}
                  step={0.5}
                  value={7.5 - (collapseSensitivity ?? 3)}
                  onChange={(e) =>
                    onCollapseSensitivityChange(7.5 - Number(e.target.value))
                  }
                />
                <span className="slider-label">More</span>
              </div>
            </label>
          )}
        </div>
      )}
    </div>
  );
}
