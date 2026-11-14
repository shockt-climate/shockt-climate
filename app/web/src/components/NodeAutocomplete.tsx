import { useRef, useState, type JSX } from "react";
import type { NodeResult } from "../api/schemas";
import { useNodes } from "../hooks/useNodes";

interface Props {
  label: string;
  kind?: string;
  value: NodeResult | null;
  onChange: (node: NodeResult | null) => void;
  placeholder?: string;
}

export function NodeAutocomplete({
  label,
  kind,
  value,
  onChange,
  placeholder,
}: Props): JSX.Element {
  const { results, loading, search, clear } = useNodes();
  const [inputValue, setInputValue] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  function handleInput(q: string) {
    setInputValue(q);
    if (value) onChange(null);
    search(q, kind);
    setOpen(true);
  }

  function handleSelect(node: NodeResult) {
    onChange(node);
    setInputValue(node.name);
    setOpen(false);
    clear();
  }

  function handleBlur(e: React.FocusEvent) {
    if (!containerRef.current?.contains(e.relatedTarget as Node)) {
      setOpen(false);
    }
  }

  const displayValue = value ? value.name : inputValue;

  return (
    <div
      ref={containerRef}
      className="autocomplete"
      onBlur={handleBlur}
      style={{ position: "relative" }}
    >
      <label>
        {label}
        <input
          type="text"
          value={displayValue}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setOpen(true);
          }}
          placeholder={placeholder}
        />
      </label>
      {loading && <span className="autocomplete-loading">Searching...</span>}
      {open && results.length > 0 && (
        <ul className="autocomplete-dropdown" role="listbox">
          {results.map((node) => (
            <li
              key={node.node_id}
              role="option"
              aria-selected={false}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(node)}
            >
              <strong>{node.name}</strong>{" "}
              <span className="autocomplete-meta">
                {node.iso3} &middot; {node.kind.replace(/_/g, " ")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
