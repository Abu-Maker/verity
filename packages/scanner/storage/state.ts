// ============================================================
// Verity — Scanner State Storage
// Tracks the last scanned block per chain so the worker
// can resume after a restart without rescanning old blocks.
// Phase 1: file-based + API push. Phase 2: swap for Redis/Postgres.
// ============================================================

import * as fs   from 'fs'
import * as path from 'path'
import { ChainId, IntelligenceRecord } from '@verity/shared'

// ---- Paths -------------------------------------------------

const DATA_DIR    = path.resolve(process.cwd(), '.verity-data')
const STATE_FILE  = path.join(DATA_DIR, 'scanner-state.json')
const RECORDS_DIR = path.join(DATA_DIR, 'records')

// ---- Bootstrap ---------------------------------------------

function ensureDirs() {
  if (!fs.existsSync(DATA_DIR))    fs.mkdirSync(DATA_DIR,    { recursive: true })
  if (!fs.existsSync(RECORDS_DIR)) fs.mkdirSync(RECORDS_DIR, { recursive: true })
}

// ---- Block state -------------------------------------------

export function getLastScannedBlock(chainId: ChainId): number | null {
  try {
    ensureDirs()
    if (!fs.existsSync(STATE_FILE)) return null
    const raw   = fs.readFileSync(STATE_FILE, 'utf-8')
    const state = JSON.parse(raw)
    return state[chainId] ?? null
  } catch {
    return null
  }
}

export function saveLastScannedBlock(chainId: ChainId, blockNumber: number): void {
  try {
    ensureDirs()
    let state: Record<string, number> = {}
    if (fs.existsSync(STATE_FILE)) {
      state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'))
    }
    state[chainId] = blockNumber
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2))
  } catch (err) {
    console.error('[Verity State] Failed to save block state:', err)
  }
}

// ---- Record storage ----------------------------------------

export function saveRecords(chainId: ChainId, records: IntelligenceRecord[]): void {
  try {
    ensureDirs()
    const today    = new Date().toISOString().split('T')[0]
    const filePath = path.join(RECORDS_DIR, `${chainId}-${today}.json`)
    let existing: IntelligenceRecord[] = []
    if (fs.existsSync(filePath)) {
      existing = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    }
    existing.push(...records)
    fs.writeFileSync(filePath, JSON.stringify(existing))
    // Push to API after saving locally
    pushToApi(chainId, records).catch(err =>
      console.error('[Verity State] pushToApi error:', err)
    )
  } catch (err) {
    console.error('[Verity State] Failed to save records:', err)
  }
}

export function loadRecords(chainId: ChainId, date: string): IntelligenceRecord[] {
  try {
    ensureDirs()
    const filePath = path.join(RECORDS_DIR, `${chainId}-${date}.json`)
    if (!fs.existsSync(filePath)) return []
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  } catch {
    return []
  }
}

// ---- API push ----------------------------------------------

export async function pushToApi(chainId: ChainId, records: IntelligenceRecord[]): Promise<void> {
  const apiUrl = process.env.VERITY_API_URL
  const secret = process.env.INGEST_SECRET ?? 'dev-ingest-secret'

  console.log(`[Verity State] pushToApi called — apiUrl=${apiUrl} chainId=${chainId} records=${records.length}`)

  if (!apiUrl) {
    console.warn('[Verity State] VERITY_API_URL not set, skipping push')
    return
  }

  try {
    const res = await fetch(`${apiUrl}/v1/ingest`, {
      method : 'POST',
      headers: {
        'Content-Type'    : 'application/json',
        'x-ingest-secret' : secret,
      },
      body: JSON.stringify({ chainId, records }),
    })
    const text = await res.text()
    console.log(`[Verity State] ingest response: ${res.status} ${text}`)
  } catch (err) {
    console.error('[Verity State] ingest push error:', err)
  }
}