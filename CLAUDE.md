# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

TOLLMAN — a developer testing tool for x402 paid APIs on the Stellar testnet. Think Postman but purpose-built for x402: the agent automatically pays 402-gated endpoints using a real Stellar testnet wallet.

## Stack

- **Backend:** Node.js + Express + TypeScript, `@stellar/stellar-sdk`, Socket.io, axios
- **Frontend:** React + Vite + TypeScript, Tailwind CSS, socket.io-client

## Commands

```bash
# Backend (from backend/)
npm run dev       # nodemon + ts-node (watches src/)
npm run build     # tsc → dist/
npm start         # run compiled dist/server.js

# Frontend (from frontend/)
npm run dev       # Vite dev server on port 5173
npm run build     # production build
npm run preview   # preview production build
```

Both must run simultaneously for the app to work.

## Architecture

```
backend/src/
  server.ts           — Express + Socket.io setup, mounts all routes
  agent/
    wallet.ts         — Stellar keypair load/generate, balance, sendPayment(), ensureTrustline()
    runner.ts         — Core x402 agent: hits endpoint → parses 402 → pays → retries → emits Socket.io events
  routes/
    test.ts           — POST /api/test (start run), GET /api/status/:runId
    wallet.ts         — GET /api/wallet
  demo/
    service.ts        — Demo x402 endpoints: GET /demo/ping, GET /demo/echo

frontend/src/
  App.tsx             — Layout shell, Socket.io connection, run orchestration
  components/
    RequestPanel.tsx  — URL input, method selector, headers/body editors, Run button
    EventTimeline.tsx — Live Socket.io event stream display
    ResponseViewer.tsx — Final response body, headers, tx hash
    WalletCard.tsx    — Agent public key, balances, Friendbot link
  types.ts            — Shared TypeScript types (RunEvent, WalletInfo, etc.)
```

## Key design decisions

- **No database** — runs are in-memory Maps keyed by `runId` (UUID)
- **Socket.io namespace** `/run-events` — client calls `socket.emit('join', runId)` after getting runId from POST /api/test
- **x402 payment** is implemented manually with `@stellar/stellar-sdk` classic USDC payment operation (not Soroban)
- **USDC asset** on testnet: code=`USDC`, issuer=`GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`
- Testnet Horizon: `https://horizon-testnet.stellar.org`
- **Demo service** generates a fresh keypair per server restart to receive payments — it does lightweight receipt validation (structure check only, not on-chain verify)

## Environment

Copy `backend/.env.example` to `backend/.env`. Key var:
- `AGENT_SECRET_KEY` — Stellar testnet secret key. If blank, a new keypair is generated and printed on startup.

## Event schema (Socket.io)

Each event: `{ runId, step, status, message, data, timestamp }`

Steps in order: `INIT` → `REQUEST_SENT` → `GOT_402` → `PAYMENT_CONSTRUCTED` → `PAYMENT_SUBMITTED` → `PAYMENT_CONFIRMED` → `RETRY_SENT` → `SUCCESS` | `ERROR`
