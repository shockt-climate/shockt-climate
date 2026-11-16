#!/usr/bin/env bash
set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL is not set." >&2
  echo "Export it or add it to app/api/.env and source it first." >&2
  exit 1
fi

trap 'kill 0' EXIT

(cd app/api && uv run uvicorn shockt_api.main:app --reload --port 8000) &
(cd app/web && npm run dev) &

wait
