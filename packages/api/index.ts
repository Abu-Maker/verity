// ============================================================
// Verity — API Server Entry Point
// ============================================================

import * as dotenv from 'dotenv'
if (process.env.NODE_ENV !== 'production') {
  dotenv.config()
}

import express      from 'express'
import intelligence from './routes/intelligence'
import health       from './routes/health'
import { requireApiKey } from './middleware/auth'
import { rateLimit }     from './middleware/ratelimit'
import { meterUsage }    from './middleware/meter'

const app : express.Application = express()
const PORT = parseInt(process.env.API_PORT ?? '3000')

// ---- Global middleware -------------------------------------

app.use(express.json())

// ---- Public routes -----------------------------------------

app.use('/health', health)

// ---- Authenticated routes ----------------------------------
// Order matters: auth → rate limit → meter → route handler

app.use('/v1', requireApiKey)
app.use('/v1', rateLimit)
app.use('/v1', meterUsage)

app.use('/v1/intelligence', intelligence)

// ---- 404 ---------------------------------------------------

app.use((_req, res) => {
  res.status(404).json({
    error  : 'not_found',
    message: 'Route does not exist',
  })
})

// ---- Start -------------------------------------------------

app.listen(PORT, () => {
  console.log(`[Verity API] Running on port ${PORT}`)
})

export default app