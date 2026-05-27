// ============================================================
// Verity — Agent Log Store + Route
// ============================================================
import { Router, Request, Response } from 'express'

const router: ReturnType<typeof Router> = Router()

export interface AgentLogEntry {
  timestamp : number
  level     : string
  message   : string
  data     ?: unknown
}

const logBuffer: AgentLogEntry[] = []
const MAX_LOGS = 200

let totalCycles   = 0
let totalUsdcSpent = 0

export function pushAgentLog(entry: AgentLogEntry): void {
  logBuffer.push(entry)
  if (logBuffer.length > MAX_LOGS) {
    logBuffer.splice(0, logBuffer.length - MAX_LOGS)
  }
  // Track cycles and spend
  if (entry.message.includes('Agent tick complete')) totalCycles++
  if (entry.level === 'payment' && entry.message.includes('Payment successful')) {
    totalUsdcSpent += 0.002
  }
}

router.get('/logs', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    logs   : [...logBuffer].reverse(),
  })
})

router.get('/status', (_req: Request, res: Response) => {
  res.status(200).json({
    success       : true,
    isRunning     : true,
    totalCycles,
    totalUsdcSpent: parseFloat(totalUsdcSpent.toFixed(4)),
    logCount      : logBuffer.length,
  })
})

export default router