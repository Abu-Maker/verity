// ============================================================
// Verity — Ingest Route
// POST /v1/ingest
// Called by scanner services to push records into the API.
// Protected by INGEST_SECRET env var (not customer API keys).
// ============================================================
import express, { Router, Request, Response } from 'express'
import { pushRecords } from '../store/memory'
import { ChainId } from '@verity/shared'

const router: Router = Router()

const INGEST_SECRET = process.env.INGEST_SECRET ?? 'dev-ingest-secret'

router.post('/', (req: Request, res: Response) => {
  const secret = req.headers['x-ingest-secret']
  if (secret !== INGEST_SECRET) {
    res.status(401).json({ error: 'unauthorized' })
    return
  }

  const { chainId, records } = req.body
  if (!chainId || !Array.isArray(records)) {
    res.status(400).json({ error: 'invalid_body', message: 'chainId and records[] required' })
    return
  }

  pushRecords(chainId as ChainId, records)
  console.log(`[Verity Ingest] chain=${chainId} pushed ${records.length} records`)

  res.status(200).json({ success: true, received: records.length })
})

export default router