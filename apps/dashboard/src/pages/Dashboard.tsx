// ============================================================
// Verity — Dashboard Page
// ============================================================

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import ApiKeyCard       from '../components/ApiKeyCard'
import UsageBar         from '../components/UsageBar'
import ChainStatus      from '../components/ChainStatus'
import IntelligenceFeed from '../components/IntelligenceFeed'

const SESSION_KEY = 'verity_entered'
const API_URL = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:3000'

export interface HealthData {
  status    : string
  chains    : {
    name       : string
    chainId    : number
    status     : string
    latencyMs  : number
    blockNumber?: number
  }[]
}

export interface IntelligenceRecord {
  id            : string
  chainId       : number
  chainName     : string
  blockNumber   : number
  txHash        : string
  from          : string
  to            : string | null
  status        : string
  failureReason : string | null
  contractClass : string
  riskSignals   : { level: string; reason: string; confidence: number }[]
  timestamp     : number
}

export default function Dashboard() {
  const navigate = useNavigate()
  const apiKey   = sessionStorage.getItem('verity_api_key') ?? ''

  const [health, setHealth]     = useState<HealthData | null>(null)
  const [records, setRecords]   = useState<IntelligenceRecord[]>([])
  const [usage, setUsage]       = useState({ used: 0, limit: 50, tier: 'free' })
  const [loading, setLoading]   = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  function goHome() {
    sessionStorage.removeItem(SESSION_KEY)
    sessionStorage.removeItem('verity_api_key')
    navigate('/')
  }

  const fetchHealth = useCallback(async () => {
    try {
      const res  = await fetch(`${API_URL}/health`)
      const data = await res.json()
      setHealth(data)
    } catch {
      setHealth(null)
    }
  }, [])

  const fetchIntelligence = useCallback(async () => {
    try {
      const res  = await fetch(`${API_URL}/v1/intelligence?limit=20`, {
        headers: { 'x-api-key': apiKey },
      })
      const data = await res.json()
      if (data.success) {
        setRecords(data.data ?? [])
        setUsage({
          used  : data.meta?.usage?.used  ?? 0,
          limit : data.meta?.usage?.limit ?? 50,
          tier  : data.meta?.tier         ?? 'free',
        })
      }
    } catch {
      // API may not be running locally — show empty state
    }
  }, [apiKey])

  async function refresh() {
    setLoading(true)
    await Promise.all([fetchHealth(), fetchIntelligence()])
    setLastRefresh(new Date())
    setLoading(false)
  }

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, 30_000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div style={styles.root}>

      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <div style={styles.sidebarTop}>
          <span style={styles.logo}>VERITY</span>
          <div style={styles.sidebarDivider} />
          <nav style={styles.nav}>
            {[
              { icon: '◈', label: 'Intelligence' },
              { icon: '⬡', label: 'Chains' },
              { icon: '◉', label: 'Usage' },
              { icon: '⊞', label: 'API Key' },
            ].map(item => (
              <div key={item.label} style={styles.navItem}>
                <span style={styles.navIcon}>{item.icon}</span>
                <span style={styles.navLabel}>{item.label}</span>
              </div>
            ))}
          </nav>
        </div>

        <div style={styles.sidebarBottom}>
          <div style={styles.versionBadge}>
            <span style={styles.dot} />
            Live
          </div>
          <button onClick={goHome} style={styles.backBtn}>
            ← Back Home
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={styles.main}>

        {/* Header */}
        <div style={styles.header}>
          <div>
            <h1 style={styles.pageTitle}>Intelligence Feed</h1>
            <p style={styles.pageSubtitle}>
              Last updated {lastRefresh.toLocaleTimeString()}
            </p>
          </div>
          <button
            onClick={refresh}
            disabled={loading}
            style={styles.refreshBtn}
          >
            {loading ? '⟳ Syncing...' : '⟳ Refresh'}
          </button>
        </div>

        {/* Top row */}
        <div style={styles.topRow}>
          <ApiKeyCard apiKey={apiKey} tier={usage.tier} />
          <UsageBar used={usage.used} limit={usage.limit} tier={usage.tier} />
        </div>

        {/* Chain status */}
        <ChainStatus health={health} loading={loading} />

        {/* Intelligence feed */}
        <IntelligenceFeed records={records} loading={loading} />

      </main>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    display         : 'flex',
    minHeight       : '100vh',
    background      : '#050805',
  },
  sidebar: {
    width           : '220px',
    flexShrink      : 0,
    background      : '#0d140d',
    borderRight     : '1px solid #1e2e1e',
    display         : 'flex',
    flexDirection   : 'column',
    justifyContent  : 'space-between',
    padding         : '28px 0',
    position        : 'sticky' as const,
    top             : 0,
    height          : '100vh',
  },
  sidebarTop: {
    display         : 'flex',
    flexDirection   : 'column',
  },
  logo: {
    fontFamily      : "'Space Mono', monospace",
    fontSize        : '16px',
    fontWeight      : 700,
    color           : '#a3e635',
    letterSpacing   : '0.2em',
    padding         : '0 24px',
    marginBottom    : '28px',
  },
  sidebarDivider: {
    height          : '1px',
    background      : '#1e2e1e',
    marginBottom    : '24px',
  },
  nav: {
    display         : 'flex',
    flexDirection   : 'column',
    gap             : '4px',
    padding         : '0 12px',
  },
  navItem: {
    display         : 'flex',
    alignItems      : 'center',
    gap             : '12px',
    padding         : '10px 12px',
    borderRadius    : '6px',
    cursor          : 'pointer',
    transition      : 'background 0.15s',
  },
  navIcon: {
    color           : '#a3e635',
    fontSize        : '16px',
  },
  navLabel: {
    fontFamily      : "'Syne', sans-serif",
    fontSize        : '14px',
    color           : '#7a8a7a',
    fontWeight      : 500,
  },
  sidebarBottom: {
    padding         : '0 16px',
    display         : 'flex',
    flexDirection   : 'column',
    gap             : '12px',
  },
  versionBadge: {
    fontFamily      : "'Space Mono', monospace",
    fontSize        : '11px',
    color           : '#a3e635',
    display         : 'flex',
    alignItems      : 'center',
    gap             : '8px',
    padding         : '8px 12px',
    background      : 'rgba(163,230,53,0.06)',
    borderRadius    : '6px',
    border          : '1px solid rgba(163,230,53,0.15)',
  },
  dot: {
    width           : '6px',
    height          : '6px',
    borderRadius    : '50%',
    background      : '#a3e635',
    display         : 'inline-block',
    animation       : 'pulse-glow 2s infinite',
  },
  backBtn: {
    fontFamily      : "'Space Mono', monospace",
    fontSize        : '12px',
    color           : '#7a8a7a',
    background      : 'transparent',
    border          : '1px solid #1e2e1e',
    borderRadius    : '6px',
    padding         : '10px 12px',
    cursor          : 'pointer',
    textAlign       : 'left' as const,
    transition      : 'color 0.2s, border-color 0.2s',
  },
  main: {
    flex            : 1,
    padding         : '32px',
    overflowY       : 'auto' as const,
    display         : 'flex',
    flexDirection   : 'column',
    gap             : '24px',
  },
  header: {
    display         : 'flex',
    justifyContent  : 'space-between',
    alignItems      : 'flex-start',
  },
  pageTitle: {
    fontFamily      : "'Syne', sans-serif",
    fontSize        : '28px',
    fontWeight      : 800,
    color           : '#ffffff',
    letterSpacing   : '-0.02em',
  },
  pageSubtitle: {
    fontFamily      : "'Space Mono', monospace",
    fontSize        : '11px',
    color           : '#4a5a4a',
    marginTop       : '4px',
  },
  refreshBtn: {
    fontFamily      : "'Space Mono', monospace",
    fontSize        : '12px',
    color           : '#a3e635',
    background      : 'rgba(163,230,53,0.08)',
    border          : '1px solid rgba(163,230,53,0.2)',
    borderRadius    : '6px',
    padding         : '10px 16px',
    cursor          : 'pointer',
    transition      : 'background 0.2s',
  },
  topRow: {
    display         : 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap             : '16px',
  },
}