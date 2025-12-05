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

## 🏗️ Architecture

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
# Install root dependencies
npm install

# Install frontend dependencies
cd frontend && npm install && cd ..

# Install backend dependencies
cd backend && npm install && cd ..

# Install Python dependencies
cd python-trader && pip install -r requirements.txt && cd ..
```

3. **Configure environment**
```bash
cp .env.example .env
```

Edit `.env` with your API keys:
```env
# OpenAI API (required for AI analysis)
OPENAI_API_KEY=sk-...

# Twitter API (optional - demo mode if not set)
TWITTER_API_KEY=your_twitter_api_key

# Opinion Trade (optional - mock mode if not set)
OPINION_API_KEY=your_opinion_api_key
OPINION_PRIVATE_KEY=your_wallet_private_key
OPINION_RPC_URL=https://bsc-dataseed.binance.org

# Server configuration
BACKEND_PORT=3001
FRONTEND_URL=http://localhost:3000
# Frontend runtime (override if backend URL differs)
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001

# Demo mode (mock tweets + mock markets/trades, skips Opinion connect)
DEMO_MODE=false
```

4. **Start everything with one command**
```bash
./scripts/start-all.sh
```

This script:
- Checks that `.env` exists (copy `env.example` if needed)
- Installs missing deps (root/backend/frontend + python-trader)
- Honors `DEMO_MODE`:
  - If `DEMO_MODE=true`, skips python-trader/opinion connect and starts only frontend+backend with mocks
  - Otherwise runs all three services via `npm run dev`

Or start services manually if you prefer:
```bash
# Terminal 1: Frontend
cd frontend && npm run dev

# Terminal 2: Backend
cd backend && npm run dev

# Terminal 3: Python Trader
cd python-trader && python main.py
```

5. **Open the app**

Navigate to [http://localhost:3000](http://localhost:3000)

## 🎮 Demo Mode

If you don't have API keys configured, Seer Engine runs in **demo mode**:
- Generates mock tweets every 15 seconds
- Uses mock market data
- Simulates trade executions

This is perfect for testing and demonstrations!

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
Adjust in `backend/src/services/analyzer.ts`:
- Minimum confidence threshold (default: 0.6)
- Maximum trade amount (default: $100)
- Market relevance cutoff (default: 0.3)

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
| Frontend | Next.js 14, React 18, Tailwind CSS, Framer Motion |
| Backend | Node.js, Express, Socket.IO, TypeScript |
| Trading | Python, Opinion CLOB SDK, Web3.py |
| AI | OpenAI GPT-5 Turbo |
| Blockchain | BNB Chain |

## 📁 Project Structure

```
seer-engine/
├── frontend/               # Next.js frontend
│   ├── src/
│   │   ├── app/           # Pages & layouts
│   │   ├── components/    # React components
│   │   ├── hooks/         # Custom hooks
│   │   └── lib/           # Utilities & types
│   └── package.json
├── backend/                # Node.js backend
│   ├── src/
│   │   ├── services/      # Twitter, OpenAI, Opinion
│   │   └── index.ts       # Server entry
│   └── package.json
├── python-trader/          # Python trading service
│   ├── main.py
│   └── requirements.txt
├── .env.example
├── package.json           # Root package (workspaces)
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
