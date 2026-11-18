#!/usr/bin/env bash
# Usage: ./dev.sh [api|web|all]   (default: all)
set -euo pipefail

cd "$(dirname "$0")"

ENV_FILE=app/api/.env
if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a
fi

PIPELINES_ENV=data-pipelines/.env
if [ -z "${DATABASE_URL:-}" ] && [ -f "$PIPELINES_ENV" ]; then
  DATABASE_URL="$(set -a; . "$PIPELINES_ENV" >/dev/null 2>&1; printf '%s' "${DBT_DATABASE_URL:-}")"
  export DATABASE_URL
fi

target="${1:-all}"

if [ "$target" != "web" ] && [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL is not set." >&2
  echo "Set DBT_DATABASE_URL in $PIPELINES_ENV, or DATABASE_URL in $ENV_FILE, or export it." >&2
  exit 1
fi

run_api() { (cd app/api && exec uv run uvicorn shockt_api.main:app --reload --port 8000); }
run_web() { (cd app/web && exec npm run dev); }

case "$target" in
  api) run_api ;;
  web) run_web ;;
  all)
    trap 'kill 0' EXIT
    run_api &
    run_web &
    wait
    ;;
  *)
    echo "Usage: $0 [api|web|all]" >&2
    exit 2
    ;;
esac
