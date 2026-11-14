import type { JSX } from "react";
import type { CommodityResponse } from "../api/schemas";

interface Props {
  commodity: CommodityResponse;
}

export function CommodityContext({ commodity }: Props): JSX.Element {
  return (
    <div className="commodity-context">
      <h3 className="commodity-heading">
        Commodity: {commodity.hs6}
      </h3>
      <p className="commodity-description">{commodity.description}</p>
      {commodity.top_ports.length > 0 && (
        <>
          <h4 className="commodity-subheading">Top arrival ports by tonnage</h4>
          <ul className="commodity-ports">
            {commodity.top_ports.map((port) => (
              <li key={port.node_id}>
                {port.name}{" "}
                <span className="commodity-tonnage">
                  {port.weight_t >= 1000
                    ? `${(port.weight_t / 1000).toFixed(1)}k t`
                    : `${port.weight_t.toFixed(0)} t`}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
