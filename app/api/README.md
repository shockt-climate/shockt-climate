# ShockT Climate Route Calculator API

FastAPI backend for the route calculator. See [the plan](../../docs/plans/route-calculator.md).

## Local development

### Prerequisites

- Python 3.12+
- [uv](https://docs.astral.sh/uv/)
- A Neon (or other Postgres) database with the `core` schema populated

### Setup

```bash
cd app/api
uv sync
```

### Environment

Export your Neon connection string:

```bash
export DATABASE_URL="postgresql://user:password@your-neon-host.neon.tech/neondb?sslmode=require"
```

### Run

Start both the API and front end together from the repo root:

```bash
DATABASE_URL="postgresql://..." ./dev.sh
```

Or run the API alone:

```bash
cd app/api
uv run uvicorn shockt_api.main:app --reload --port 8000
```

The API is then available at `http://localhost:8000`. Interactive docs at `http://localhost:8000/docs`.

### Tests

```bash
cd app/api
uv run ruff check . && uv run ruff format --check . && uv run pytest
```

Integration tests require Docker (they start a throwaway Postgres container).
