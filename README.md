# Seer Engine 🔮

> AI-Powered Real-Time Prediction Market Trading Bot

A BNB Chain hackathon project by the Midaz team. Seer Engine monitors real-time Twitter events, analyzes their market impact using GPT-5, and automatically executes trades on [Opinion Trade](https://opinion.trade) prediction markets.

![Seer Engine Banner](https://via.placeholder.com/1200x400/0a0a0f/00fff7?text=SEER+ENGINE)

## ✨ Features

- **📡 Real-Time Event Monitoring** - Connect to Twitter WebSocket for live tweet streaming
- **🧠 AI-Powered Analysis** - GPT-5 analyzes events and identifies market impacts
- **📊 Market Intelligence** - Automatically filters relevant prediction markets
- **⚡ Automated Trading** - Places trades via Opinion CLOB SDK
- **🎨 Beautiful UI** - Cyberpunk-inspired dashboard showing the entire analysis pipeline

## 🗺️ User Journey

```mermaid
flowchart LR
  A[Visitor opens Seer Engine] --> B[Connect wallet]
  B --> C[Select sources to monitor]
  C --> D[Live tweets stream into Event Stream]
  D --> E[AI pipeline enriches + scores impact]
  E --> F[Relevant markets suggested]
  F --> G[Auto-trade (or user confirms) on Opinion Trade]
  G --> H[Execution + PnL surfaced in UI]
```

## 🏗️ Architecture

```mermaid
flowchart LR
  TW[twitter websocket] --> BE[Backend (FastAPI + Socket.IO)]
  BE --> AI[OpenAI analysis + market selection]
  AI --> OP[Opinion Trade CLOB SDK + Web3]
  BE --> UI[Next.js frontend]
  OP --> BE
  UI -->|Real-time| BE
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Python 3.9+
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/your-org/seer-engine.git
cd seer-engine
```

2. **Install dependencies**
```bash
# Root tooling (concurrently)
npm install

# Frontend
cd frontend && npm install && cd ..

# Backend (Python)
cd backend && python -m pip install -r requirements.txt && cd ..
```

3. **Configure environment**
```bash
cp .env.example .env
```

Edit `.env` with your API keys:
```env
# OpenAI API (required for AI analysis)
OPENAI_API_KEY=sk-...

# Twitter API 
TWITTER_API_KEY=your_twitter_api_key

# Opinion Trade 
OPINION_API_KEY=your_opinion_api_key
OPINION_PRIVATE_KEY=your_wallet_private_key
OPINION_RPC_URL=https://bsc-dataseed.binance.org

# Server configuration
BACKEND_PORT=3001
FRONTEND_URL=http://localhost:3000
# Frontend runtime (override if backend URL differs)
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
```

4. **Start services**
```bash
# Terminal 1: Frontend
cd frontend && npm run dev

# Terminal 2: Backend (FastAPI + Socket.IO)
cd backend && python -m uvicorn main:socket_app --host 0.0.0.0 --port 3001 --reload
```

## 🚢 Deployment

- **Frontend (Next.js)**: `cd frontend && npm run build && npm run start`; set `NEXT_PUBLIC_BACKEND_URL` to the public backend URL.
- **Backend (FastAPI + Socket.IO)**: `cd backend && python -m uvicorn main:socket_app --host 0.0.0.0 --port ${BACKEND_PORT:-3001}`; run under a supervisor (systemd, pm2 with python, or Docker).
- **Environment**: copy `.env.example` to `.env` on each host; ensure `FRONTEND_URL` matches the deployed frontend origin and Opinion/OpenAI/Twitter keys are populated.
- **Reverse proxy (optional)**: terminate TLS and route `/socket.io` and API traffic to backend; everything else to frontend.
- **Health check**: `GET /health` on the backend returns status.

5. **Open the app**

Navigate to [http://localhost:3000](http://localhost:3000)

## 📱 User Interface

### Source Selection
Choose which Twitter accounts to monitor:
- News outlets (Reuters, AP, BBC)
- Crypto influencers (Vitalik, whale_alert)
- Political figures (POTUS, Congress)
- Sports reporters (ESPN, Bleacher Report)

### Live Dashboard
- **Tweet Feed** - Real-time incoming events
- **AI Analysis Pipeline** - Watch GPT-5 analyze events step-by-step
- **Market Impact** - See which markets are affected and why
- **Trade Execution** - Track automated trades

## 🔧 Configuration

### Twitter Sources
Modify `DEFAULT_SOURCES` in `frontend/src/app/page.tsx` to customize monitored accounts.

### Trading Parameters
Adjust in `backend/services/analyzer_service.py`:
- Minimum confidence threshold
- Maximum trade amount
- Market relevance cutoff

## 📚 API Integrations

### Twitter API
Using [twitterapi.io](https://twitterapi.io) WebSocket for real-time tweet streaming.

### OpenAI GPT-5
Used for:
1. Filtering relevant markets from event context
2. Analyzing impact direction (positive/negative)
3. Generating trade recommendations

### Opinion Trade
[CLOB SDK Documentation](https://docs.opinion.trade/developer-guide/opinion-clob-sdk)

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, React 18, Tailwind CSS, Framer Motion, Three.js / React Three Fiber |
| Backend | FastAPI, python-socketio, Uvicorn, Pydantic |
| Analysis & Trading | OpenAI API, Opinion CLOB SDK, Web3.py |
| Blockchain | BNB Chain |

## 📦 Open-Source Dependencies

- **Frontend**: Next.js 14, React 18, Tailwind CSS, Framer Motion, Three.js / React Three Fiber, tailwind-merge, clsx, lucide-react, socket.io-client.
- **Backend**: FastAPI, python-socketio, Uvicorn, aiohttp, Pydantic & Pydantic Settings, python-dotenv, openai.
- **Trading/On-chain**: opinion-clob-sdk, web3.py.
- **Tooling**: TypeScript (frontend), PostCSS/Tailwind tooling, concurrently (root scripts).

## 📁 Project Structure

```
seer-engine/
├── frontend/               # Next.js frontend (dashboard)
│   ├── src/
│   │   ├── app/            # Pages & layouts
│   │   ├── components/     # React components
│   │   ├── hooks/          # Custom hooks
│   │   └── lib/            # Utilities & types
│   └── package.json
├── backend/                # FastAPI + Socket.IO service
│   ├── main.py             # ASGI entrypoint (uvicorn main:socket_app)
│   ├── services/           # Twitter, OpenAI, Opinion, Analyzer
│   ├── models/             # Pydantic models
│   ├── config.py           # Settings/env loader
│   └── requirements.txt
├── scripts/
│   └── start-all.sh
├── .env.example
├── package.json            # Root scripts (concurrently)
├── package-lock.json
└── README.md
```

## ⚠️ Disclaimer

This software is for educational and demonstration purposes. Trading on prediction markets involves financial risk. Always:
- Use test funds first
- Understand the markets you're trading
- Set appropriate position limits
- Monitor automated systems

## 🤝 Contributing

Contributions welcome! Please read our contributing guidelines first.

## 📄 License

MIT License - see LICENSE file for details.

---

Built with ❤️ by the Midaz Team for BNB Chain Hackathon
