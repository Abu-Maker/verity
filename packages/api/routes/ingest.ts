// ============================================================
// Verity — Ingest Route
// POST /v1/ingest         — scanner records
// POST /v1/ingest/agent   — agent log entries
// ============================================================
import express, { Router, Request, Response } from 'express'
import { pushRecords } from '../store/memory'
import { pushAgentLog } from './agent'
import { ChainId } from '@verity/shared'

const router: Router = Router()
const INGEST_SECRET = process.env.INGEST_SECRET ?? 'dev-ingest-secret'

function checkSecret(req: Request, res: Response): boolean {
  if (req.headers['x-ingest-secret'] !== INGEST_SECRET) {
    res.status(401).json({ error: 'unauthorized' })
    return false
  }
  return true
}

router.post('/', (req: Request, res: Response) => {
  if (!checkSecret(req, res)) return
  const { chainId, records } = req.body
  if (!chainId || !Array.isArray(records)) {
    res.status(400).json({ error: 'invalid_body', message: 'chainId and records[] required' })
    return
  }
  pushRecords(chainId as ChainId, records)
  console.log(`[Verity Ingest] chain=${chainId} pushed ${records.length} records`)
  res.status(200).json({ success: true, received: records.length })
})

router.post('/agent', (req: Request, res: Response) => {
  if (!checkSecret(req, res)) return
  const { logs } = req.body
  if (!Array.isArray(logs)) {
    res.status(400).json({ error: 'invalid_body', message: 'logs[] required' })
    return
  }
  logs.forEach(pushAgentLog)
  res.status(200).json({ success: true, received: logs.length })
})

export default router