// ============================================================
// Verity — Scanner State Storage
// Tracks the last scanned block per chain so the worker
// can resume after a restart without rescanning old blocks.
// Phase 1: file-based. Phase 2: swap for Redis/Postgres.
// ============================================================

import * as fs   from 'fs'
import * as path from 'path'
import { ChainId, IntelligenceRecord } from '@verity/shared'

// ---- Paths -------------------------------------------------

const DATA_DIR   = path.resolve(process.cwd(), '.verity-data')
const STATE_FILE = path.join(DATA_DIR, 'scanner-state.json')
const RECORDS_DIR= path.join(DATA_DIR, 'records')

// ---- Bootstrap ---------------------------------------------

function ensureDirs() {
  if (!fs.existsSync(DATA_DIR))    fs.mkdirSync(DATA_DIR,    { recursive: true })
  if (!fs.existsSync(RECORDS_DIR)) fs.mkdirSync(RECORDS_DIR, { recursive: true })
}

// ---- State -------------------------------------------------

type ScannerState = Record<string, number>

function readState(): ScannerState {
  ensureDirs()
  if (!fs.existsSync(STATE_FILE)) return {}
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'))
  } catch {
    return {}
  }
}

function writeState(state: ScannerState): void {
  ensureDirs()
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8')
}

export async function getLastScannedBlock(
  chainId: ChainId
): Promise<number | null> {
  const state = readState()
  return state[String(chainId)] ?? null
}

export async function setLastScannedBlock(
  chainId    : ChainId,
  blockNumber: number
): Promise<void> {
  const state = readState()
  state[String(chainId)] = blockNumber
  writeState(state)
}

// ---- Records -----------------------------------------------

export async function saveRecords(
  records: IntelligenceRecord[]
): Promise<void> {
  if (records.length === 0) return
  ensureDirs()

  const chainId  = records[0].chainId
  const date     = new Date().toISOString().split('T')[0]
  const filename = path.join(RECORDS_DIR, `${chainId}-${date}.jsonl`)

  const lines = records
    .map(r => JSON.stringify(r, bigIntReplacer))
    .join('\n') + '\n'

  fs.appendFileSync(filename, lines, 'utf-8')
}

export async function loadRecords(
  chainId: ChainId,
  date   : string
): Promise<IntelligenceRecord[]> {
  ensureDirs()
  const filename = path.join(RECORDS_DIR, `${chainId}-${date}.jsonl`)
  if (!fs.existsSync(filename)) return []

  return fs.readFileSync(filename, 'utf-8')
    .split('\n')
    .filter(Boolean)
    .map((line: string) => JSON.parse(line, bigIntReviver))
}

// ---- BigInt helpers ----------------------------------------

function bigIntReplacer(_key: string, value: unknown): unknown {
  return typeof value === 'bigint' ? value.toString() + 'n' : value
}

function bigIntReviver(_key: string, value: unknown): unknown {
  if (typeof value === 'string' && /^\d+n$/.test(value)) {
    return BigInt(value.slice(0, -1))
  }
  return value
}