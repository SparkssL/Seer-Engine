#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ ! -f "$ROOT/.env" ]]; then
  echo "❌ Missing .env. Copy env.example -> .env and fill your keys."
  exit 1
fi

echo "🔧 Ensuring dependencies..."
if [[ ! -d "$ROOT/node_modules" ]]; then npm install; fi
if [[ ! -d "$ROOT/frontend/node_modules" ]]; then (cd frontend && npm install); fi
echo "🐍 Ensuring backend Python deps..."
PYTHON_BIN="${PYTHON_BIN:-python3}"
(cd backend && "$PYTHON_BIN" -m pip install -r requirements.txt)

echo "🚀 Starting services..."
npx concurrently "npm run dev:backend" "npm run dev:frontend"

