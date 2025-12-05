# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Seer Engine is an AI-powered real-time prediction market trading bot built for BNB Chain. It monitors Twitter events via WebSocket, analyzes their market impact using GPT-4, and automatically executes trades on [Opinion Trade](https://opinion.trade) prediction markets.

**Key Technologies:**
- Frontend: Next.js 14, React 18, Tailwind CSS, Socket.IO client
- Backend: Node.js/Express with TypeScript, Socket.IO server
- AI Analysis: OpenAI GPT-4 Turbo
- Trading: Python with Opinion CLOB SDK
- Real-time: WebSocket connections for Twitter streams and client updates

## Development Commands

### Root Level (Monorepo)
```bash
# Install all dependencies (root, frontend, backend, python-trader)
npm run install:all

# Start all services concurrently (frontend + backend + python trader)
npm run dev

# Start individual services
npm run dev:frontend   # Next.js on port 3000
npm run dev:backend    # Express on port 3001
npm run dev:trader     # Python trading service

# Build frontend for production
npm run build
```

### Backend (TypeScript/Node.js)
```bash
cd backend

# Development with hot reload
npm run dev           # Uses tsx watch

# Build TypeScript to JavaScript
npm run build         # Outputs to dist/

# Run production build
npm run start         # Runs compiled JS from dist/
```

### Frontend (Next.js)
```bash
cd frontend

# Development server
npm run dev

# Production build
npm run build

# Start production server
npm run start

# Lint code
npm run lint
```

### Python Trader
```bash
cd python-trader

# Install dependencies
pip install -r requirements.txt

# Run service (listens on stdin for JSON commands)
python main.py
```

### Quick Start Script
```bash
# All-in-one startup (checks .env, installs deps, honors DEMO_MODE)
./scripts/start-all.sh
```

## Architecture Overview

### Three-Service Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Twitter API    │────▶│  Node.js Server  │────▶│  Python Trader  │
│   (WebSocket)   │     │  (Socket.IO)     │     │  (Opinion SDK)  │
└─────────────────┘     └────────┬─────────┘     └─────────────────┘
                                 │
                                 ▼
                        ┌──────────────────┐
                        │   OpenAI GPT-4   │
                        │   (Analysis)     │
                        └──────────────────┘
                                 │
                                 ▼
                        ┌──────────────────┐
                        │  Next.js Frontend │
                        │  (Real-time UI)   │
                        └──────────────────┘
```

### Data Flow

1. **Event Capture**: Twitter WebSocket streams tweets from configured accounts to backend
2. **Market Filtering (Stage A)**: GPT-4 quickly scans all markets to find 3-5 relevant ones (cheap, fast)
3. **Impact Analysis (Stage B)**: GPT-4 deeply analyzes each filtered market and generates trade decisions (expensive, detailed)
4. **Trade Execution**: Python service places orders via Opinion CLOB SDK on BNB Chain
5. **Real-time Updates**: All steps stream to frontend via Socket.IO for live visualization

### Backend Service Architecture

The backend (`backend/src/`) orchestrates the entire analysis pipeline:

**Entry Point**: `index.ts`
- Initializes Express server and Socket.IO
- Manages service lifecycle (Twitter, OpenAI, Opinion, Analyzer)
- Handles demo mode (generates mock tweets when `DEMO_MODE=true` or no Twitter API key)
- Graceful shutdown on SIGTERM/SIGINT

**Core Services** (`backend/src/services/`):

1. **TwitterService** (`twitter.ts`):
   - Connects to twitterapi.io WebSocket for real-time tweet streams
   - Generates mock tweets in demo mode
   - Emits 'tweet', 'connected', 'disconnected', 'error' events

2. **OpenAIService** (`openai.ts`):
   - **Two-stage LLM pipeline** for cost optimization:
     - Stage A (Filtering): Fast scan to find 3-5 relevant markets from hundreds
     - Stage B (Analysis): Deep analysis with trading decision for each filtered market
   - Uses strict JSON response format for reliability
   - Temperature: 0.2 for filtering, 0.3 for analysis

3. **OpinionService** (`opinion.ts`):
   - Node.js wrapper around Python trader process
   - Communicates via stdin/stdout JSON protocol
   - Methods: `getMarkets()`, `placeOrder()`, `getBalance()`
   - Returns mock data when Python service is unavailable

4. **AnalyzerService** (`analyzer.ts`):
   - **Master orchestrator** of the analysis pipeline
   - Implements 6-step workflow: Receiving → Filtering → Analyzing → Deciding → Executing → Complete
   - Queues tweets when busy (processes one at a time)
   - Streams progress to frontend via Socket.IO events:
     - `session:start`, `session:update`, `session:complete`
     - `markets`, `sessions:history`
   - Maintains session history (last 50 sessions)
   - Only executes trades when: impact_score > 0.6, action != HOLD, side != null

**Type System** (`types.ts`):
- Shared TypeScript interfaces between frontend/backend
- Critical types: `AnalysisSession`, `MarketImpact`, `TradeExecution`
- LLM response schemas: `GPTMarketFilterResponse`, `GPTMarketAnalysisResponse`

### Frontend Architecture

The frontend (`frontend/src/`) is a Next.js 14 app with client-side Socket.IO connection:

**Structure**:
- `app/`: Next.js App Router pages and layouts
- `components/`: React components for UI (Dashboard, AnalysisPipeline, TweetFeed, etc.)
- `hooks/`: Custom React hooks (primarily `useSocket`)
- `lib/`: Shared types and utilities

**Key Components**:
- **Dashboard**: Main container orchestrating all child components
- **AnalysisPipeline**: Visualizes the 6-step analysis flow in real-time
- **TweetFeed**: Shows incoming tweets as they arrive
- **MarketImpactPanel**: Displays analyzed markets with sentiment and trade decisions
- **SourceSelector**: Configures which Twitter accounts to monitor

**Socket.IO Events** (from backend):
- `tweet`: New tweet received
- `markets`: Market list updated
- `session:start`: Analysis session started
- `session:update`: Step progress or data updated
- `session:complete`: Analysis finished

### Python Trading Service

The Python service (`python-trader/main.py`) is a stdin/stdout JSON RPC service:

**Communication Protocol**:
```json
// Request
{"command": "place_order", "params": {"marketId": "123", "side": "YES", "amount": 10, "price": 0.65}, "id": "req-1"}

// Response
{"id": "req-1", "data": {"success": true, "orderId": "...", "txHash": "0x..."}, "error": null}
```

**Commands**: `get_markets`, `place_order`, `get_balance`

**Opinion CLOB SDK Integration** (Updated 2025-12-06):
- Connects to Opinion Trade on BNB Chain (chain_id: 56)
- Uses LIMIT orders via `PlaceOrderDataInput`
- **Proper token ID fetching**: Calls `get_market()` to fetch actual token IDs from market details
- **Orderbook checking**: Calls `get_orderbook()` before placing orders to check best bid/ask
- **errno-based error handling**: Checks `errno` field in all API responses (0 = success)
- **Specific exception handling**: Catches `InvalidParamError` and `OpenApiError` separately
- **Cache configuration**: Caches markets (60s TTL) and quote tokens (300s TTL) for performance
- **Robust balance fetching**: Tries multiple SDK methods, prefers USDC/USDT balances
- Falls back to mock data/trades when SDK unavailable or credentials missing

## Configuration

### Environment Variables (`.env`)

**Required**:
- `OPENAI_API_KEY`: OpenAI API key for GPT-4 analysis

**Optional** (demo mode if not set):
- `TWITTER_API_KEY`: twitterapi.io API key for real-time tweets
- `OPINION_API_KEY`: Opinion Trade API key
- `OPINION_PRIVATE_KEY`: Wallet private key (hex format) for signing trades
- `OPINION_RPC_URL`: BNB Chain RPC endpoint (default: `https://bsc-dataseed.binance.org`)

**Server Config**:
- `BACKEND_PORT`: Backend server port (default: 3001)
- `FRONTEND_URL`: Frontend URL for CORS (default: `http://localhost:3000`)
- `NEXT_PUBLIC_BACKEND_URL`: Backend URL visible to frontend (default: `http://localhost:3001`)
- `DEMO_MODE`: Set to `true` to force demo mode even with API keys

### Demo Mode Behavior

When `DEMO_MODE=true` OR `TWITTER_API_KEY` is missing:
- Backend generates mock tweets every 15 seconds
- Python service uses mock markets and simulated trades
- No actual API calls to Twitter or Opinion Trade

### Trading Parameters

Configured in `backend/src/services/analyzer.ts`:
- Minimum confidence threshold: `impactScore > 0.6`
- Trade action filter: `action !== 'HOLD' && side !== null`
- Balance guard: Fetches wallet balance once per session, caps trade sizes to available funds

Configured in `backend/src/services/openai.ts`:
- Max markets to analyze: 5 (even if more are filtered)
- Temperature: 0.2 (filtering), 0.3 (analysis)
- Max tokens: 500 (filtering), 600 (analysis)

### Twitter Sources

Modify `DEFAULT_SOURCES` in `frontend/src/app/page.tsx` to customize monitored accounts. Default includes:
- General: @elonmusk, @POTUS, @Reuters, @AP, @WSJ, @BBCBreaking, @CNBCnow
- Crypto: @VitalikButerin, @caborana, @lookonchain, @whale_alert
- Politics: @WhiteHouse, @SpeakerJohnson, @HouseDemocrats
- Sports: @ESPN, @BleacherReport, @AdamSchefter, @wojespn

## Key Patterns and Conventions

### TypeScript Configuration

- **Module System**: ESNext with `"type": "module"` in package.json (backend uses ES modules, not CommonJS)
- **Import Extensions**: All relative imports must use `.js` extension (e.g., `import { foo } from './types.js'`)
- **Target**: ES2022
- **Strict Mode**: Enabled

### Error Handling

- Backend services emit errors via EventEmitter pattern (TwitterService)
- LLM failures return safe defaults (HOLD decision, neutral sentiment)
- Python service returns `{success: false, error: string}` on failures
- OpinionService falls back to mock data if Python process fails

### Socket.IO Events

Backend emits events prefixed by domain:
- `session:*` - Analysis session lifecycle
- `markets` - Market data updates
- No prefix - Raw data (e.g., `tweet`)

Frontend listens for these events and updates React state via `useSocket` hook.

### LLM Prompt Engineering

The two-stage pipeline is cost-optimized:
- **Stage A (Filter)**: Uses compact market summaries (id, question, category only)
- **Stage B (Analysis)**: Includes full market details (prices, volume, end date)
- Both stages use `response_format: { type: 'json_object' }` for structured output
- Prompts include explicit rules for trade sizing and confidence thresholds

### Session History

AnalyzerService maintains last 50 sessions in memory:
- Snapshots full session state (including steps, impacts, trades)
- Emitted to new clients on connection via `sessions:history`
- No database persistence (resets on server restart)

## Common Workflows

### Adding a New Service

1. Create service class in `backend/src/services/`
2. Initialize in `backend/src/index.ts`
3. Add Socket.IO events if needed
4. Update `types.ts` with new interfaces
5. Handle graceful shutdown in SIGTERM handler

### Modifying Analysis Steps

Edit `AnalyzerService.runAnalysis()` in `backend/src/services/analyzer.ts`:
- Add/remove steps via `addStep()`
- Update step status via `updateStepStatus()`
- Emit `session:update` after changes

### Changing LLM Behavior

Edit prompts in `backend/src/services/openai.ts`:
- `filterRelevantMarkets()`: Stage A filtering logic
- `analyzeMarketImpact()`: Stage B analysis logic
- Update response schemas in `types.ts` if output format changes

### Debugging Real-time Issues

Check console logs prefixed by service:
- `[Server]`: Main server lifecycle
- `[Socket]`: Socket.IO connections
- `[Twitter]`: Tweet events
- `[Analyzer]`: Analysis pipeline
- `[OpenAI]`: LLM calls (includes counts and decisions)
- Python service: JSON output to stdout

## Important Notes

- **ESM Imports**: Always use `.js` extension in imports (TypeScript requirement with ESM)
- **API Keys**: Never commit real API keys; use `.env` file (already in `.gitignore`)
- **Demo Mode**: Perfect for testing without API costs or rate limits
- **Balance Guard**: Python service fetches balance once per session to avoid overspending
- **Queue System**: Analyzer processes one tweet at a time; subsequent tweets are queued
- **Session History**: Limited to 50 sessions to avoid memory bloat
