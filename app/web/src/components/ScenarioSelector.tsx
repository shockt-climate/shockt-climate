import type { JSX } from "react";

const SCENARIOS = [
  { value: "open", label: "Open (baseline)" },
  { value: "suez_closed", label: "Suez closed" },
  { value: "panama_closed", label: "Panama closed" },
  { value: "panama_and_red_sea_closed", label: "Panama + Red Sea closed" },
];

interface Props {
  scenario: string;
  compareScenario: string | null;
  onScenarioChange: (scenario: string) => void;
  onCompareChange: (scenario: string | null) => void;
}

export function ScenarioSelector({
  scenario,
  compareScenario,
  onScenarioChange,
  onCompareChange,
}: Props): JSX.Element {
  return (
    <div className="scenario-selector">
      <label>
        Scenario
        <select
          value={scenario}
          onChange={(e) => onScenarioChange(e.target.value)}
        >
          {SCENARIOS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </label>

      <label>
        Compare with
        <select
          value={compareScenario ?? ""}
          onChange={(e) =>
            onCompareChange(e.target.value || null)
          }
        >
          <option value="">None</option>
          {SCENARIOS.filter((s) => s.value !== scenario).map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
