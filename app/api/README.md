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

`./dev.sh` finds the database URL in this order:

1. An exported `DATABASE_URL`.
2. `DATABASE_URL` in `app/api/.env` (gitignored).
3. `DBT_DATABASE_URL` in `data-pipelines/.env`, the `shockt_transform` login.

To override it, export a Neon connection string:

```bash
export DATABASE_URL="postgresql://user:password@your-neon-host.neon.tech/neondb?sslmode=require"
```

### Run

From the repo root, run the API alone:

```bash
./dev.sh api
```

Or run the API and front end together:

```bash
./dev.sh
```

The API is then available at `http://localhost:8000`. Interactive docs at `http://localhost:8000/docs`.

### Tests

```bash
cd app/api
uv run ruff check . && uv run ruff format --check . && uv run pytest
```

Integration tests require Docker (they start a throwaway Postgres container).
