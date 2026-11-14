import type { JSX } from "react";

interface Props {
  passages: readonly string[];
  disruptedPassages: ReadonlySet<string>;
}

export function DisruptionBadge({
  passages,
  disruptedPassages,
}: Props): JSX.Element | null {
  const affected = passages.filter((p) => disruptedPassages.has(p));
  if (affected.length === 0) return null;

  return (
    <span className="disruption-badge" title={`Disrupted: ${affected.join(", ")}`}>
      ⚠ {affected.length === 1 ? affected[0] : `${affected.length} passages`}
    </span>
  );
}
