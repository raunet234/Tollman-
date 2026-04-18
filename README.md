# TOLLMAN

**Test your x402 paid API in one click. Watch a real agent pay it live.**

TOLLMAN is a developer testing tool for x402 paid APIs on the Stellar network. Think Postman/Insomnia, but purpose-built for x402: paste an endpoint, and a real AI agent with a Stellar testnet wallet automatically hits it, pays the 402, and you watch everything happen live in your browser.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    TOLLMAN                          │
│                                                     │
│  ┌──────────────┐        ┌───────────────────────┐  │
│  │   Frontend   │        │       Backend         │  │
│  │  React/Vite  │◄──────►│  Express + Socket.io  │  │
│  │  Port 5173   │        │     Port 3001         │  │
│  └──────────────┘        └──────────┬────────────┘  │
│                                     │               │
│                          ┌──────────▼────────────┐  │
│                          │     Agent Runner      │  │
│                          │  @stellar/stellar-sdk │  │
│                          │  Stellar Testnet      │  │
│                          └───────────────────────┘  │
└─────────────────────────────────────────────────────┘

Flow:
1. User pastes x402 URL → clicks Run
2. Backend hits endpoint → receives 402 + X-Payment-Details
3. Agent signs + submits USDC payment on Stellar testnet
4. Agent retries with X-Payment-Receipt
5. Frontend streams every step live via Socket.io
```

---

## Setup

### Prerequisites
- Node.js 18+
- A Stellar testnet keypair (or let TOLLMAN generate one on first run)

### Install

```bash
# Backend
cd backend && npm install

# Frontend
cd frontend && npm install
```

### Configure environment

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` and set `AGENT_SECRET_KEY`. If left blank, TOLLMAN generates a new keypair on startup and prints it to the console — copy the secret key into `.env` before the next run.

### Fund the agent wallet

1. Get the agent's public key from the console output or the wallet card in the UI
2. Fund with XLM via Friendbot: `https://friendbot.stellar.org/?addr=<PUBLIC_KEY>`
3. Fund with testnet USDC via [Stellar Lab](https://lab.stellar.org) or use the "Fund ↗" link in the wallet card

The agent needs ~1 XLM for fees and USDC to pay x402 endpoints.

### Run

```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend && npm run dev
```

Open `http://localhost:5173`

---

## Testing your x402 API

1. Open TOLLMAN at `http://localhost:5173`
2. Paste your x402 endpoint URL
3. Select HTTP method (GET / POST / PUT)
4. Optionally add headers or request body
5. Click **Run Test**
6. Watch the event timeline — every step streams live including the Stellar tx hash

Your x402 endpoint must:
- Return `HTTP 402` with header `X-Payment-Details: <base64 JSON>` when no receipt is present
- Accept `X-Payment-Receipt: <base64 JSON>` on retry

---

## Built-in demo endpoints

No external x402 API needed:

```
GET http://localhost:3001/demo/ping
GET http://localhost:3001/demo/echo?text=hello
```

Both require 0.001 USDC payment before responding. Use these to test TOLLMAN itself.

---

## x402 payment details format

```json
{
  "scheme": "exact",
  "network": "stellar-testnet",
  "maxAmountRequired": "0.001",
  "resource": "/your/endpoint",
  "description": "Payment for API access",
  "mimeType": "application/json",
  "payTo": "G...",
  "requiredDeadlineSeconds": 60
}
```

Receipt sent on retry:
```json
{
  "txHash": "abc123...",
  "network": "stellar-testnet",
  "from": "G...",
  "to": "G...",
  "amount": "0.001",
  "asset": "USDC:GBBD47..."
}
```

---

## Demo

> GIF placeholder — record a demo showing a live x402 payment flowing through the event timeline

---

## License

MIT
