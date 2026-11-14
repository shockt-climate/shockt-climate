import type { JSX } from "react";
import type { EmissionScope } from "../types";

interface Props {
  value: EmissionScope;
  onChange: (scope: EmissionScope) => void;
}

const SCOPES: { value: EmissionScope; label: string; title: string }[] = [
  { value: "wtw", label: "WTW", title: "Well-to-wheel (total lifecycle)" },
  { value: "ttw", label: "TTW", title: "Tank-to-wheel (combustion only)" },
  { value: "wtt", label: "WTT", title: "Well-to-tank (upstream only)" },
];

export function EmissionsScopeToggle({ value, onChange }: Props): JSX.Element {
  return (
    <div className="scope-toggle" role="radiogroup" aria-label="Emission scope">
      {SCOPES.map((s) => (
        <button
          key={s.value}
          role="radio"
          aria-checked={value === s.value}
          title={s.title}
          className={value === s.value ? "scope-btn--active" : "scope-btn"}
          onClick={() => onChange(s.value)}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}
