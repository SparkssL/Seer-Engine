#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ ! -f "$ROOT/.env" ]]; then
  echo "❌ Missing .env. Copy env.example -> .env and fill your keys."
  exit 1
fi

# Read DEMO_MODE (default false) and lowercase without bash-specific ${var,,}
DEMO_MODE_VALUE="$(grep -E '^DEMO_MODE=' "$ROOT/.env" | tail -n1 | cut -d= -f2 || true)"
DEMO_MODE_RAW="${DEMO_MODE_VALUE:-false}"
DEMO_MODE="$(printf '%s' "$DEMO_MODE_RAW" | tr '[:upper:]' '[:lower:]')"

echo "🔧 Ensuring dependencies..."
if [[ ! -d "$ROOT/node_modules" ]]; then npm install; fi
if [[ ! -d "$ROOT/frontend/node_modules" ]]; then (cd frontend && npm install); fi
if [[ ! -d "$ROOT/backend/node_modules" ]]; then (cd backend && npm install); fi

if [[ "${DEMO_MODE}" == "true" ]]; then
  echo "🛑 DEMO_MODE=true -> skipping python-trader deps"
else
  echo "🐍 Ensuring python-trader deps..."
  (cd python-trader && python -m pip install -r requirements.txt)
fi

echo "🚀 Starting services (DEMO_MODE=${DEMO_MODE})..."
if [[ "${DEMO_MODE}" == "true" ]]; then
  # In demo we skip trader; backend uses mock Opinion
  npx concurrently "npm run dev:backend" "npm run dev:frontend"
else
  npm run dev
fi

