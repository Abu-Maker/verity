// ============================================================
// Verity — API Server Entry Point
// ============================================================

import * as dotenv from 'dotenv'
dotenv.config()

import express      from 'express'
import intelligence from './routes/intelligence'

const app: express.Application = express()
const PORT = parseInt(process.env.API_PORT ?? '3000')

// ---- Middleware --------------------------------------------

app.use(express.json())

// ---- Routes ------------------------------------------------

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'verity-api', timestamp: Date.now() })
})

app.use('/v1/intelligence', intelligence)

// ---- 404 ---------------------------------------------------

app.use((_req, res) => {
  res.status(404).json({ error: 'not_found', message: 'Route does not exist' })
})

// ---- Start -------------------------------------------------

app.listen(PORT, () => {
  console.log(`[Verity API] Running on port ${PORT}`)
})

export default app