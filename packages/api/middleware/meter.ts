// ============================================================
// Verity — Usage Metering Middleware
// Records every API query as a billing event.
// Phase 1: file-based event log.
// Phase 2: stream to Stripe or a billing DB.
// ============================================================

import { Request, Response, NextFunction } from 'express'
import * as fs   from 'fs'
import * as path from 'path'
import { UsageEvent } from '@verity/shared'
import { ChainId }    from '@verity/shared'

// ---- Storage -----------------------------------------------

const METER_DIR  = path.resolve(process.cwd(), '.verity-data', 'meter')
const METER_FILE = path.join(
  METER_DIR,
  `usage-${new Date().toISOString().split('T')[0]}.jsonl`
)

function ensureDir() {
  if (!fs.existsSync(METER_DIR)) fs.mkdirSync(METER_DIR, { recursive: true })
}

function writeEvent(event: UsageEvent) {
  ensureDir()
  fs.appendFileSync(METER_FILE, JSON.stringify(event) + '\n', 'utf-8')
}

// ---- Middleware ---------------------------------------------

export function meterUsage(
  req : Request,
  res : Response,
  next: NextFunction
): void {
  const startedAt = Date.now()

  // Hook into response finish to capture response time
  res.on('finish', () => {
    const apiKey = req.apiKey
    if (!apiKey) return

    const chainId = req.query.chainId
      ? parseInt(req.query.chainId as string) as ChainId
      : apiKey.chains[0]

    const event: UsageEvent = {
      apiKey     : apiKey.key,
      endpoint   : req.path,
      chainId,
      timestamp  : startedAt,
      responseMs : Date.now() - startedAt,
    }

    writeEvent(event)
  })

  next()
}

// ---- Read usage events (for dashboard/billing) -------------

export function readUsageEvents(
  apiKey: string,
  date  : string   // YYYY-MM-DD
): UsageEvent[] {
  ensureDir()
  const file = path.join(METER_DIR, `usage-${date}.jsonl`)
  if (!fs.existsSync(file)) return []

  return fs.readFileSync(file, 'utf-8')
    .split('\n')
    .filter(Boolean)
    .map((line: string) => JSON.parse(line))
    .filter((e: UsageEvent) => e.apiKey === apiKey)
}