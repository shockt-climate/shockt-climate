# ShockT Climate Route Calculator — Front End

React + TypeScript + Effect front end for the route calculator. See [the plan](../../docs/plans/route-calculator.md).

## Local development

### Prerequisites

- Node.js 20+
- The API server running at `http://localhost:8000` (see [`app/api/README.md`](../api/README.md))

### Setup

```bash
cd app/web
npm install
```

### Run

From the repo root, start the API and front end together (the database URL is resolved as described in [`app/api/README.md`](../api/README.md)):

```bash
./dev.sh
```

Or run the front end alone (requires the API already running on port 8000):

```bash
./dev.sh web
```

Opens at `http://localhost:5173`. The Vite dev server proxies `/api` requests to `http://localhost:8000`.

### Tests

```bash
cd app/web
npx vitest run
```

### Lint and type-check

```bash
cd app/web
npm run lint
npx tsc --noEmit -p tsconfig.app.json
```
