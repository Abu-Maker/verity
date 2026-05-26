// ============================================================
// Verity — Agent Logger
// ============================================================
import * as fs   from 'fs'
import * as path from 'path'

const LOG_DIR  = path.resolve(process.cwd(), '.verity-data', 'agent-logs')
const LOG_FILE = path.join(LOG_DIR, `agent-${new Date().toISOString().split('T')[0]}.jsonl`)
const API_URL  = process.env.VERITY_API_URL  ?? 'http://localhost:3000'
const SECRET   = process.env.INGEST_SECRET   ?? 'dev-ingest-secret'

function ensureDir() {
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true })
}

export type LogLevel = 'info' | 'warn' | 'error' | 'decision' | 'payment'

export interface LogEntry {
  timestamp : number
  level     : LogLevel
  message   : string
  data     ?: unknown
}

const pendingLogs: LogEntry[] = []
let flushTimer: ReturnType<typeof setTimeout> | null = null

function scheduledFlush() {
  if (pendingLogs.length === 0) return
  const batch = pendingLogs.splice(0, pendingLogs.length)
  fetch(`${API_URL}/v1/ingest/agent`, {
    method : 'POST',
    headers: {
      'Content-Type'    : 'application/json',
      'x-ingest-secret' : SECRET,
    },
    body: JSON.stringify({ logs: batch }),
  }).catch(() => {}) // silently fail — logs are best-effort
}

function write(level: LogLevel, message: string, data?: unknown) {
  ensureDir()
  const entry: LogEntry = { timestamp: Date.now(), level, message, data }

  const prefix = {
    info    : '[Agent]',
    warn    : '[Agent ⚠]',
    error   : '[Agent ✗]',
    decision: '[Agent →]',
    payment : '[Agent $]',
  }[level]

  console.log(`${prefix} ${message}`, data !== undefined ? data : '')
  fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n', 'utf-8')

  // Buffer and flush every 2 seconds
  pendingLogs.push(entry)
  if (!flushTimer) {
    flushTimer = setTimeout(() => {
      flushTimer = null
      scheduledFlush()
    }, 2000)
  }
}

export const logger = {
  info    : (msg: string, data?: unknown) => write('info',     msg, data),
  warn    : (msg: string, data?: unknown) => write('warn',     msg, data),
  error   : (msg: string, data?: unknown) => write('error',    msg, data),
  decision: (msg: string, data?: unknown) => write('decision', msg, data),
  payment : (msg: string, data?: unknown) => write('payment',  msg, data),
}