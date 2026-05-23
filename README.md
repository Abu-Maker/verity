# Verity

Real-time onchain intelligence infrastructure. Scans every live block across
Ethereum, Base, and Arbitrum — detects failing transactions, classifies contract
behavior, and exposes that intelligence through a pay-per-query API.

An autonomous agent runs every 5 minutes, makes decisions, and pays for
intelligence using USDC from its own Circle Developer Wallet.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                        Verity                           │
│                                                         │
│  ┌──────────────┐   ┌──────────────┐   ┌────────────┐  │
│  │   Scanner    │   │     API      │   │   Agent    │  │
│  │  (Railway)   │   │  (Railway)   │   │ (Railway)  │  │
│  │              │   │              │   │            │  │
│  │ EVM Adapter  │──▶│ Intelligence │◀──│   Brain    │  │
│  │ per chain    │   │ Route        │   │ Decision   │  │
│  │              │   │              │   │ Loop       │  │
│  │ Ethereum     │   │ Auth         │   │            │  │
│  │ Base         │   │ Rate Limit   │   │ Circle     │  │
│  │ Arbitrum     │   │ Metering     │   │ Wallet     │  │
│  └──────┬───────┘   └──────────────┘   └────────────┘  │
│         │                                               │
│         ▼                                               │
│  ┌──────────────┐                                       │
│  │ Shared Types │                                       │
│  │ + Schema     │                                       │
│  └──────────────┘                                       │
└─────────────────────────────────────────────────────────┘
```

## Packages

| Package | Location | Purpose |
|---|---|---|
| `shared` | `packages/shared` | Types, Zod schemas, shared across all packages |
| `scanner` | `packages/scanner` | EVM chain adapter, block scanner worker, state storage |
| `api` | `packages/api` | Express API server, auth, rate limiting, metering |
| `agent` | `packages/agent` | Autonomous agent, Circle wallet, decision logic |

---

## Getting Started

### Prerequisites

- Node.js v18+
- pnpm v11+
- A Circle developer account
- RPC URLs for Ethereum, Base, Arbitrum (Alchemy or Infura)

### Install

```bash
git clone https://github.com/Abu-Maker/verity.git
cd verity
pnpm install
```

### Configure

```bash
cp .env.example .env
```

Fill in all values in `.env`:

```
# Chain RPCs — get from Alchemy or Infura
ETH_RPC_URL=
BASE_RPC_URL=
ARBITRUM_RPC_URL=

# Circle — from console.circle.com
CIRCLE_API_KEY=
CIRCLE_ENTITY_SECRET=
CIRCLE_WALLET_SET_ID=
CIRCLE_WALLET_ID=
CIRCLE_USDC_TOKEN_ID=

# Agent
VERITY_PAYMENT_ADDRESS=
VERITY_API_URL=http://localhost:3000
AGENT_API_KEY=vrt_pro_test_key_32chars_xxxxxxxxx
AGENT_INTERVAL=300000

# API
API_PORT=3000
API_SECRET=
```

---

## Running Locally

Open three terminals.

**Terminal 1 — API server:**
```bash
npx ts-node packages/api/index.ts
```

**Terminal 2 — Ethereum scanner:**
```bash
CHAIN_ID=1 npx ts-node packages/scanner/worker.ts
```

**Terminal 3 — Agent:**
```bash
npx ts-node packages/agent/agent.ts
```

---

## API Reference

### Authentication

Every request requires an API key via header:
```
x-api-key: your_key_here
```

### Endpoints

#### `GET /health`
Returns live status of the API and all configured chains. No auth required.

```json
{
  "status": "healthy",
  "service": "verity-api",
  "chains": [
    { "name": "ethereum", "status": "healthy", "latencyMs": 120, "blockNumber": 19000000 },
    { "name": "base",     "status": "healthy", "latencyMs": 80,  "blockNumber": 12000000 },
    { "name": "arbitrum", "status": "healthy", "latencyMs": 60,  "blockNumber": 180000000 }
  ]
}
```

#### `GET /v1/intelligence`
Query classified transaction intelligence.

**Query params:**
| Param | Type | Description |
|---|---|---|
| `chainId` | number | 1, 8453, or 42161 |
| `status` | string | `success`, `failed`, `reverted` |
| `contractClass` | string | `dex`, `lending`, `bridge`, `nft` |
| `riskLevel` | string | `low`, `medium`, `high`, `critical` |
| `fromBlock` | number | Filter by block range |
| `toBlock` | number | Filter by block range |
| `limit` | number | Max 500, default 50 |
| `offset` | number | Pagination offset |

**Example:**
```bash
curl https://api.verity.xyz/v1/intelligence \
  -H "x-api-key: your_key" \
  -G -d "chainId=1&riskLevel=high&limit=10"
```

#### `GET /v1/intelligence/:txHash`
Get intelligence record for a specific transaction.

---

## Pricing

| Tier | Price | Queries/month | Chains |
|---|---|---|---|
| Free | $0 | 50 | Ethereum |
| Builder | $35/mo | 500 | Ethereum, Base, Arbitrum |
| Pro | $75/mo | 1,000 | All Tier 1 |
| Enterprise | Custom | Unlimited | All + custom |

Autonomous agents can also pay per query via USDC — $0.002/query,
no monthly commitment required.

---

## Deployment

Each service deploys independently on Railway.
Config files live in `infra/railway/`.

| Service | Config | Env vars needed |
|---|---|---|
| Ethereum scanner | `ethereum.worker.toml` | `ETH_RPC_URL` |
| Base scanner | `base.worker.toml` | `BASE_RPC_URL` |
| Arbitrum scanner | `arbitrum.worker.toml` | `ARBITRUM_RPC_URL` |
| API server | `api.toml` | `API_PORT`, `API_SECRET` |
| Agent | `agent.toml` | All Circle vars, `AGENT_API_KEY` |

---

## Circle Wallet Setup

Run once to register your entity secret and create the agent wallet:

```bash
node scripts/setupCircle.js
```

Copy the output values into your `.env`.

---

## Forked From

ArcSense Lite — real-time intelligence infrastructure on Arc Testnet.
`github.com/2TheMooM/arcsense-lite`

Verity generalises the architecture beyond Arc Testnet into a
commercial, multi-chain product.

---

## Built By

Abu & [brother's name] — 2026