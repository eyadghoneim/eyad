# ⚡ NexusQuant Terminal — Autonomous Multi-Asset Quantitative Trading Engine

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.0-61dafb.svg?logo=react)](https://react.dev/)
[![Express](https://img.shields.io/badge/Express-4.21-lightgrey.svg?logo=express)](https://expressjs.com/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38bdf8.svg?logo=tailwindcss)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://img.shields.io/badge/Tests-51%2F51%20Passed-emerald.svg)]()

An institutional-grade, full-stack quantitative trading terminal and deterministic execution daemon for digital assets (**BTC, ETH, PAXG, SOL**). Built with mathematical rigor, combining **Smart Money Concepts (SMC)**, **Multi-Timeframe Trend Confirmation (4H MTF)**, **Elliott Wave Fractals**, **Derivatives Sentiment (Funding Rates & Open Interest)**, and **Multi-Layer Capital Preservation Guards**.

---

## 🏛️ System Architecture

NexusQuant operates on a decoupled client-server architecture with strict **Mathematical Parity**:

```
 ┌──────────────────────────────────────────────────────────────┐
 │                     NexusQuant Terminal UI                   │
 │       (React 19 + TypeScript + Tailwind CSS v4 + Recharts)    │
 └──────────────────────────────┬───────────────────────────────┘
                                │ WebSocket / REST Polling
 ┌──────────────────────────────▼───────────────────────────────┐
 │                   Express Daemon Engine                      │
 │    - Market Ingestion (Binance REST/WS + Coinbase + CoinGecko)│
 │    - Multi-Timeframe Confluence Engine (1H Signal + 4H Trend) │
 │    - Smart Money Concepts (FVG, Order Blocks, Liquidity Sweeps)│
 │    - Derivatives Regime Gateway (Binance Futures Funding Rate)│
 │    - Config Checksum & Single Source of Truth Invariant Guard │
 └──────────────┬───────────────────────────────┬───────────────┘
                │                               │
 ┌──────────────▼──────────────┐ ┌──────────────▼───────────────┐
 │  Persistence & Deduplication │ │   Automated Alert Dispatch   │
 │   - SQLite WAL / Firestore   │ │   - Telegram Bot API Alerts │
 │   - Paper Trading Simulator │ │   - Daily & Weekly AI Audits│
 └─────────────────────────────┘ └─────────────────────────────┘
```

---

## 🌟 Key Features

### 1. 🛡️ 4-Tier Confluence & Quantitative Hard Gates
- **MTF Macro Trend Guard**: Blocks all counter-trend entries if the 4-hour timeframe is in a macro downtrend (`HTF_BLOCKED`).
- **Chop & Consolidation Gate**: Uses Average Directional Index (ADX < 18) to strictly avoid range-bound whipsaws (`CHOP_BLOCKED`).
- **Derivatives Liquidity Filter**: Penalizes signals and aborts long breakouts when perpetual funding rates are overheated (`OVERHEATED_LONGS`).
- **Relative Volume (RVOL) Confirmation**: Rejects low-volume fakeout breakouts.

### 2. 🎯 Institutional Smart Money Concepts (SMC)
- Identifies **Fair Value Gaps (FVG)**, **Order Blocks (OB)**, and **Change of Character (CHoCH)**.
- Premium vs. Discount institutional equilibrium calculation.

### 3. 📐 Mathematical Risk Engine (ATR Dynamic Targets)
- Stop Loss: $2.0 \times \text{ATR}$
- Take Profit 1: $2.5 \times \text{ATR}$ (triggers automatic break-even trailing stop)
- Take Profit 2: $4.0 \times \text{ATR}$ (enforces minimum $R:R \ge 2.00$ mathematically)
- Take Profit 3: $5.5 \times \text{ATR}$ (runner target for strong trend expansions)

### 4. 🤖 Autonomous Daemon & Paper Trading Simulator
- Automated background market scanning every 60 seconds.
- Deduplication and cooldown engine to eliminate alert spam.
- Real-time mark-to-market PnL tracking with slippage and spread filtering.
- Simulated broker execution supporting position tranches (60% / 40%).

### 5. 🔍 Single Source of Truth & Static Guard Verification
- Runtime 12-character cryptographic **Config Checksum** ensures server and client never desynchronize.
- 51 automated regression and mathematical unit tests verifying core algorithms and invariants.

---

## 🚀 Quick Start (Local Setup)

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### Installation & Run

```bash
# 1. Clone the repository
git clone https://github.com/eyadghoneim/nexusquant.git
cd nexusquant

# 2. Install dependencies
npm install

# 3. Start development server (serves on port 3000)
npm run dev
```

Visit **`http://localhost:3000`** in your browser.

---

## ⚙️ Environment Configuration

Create a `.env` file in the root directory:

```env
# Gemini AI API Key for Voice Assistant & Audit Summaries
GEMINI_API_KEY=your_gemini_api_key

# Telegram Bot Integration (Optional for live alerts)
TELEGRAM_BOT_TOKEN=your_bot_token_from_botfather
TELEGRAM_CHAT_ID=your_telegram_chat_or_channel_id

# Admin Security Token (Secures /api/bot/* endpoints)
BOT_ADMIN_TOKEN=your_random_secure_token

# Public Application URL
APP_URL=http://localhost:3000
```

---

## 🧪 Running Automated Tests

NexusQuant includes a comprehensive quantitative test suite:

```bash
# Run all 51 quantitative invariant and behavioral tests
npm test

# Run TypeScript type safety and linting checks
npm run lint

# Build full-stack production bundle
npm run build
```

---

## 🔒 Security & Data Integrity
- **No API keys or Telegram tokens are exposed to the client browser**.
- Admin endpoints require constant-time hashed token authentication (`timingSafeEqual`).
- Firestore security rules default to strict server-authoritative read/write validation.

---

## ⚠️ Research & Simulation Disclaimer
*NexusQuant is developed for research, quantitative backtesting, and algorithmic simulation purposes. Historical backtesting performance and paper trading results do not guarantee future live market profitability. Cryptocurrency trading carries substantial market risk. Always practice sound risk management.*

---

## 📄 License
This project is licensed under the [MIT License](LICENSE).
