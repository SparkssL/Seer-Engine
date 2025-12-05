# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Seer Engine is an AI-powered real-time prediction market trading bot built for BNB Chain. It monitors Twitter events via WebSocket, analyzes their market impact using GPT-5, and automatically executes trades on [Opinion Trade](https://opinion.trade) prediction markets.

**Key Technologies:**
- Frontend: Next.js 14, React 18, Tailwind CSS, Socket.IO client
- Backend: Node.js/Express with TypeScript, Socket.IO server
- AI Analysis: OpenAI GPT-5 Turbo
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
                        │   OpenAI GPT-5   │
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
2. **Market Filtering (Stage A)**: GPT-5 quickly scans all markets to find 3-5 relevant ones (cheap, fast)
3. **Impact Analysis (Stage B)**: GPT-5 deeply analyzes each filtered market and generates trade decisions (expensive, detailed)
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
- LLM response schemas: `GPTMarketFilterResponse`, `GPTMarketAnalysisResponse`, `GPTMarketSelectionResponse`

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

### Three-Stage LLM Pipeline (Updated 2025-12-06)

The system now uses a **three-stage LLM pipeline** for intelligent decision-making:

1. **Stage A (Filtering)**: Fast scan to find 3-5 relevant markets from hundreds
   - Model: GPT-5 Turbo
   - Temperature: 0.2
   - Cost: Low (compact market summaries)

2. **Stage B (Analysis)**: Deep analysis with trading decision for each filtered market
   - Model: GPT-5 Turbo
   - Temperature: 0.3
   - Cost: Medium (full market details)

3. **Stage C (Selection)**: **LLM intelligently selects the ONE best market to trade**
   - Model: GPT-5 Turbo
   - Temperature: 0.4
   - Cost: Low (single comparison call)
   - **Considers**: Impact score, confidence, edge quality, liquidity, time sensitivity, risk/reward
   - **Returns**: Selected market ID, reasoning, comparative analysis, selection confidence

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
- **APIResponse parsing**: Correctly parses `{errno, errmsg, result: {data/list}}` format per SDK docs
- **errno-based error handling**: Checks `errno` field (0 = success) with proper errmsg extraction
- **Specific exception handling**: Catches `InvalidParamError` and `OpenApiError` separately
- **Optimized cache configuration**:
  - `market_cache_ttl=60` (high-frequency trading optimization)
  - `quote_tokens_cache_ttl=300` (5 minutes)
  - `enable_trading_check_interval=3600` (1 hour approval status cache)
- **Robust balance fetching**: Tries multiple SDK methods, prefers USDC/USDT balances
- **NO MOCK DATA**: All fallbacks removed - requires real API credentials and SDK installation
- **Required credentials**: `OPINION_API_KEY`, `OPINION_PRIVATE_KEY`, `OPINION_MULTISIG_ADDR` (all mandatory)

## Configuration

### Environment Variables (`.env`)

**Required**:
- `OPENAI_API_KEY`: OpenAI API key for GPT-5 analysis

**Required for Production**:
- `TWITTER_API_KEY`: twitterapi.io API key for real-time tweets (no mock data fallback)
- `OPINION_API_KEY`: Opinion Trade API key (required for market data) - obtain via Opinion Labs application
- `OPINION_PRIVATE_KEY`: Wallet private key in hex format (64 characters, with or without 0x prefix) for signing trades
- `OPINION_MULTISIG_ADDR`: Ethereum address that holds your assets/portfolio (REQUIRED - not optional)
- `OPINION_RPC_URL`: BNB Chain RPC endpoint (optional, default: `https://bsc-dataseed.binance.org`)

**Server Config**:
- `BACKEND_PORT`: Backend server port (default: 3001)
- `FRONTEND_URL`: Frontend URL for CORS (default: `http://localhost:3000`)
- `NEXT_PUBLIC_BACKEND_URL`: Backend URL visible to frontend (default: `http://localhost:3001`)
- `DEMO_MODE`: Set to `true` to force demo mode even with API keys

### API Requirements (Updated 2025-12-06)

**IMPORTANT**: Mock data has been completely removed. The system now requires real API credentials:

- **Twitter API**: Required for tweet streaming. System will not function without `TWITTER_API_KEY`.
- **Opinion Trade API**: Required for market data and trading. Python service will fail to start without proper credentials.
- **Python Dependencies**: Must install `opinion-clob-sdk` via `pip install -r python-trader/requirements.txt`

If credentials are missing or invalid, the system will return errors instead of mock data.

### Trading Parameters (Updated 2025-12-06)

Configured in `backend/src/services/analyzer.ts`:
- **Trading Strategy**: ONE trade per event on the SINGLE best market (LLM-selected)
- **Fixed trade amount**: $5 per trade (constant)
- Minimum impact threshold: `impactScore > 0.6`
- **Minimum confidence threshold**: `confidence > 0.7`
- Trade action filter: `action !== 'HOLD' && side !== null`
- Balance guard: Checks wallet balance before trade, requires minimum $5 available
- **Selection logic**: **LLM intelligently selects best market** (no hard-coded rules)

Configured in `backend/src/services/openai.ts`:
- Max markets to analyze: 5 (even if more are filtered)
- Temperature: 0.2 (filtering), 0.3 (analysis), **0.4 (selection)**
- Max tokens: 500 (filtering), 600 (analysis), **400 (selection)**
- **AI generates confidence scores** (0.0-1.0) for each analysis
- **AI makes final trading decision**: Selects ONE market using holistic evaluation

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

### LLM Prompt Engineering (Updated 2025-12-06)

The **three-stage pipeline** is cost-optimized and decision-driven:
- **Stage A (Filter)**: Uses compact market summaries (id, question, category only)
- **Stage B (Analysis)**: Includes full market details (prices, volume, end date)
- **Stage C (Selection)**: **NEW** - LLM makes final decision on which market to trade
  - Receives all analyzed market impacts with scores and reasoning
  - Considers: impact score, confidence, edge quality, liquidity, time sensitivity, risk/reward
  - Returns selection with comparative analysis and reasoning
- All stages use `response_format: { type: 'json_object' }` for structured output
- Prompts include explicit rules for trade sizing and confidence thresholds

### Session History (Updated 2025-12-06)

AnalyzerService maintains last **500 sessions** in memory (increased from 50):
- Snapshots full session state (including steps, impacts, trades, **confidence scores**)
- Emitted to new clients on connection via `sessions:history`
- Real-time analytics calculated and emitted via `sessions:analytics`
- Includes filtering, search, and session replay capabilities
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
