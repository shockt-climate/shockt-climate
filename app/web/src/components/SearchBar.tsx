import { useState, type JSX } from "react";
import type { NodeResult } from "../api/schemas";
import type { LaneMode } from "../types";
import { NodeAutocomplete } from "./NodeAutocomplete";
import { OptionsPanel } from "./OptionsPanel";

const ALL_MODES: LaneMode[] = ["vessel", "air", "truck", "rail"];

export interface SearchParams {
  origin: string;
  destination: string;
  cargoT: number | null;
  modes: LaneMode[];
  inlandMode: "truck" | "rail";
  scenario: string;
  compareScenario: string | null;
  hs6: string | null;
  collapse: boolean;
}

interface Props {
  onSubmit: (params: SearchParams) => void;
  loading: boolean;
}

export function SearchBar({ onSubmit, loading }: Props): JSX.Element {
  const [originNode, setOriginNode] = useState<NodeResult | null>(null);
  const [destinationNode, setDestinationNode] = useState<NodeResult | null>(
    null
  );
  const [cargoT, setCargoT] = useState("");
  const [modes, setModes] = useState<Set<LaneMode>>(new Set(ALL_MODES));
  const [inlandMode, setInlandMode] = useState<"truck" | "rail">("truck");
  const [scenario, setScenario] = useState("open");
  const [compareScenario, setCompareScenario] = useState<string | null>(null);

  function handleScenarioChange(next: string) {
    setScenario(next);
    if (compareScenario === next) setCompareScenario(null);
  }
  const [hs6, setHs6] = useState("");
  const [collapse, setCollapse] = useState(true);

  function toggleMode(mode: LaneMode) {
    setModes((prev) => {
      const next = new Set(prev);
      if (next.has(mode)) next.delete(mode);
      else next.add(mode);
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!originNode || !destinationNode) return;

    const origin = originNode.iso3 || originNode.node_id;
    const destination =
      destinationNode.kind === "destination_state"
        ? destinationNode.node_id.replace("destination_state:", "")
        : destinationNode.node_id;

    onSubmit({
      origin,
      destination,
      cargoT: cargoT ? Number(cargoT) : null,
      modes: [...modes],
      inlandMode,
      scenario,
      compareScenario,
      hs6: hs6 || null,
      collapse,
    });
  }

  return (
    <form className="search-bar" onSubmit={handleSubmit}>
      <div className="search-bar-inputs">
        <NodeAutocomplete
          label="Origin"
          value={originNode}
          onChange={setOriginNode}
          placeholder="Country or port..."
        />
        <NodeAutocomplete
          label="Destination"
          kind="destination_state,eu_seaport"
          value={destinationNode}
          onChange={setDestinationNode}
          placeholder="US state (e.g. Texas, CA) or EU port (e.g. Rotterdam)..."
        />
        <label>
          Cargo (tonnes)
          <input
            type="number"
            min="0"
            step="0.1"
            value={cargoT}
            onChange={(e) => setCargoT(e.target.value)}
            placeholder="Optional"
          />
        </label>
      </div>

      <div className="search-bar-options">
        <fieldset className="mode-checkboxes">
          <legend>Modes</legend>
          {ALL_MODES.map((mode) => (
            <label key={mode}>
              <input
                type="checkbox"
                checked={modes.has(mode)}
                onChange={() => toggleMode(mode)}
              />
              {mode}
            </label>
          ))}
        </fieldset>

        <button
          type="submit"
          disabled={loading || !originNode || !destinationNode}
        >
          {loading ? "Calculating..." : "Calculate"}
        </button>
      </div>

      <OptionsPanel
        scenario={scenario}
        compareScenario={compareScenario}
        onScenarioChange={handleScenarioChange}
        onCompareChange={setCompareScenario}
        inlandMode={inlandMode}
        onInlandModeChange={setInlandMode}
        hs6={hs6}
        onHs6Change={setHs6}
        collapse={collapse}
        onCollapseChange={setCollapse}
      />
    </form>
  );
}
