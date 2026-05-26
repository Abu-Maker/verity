// ============================================================
// Verity — Agent Log Store + Route
// GET /v1/agent/logs
// ============================================================
import express, { Router, Request, Response } from 'express'

const router: Router = Router()

export interface AgentLogEntry {
  timestamp : number
  level     : string
  message   : string
  data     ?: unknown
}

// In-memory log ring buffer — last 200 entries
const logBuffer: AgentLogEntry[] = []
const MAX_LOGS = 200

export function pushAgentLog(entry: AgentLogEntry): void {
  logBuffer.push(entry)
  if (logBuffer.length > MAX_LOGS) {
    logBuffer.splice(0, logBuffer.length - MAX_LOGS)
  }
}

router.get('/logs', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    logs   : [...logBuffer].reverse(), // newest first
  })
})

export default router