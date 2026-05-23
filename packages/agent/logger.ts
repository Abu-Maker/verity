// ============================================================
// Verity — Agent Logger
// Structured logging for all agent activity.
// Every decision, payment, and error gets recorded.
// ============================================================

import * as fs   from 'fs'
import * as path from 'path'

const LOG_DIR  = path.resolve(process.cwd(), '.verity-data', 'agent-logs')
const LOG_FILE = path.join(LOG_DIR, `agent-${new Date().toISOString().split('T')[0]}.jsonl`)

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

function write(level: LogLevel, message: string, data?: unknown) {
  ensureDir()

  const entry: LogEntry = {
    timestamp : Date.now(),
    level,
    message,
    data,
  }

  // Console output
  const prefix = {
    info     : '[Agent]',
    warn     : '[Agent ⚠]',
    error    : '[Agent ✗]',
    decision : '[Agent →]',
    payment  : '[Agent $]',
  }[level]

  console.log(`${prefix} ${message}`, data !== undefined ? data : '')

  // File output
  fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n', 'utf-8')
}

export const logger = {
  info    : (msg: string, data?: unknown) => write('info',     msg, data),
  warn    : (msg: string, data?: unknown) => write('warn',     msg, data),
  error   : (msg: string, data?: unknown) => write('error',    msg, data),
  decision: (msg: string, data?: unknown) => write('decision', msg, data),
  payment : (msg: string, data?: unknown) => write('payment',  msg, data),
}