// ============================================================
// Verity — API Server Entry Point
// ============================================================
import * as dotenv from 'dotenv'
if (process.env.NODE_ENV !== 'production') {
  dotenv.config()
}

import express      from 'express'
import cors         from 'cors'
import intelligence from './routes/intelligence'
import health       from './routes/health'
import ingest       from './routes/ingest'
import agentRoute   from './routes/agent'
import { requireApiKey } from './middleware/auth'
import { rateLimit }     from './middleware/ratelimit'
import { meterUsage }    from './middleware/meter'

const app : express.Application = express()
const PORT = parseInt(process.env.API_PORT ?? '3000')

app.use(cors({
  origin: [
    'https://verity-dashboard-ten.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000',
  ],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-api-key', 'x-ingest-secret'],
}))
app.use(express.json())

// ---- Public routes ----------------------------------------
app.use('/health', health)

// ---- Scanner ingest (own secret, not customer keys) -------
app.use('/v1/ingest', ingest)

// ---- Agent log route (public read) ------------------------
app.use('/v1/agent', agentRoute)

// ---- Authenticated routes ---------------------------------
app.use('/v1', requireApiKey)
app.use('/v1', rateLimit)
app.use('/v1', meterUsage)
app.use('/v1/intelligence', intelligence)

// ---- 404 --------------------------------------------------
app.use((_req, res) => {
  res.status(404).json({
    error  : 'not_found',
    message: 'Route does not exist',
  })
})

// ---- Start ------------------------------------------------
app.listen(PORT, () => {
  console.log(`[Verity API] Running on port ${PORT}`)
})

export default app