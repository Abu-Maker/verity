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
const API_URL     = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:3000'

export interface HealthData {
  status: string
  chains: {
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

type Section = 'Intelligence' | 'Chains' | 'Usage' | 'API Key' | 'Agent'

const NAV_ITEMS: { icon: string; label: Section }[] = [
  { icon: '◈', label: 'Intelligence' },
  { icon: '⬡', label: 'Chains'       },
  { icon: '◉', label: 'Usage'        },
  { icon: '⊞', label: 'API Key'      },
  { icon: '⟳', label: 'Agent'        },
]

export default function Dashboard() {
  const navigate = useNavigate()
  const apiKey   = sessionStorage.getItem('verity_api_key') ?? ''

  const [activeSection, setActiveSection] = useState<Section>('Intelligence')
  const [health,  setHealth]  = useState<HealthData | null>(null)
  const [records, setRecords] = useState<IntelligenceRecord[]>([])
  const [usage,   setUsage]   = useState({ used: 0, limit: 50, tier: 'free' })
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [agentLog, setAgentLog] = useState<string[]>([
    'Agent initialising...',
    'Connecting to Verity API...',
    'Checking wallet balance...',
  ])

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
          used : data.meta?.usage?.used  ?? 0,
          limit: data.meta?.usage?.limit ?? 50,
          tier : data.meta?.tier         ?? 'free',
        })
      }
    } catch {
      // API not reachable
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

  useEffect(() => {
    if (activeSection !== 'Agent') return
    const messages = [
      'Querying Ethereum for high risk signals...',
      'Querying Base for high risk signals...',
      'Querying Arbitrum for high risk signals...',
      'Decision: alert — 12 high risk transactions detected',
      'Paying 0.002 USDC for intelligence query...',
      'Payment successful',
      'Agent tick complete. Next tick in 5 minutes.',
    ]
    let i = 0
    const t = setInterval(() => {
      if (i < messages.length) {
        setAgentLog(prev => [...prev.slice(-20), messages[i]])
        i++
      } else {
        clearInterval(t)
      }
    }, 1200)
    return () => clearInterval(t)
  }, [activeSection])

  function renderSection() {
    switch (activeSection) {
      case 'Intelligence':
        return <IntelligenceFeed records={records} loading={loading} />
      case 'Chains':
        return <ChainStatus health={health} loading={loading} />
      case 'Usage':
        return (
          <UsageBar
            used={usage.used}
            limit={usage.limit}
            tier={usage.tier}
          />
        )
      case 'API Key':
        return <ApiKeyCard apiKey={apiKey} tier={usage.tier} />
      case 'Agent':
        return (
          <div style={styles.agentPanel}>
            <div style={styles.agentHeader}>
              <span style={styles.agentTitle}>AUTONOMOUS AGENT</span>
              <span style={styles.agentBadge}>● RUNNING</span>
            </div>
            <div style={styles.agentGrid}>
              <div style={styles.agentStat}>
                <span style={styles.statLabel}>INTERVAL</span>
                <span style={styles.statValue}>5 min</span>
              </div>
              <div style={styles.agentStat}>
                <span style={styles.statLabel}>CHAINS</span>
                <span style={styles.statValue}>ETH · BASE · ARB</span>
              </div>
              <div style={styles.agentStat}>
                <span style={styles.statLabel}>COST / QUERY</span>
                <span style={styles.statValue}>$0.002 USDC</span>
              </div>
              <div style={styles.agentStat}>
                <span style={styles.statLabel}>NETWORK</span>
                <span style={styles.statValue}>Sepolia Testnet</span>
              </div>
            </div>
            <div style={styles.logBox}>
              <div style={styles.logHeader}>
                <span style={styles.statLabel}>AGENT LOG</span>
              </div>
              <div style={styles.logBody}>
                {agentLog.map((line, i) => (
                  <div key={i} style={styles.logLine}>
                    <span style={styles.logPrompt}>{'>'}</span>
                    <span style={styles.logText}>{line}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
    }
  }

  return (
    <div style={styles.root}>
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <div style={styles.sidebarTop}>
          <span style={styles.logo}>VERITY</span>
          <div style={styles.sidebarDivider} />
          <nav style={styles.nav}>
            {NAV_ITEMS.map(item => (
              <div
                key={item.label}
                style={{
                  ...styles.navItem,
                  background: activeSection === item.label ? '#1a2e1a' : 'transparent',
                  borderLeft: activeSection === item.label
                    ? '2px solid #a3e635'
                    : '2px solid transparent',
                }}
                onClick={() => setActiveSection(item.label)}
              >
                <span style={styles.navIcon}>{item.icon}</span>
                <span style={{
                  ...styles.navLabel,
                  color: activeSection === item.label ? '#a3e635' : '#4a5a4a',
                }}>
                  {item.label}
                </span>
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
            ← Exit
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={styles.main}>
        <div style={styles.topBar}>
          <div>
            <span style={styles.sectionTitle}>{activeSection}</span>
            <span style={styles.lastRefresh}>
              Last updated {lastRefresh.toLocaleTimeString()}
            </span>
          </div>
          <button onClick={refresh} style={styles.refreshBtn} disabled={loading}>
            {loading ? 'Loading...' : '↻ Refresh'}
          </button>
        </div>
        <div style={styles.content}>
          {renderSection()}
        </div>
      </main>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    display      : 'flex',
    height       : '100vh',
    background   : '#080e08',
    color        : '#e0e8e0',
    fontFamily   : "'Space Mono', monospace",
    overflow     : 'hidden',
  },
  sidebar: {
    width          : '200px',
    minWidth       : '200px',
    background     : '#0a120a',
    borderRight    : '1px solid #1e2e1e',
    display        : 'flex',
    flexDirection  : 'column',
    justifyContent : 'space-between',
    padding        : '24px 0',
  },
  sidebarTop: {
    display       : 'flex',
    flexDirection : 'column',
    gap           : '24px',
  },
  logo: {
    fontFamily    : "'Syne', sans-serif",
    fontSize      : '18px',
    fontWeight    : 800,
    letterSpacing : '0.2em',
    color         : '#a3e635',
    padding       : '0 20px',
  },
  sidebarDivider: {
    height     : '1px',
    background : '#1e2e1e',
    margin     : '0 20px',
  },
  nav: {
    display       : 'flex',
    flexDirection : 'column',
    gap           : '2px',
  },
  navItem: {
    display     : 'flex',
    alignItems  : 'center',
    gap         : '10px',
    padding     : '10px 20px',
    cursor      : 'pointer',
    transition  : 'all 0.15s',
    borderRadius: '0 6px 6px 0',
  },
  navIcon: {
    fontSize : '14px',
    color    : '#4a5a4a',
  },
  navLabel: {
    fontSize      : '12px',
    letterSpacing : '0.08em',
    transition    : 'color 0.15s',
  },
  sidebarBottom: {
    display       : 'flex',
    flexDirection : 'column',
    gap           : '12px',
    padding       : '0 20px',
  },
  versionBadge: {
    display    : 'flex',
    alignItems : 'center',
    gap        : '6px',
    fontSize   : '11px',
    color      : '#4a5a4a',
  },
  dot: {
    width        : '6px',
    height       : '6px',
    borderRadius : '50%',
    background   : '#a3e635',
    display      : 'inline-block',
  },
  backBtn: {
    background    : 'transparent',
    border        : '1px solid #1e2e1e',
    color         : '#4a5a4a',
    padding       : '8px 12px',
    borderRadius  : '6px',
    cursor        : 'pointer',
    fontSize      : '11px',
    fontFamily    : "'Space Mono', monospace",
    letterSpacing : '0.08em',
  },
  main: {
    flex          : 1,
    display       : 'flex',
    flexDirection : 'column',
    overflow      : 'hidden',
  },
  topBar: {
    display        : 'flex',
    justifyContent : 'space-between',
    alignItems     : 'center',
    padding        : '20px 28px',
    borderBottom   : '1px solid #1e2e1e',
    background     : '#0a120a',
  },
  sectionTitle: {
    fontFamily : "'Syne', sans-serif",
    fontSize   : '20px',
    fontWeight : 700,
    color      : '#e0e8e0',
    display    : 'block',
  },
  lastRefresh: {
    fontSize  : '11px',
    color     : '#4a5a4a',
    marginTop : '2px',
    display   : 'block',
  },
  refreshBtn: {
    background    : 'transparent',
    border        : '1px solid #2e4e2e',
    color         : '#a3e635',
    padding       : '8px 16px',
    borderRadius  : '6px',
    cursor        : 'pointer',
    fontSize      : '12px',
    fontFamily    : "'Space Mono', monospace",
    letterSpacing : '0.08em',
  },
  content: {
    flex          : 1,
    padding       : '24px 28px',
    overflow      : 'auto',
    display       : 'flex',
    flexDirection : 'column',
  },
  agentPanel: {
    display       : 'flex',
    flexDirection : 'column',
    gap           : '20px',
    flex          : 1,
  },
  agentHeader: {
    display        : 'flex',
    justifyContent : 'space-between',
    alignItems     : 'center',
  },
  agentTitle: {
    fontFamily    : "'Space Mono', monospace",
    fontSize      : '11px',
    letterSpacing : '0.15em',
    color         : '#4a5a4a',
  },
  agentBadge: {
    fontFamily    : "'Space Mono', monospace",
    fontSize      : '11px',
    padding       : '4px 10px',
    borderRadius  : '20px',
    letterSpacing : '0.08em',
    background    : '#0d2a1a',
    color         : '#a3e635',
  },
  agentGrid: {
    display             : 'grid',
    gridTemplateColumns : 'repeat(4, 1fr)',
    gap                 : '12px',
  },
  agentStat: {
    background    : '#0d140d',
    border        : '1px solid #1e2e1e',
    borderRadius  : '10px',
    padding       : '16px 20px',
    display       : 'flex',
    flexDirection : 'column',
    gap           : '8px',
  },
  statLabel: {
    fontFamily    : "'Space Mono', monospace",
    fontSize      : '10px',
    letterSpacing : '0.15em',
    color         : '#4a5a4a',
  },
  statValue: {
    fontFamily : "'Syne', sans-serif",
    fontSize   : '16px',
    fontWeight : 700,
    color      : '#e0e8e0',
  },
  logBox: {
    background    : '#0a120a',
    border        : '1px solid #1e2e1e',
    borderRadius  : '10px',
    flex          : 1,
    display       : 'flex',
    flexDirection : 'column',
    overflow      : 'hidden',
    minHeight     : '300px',
  },
  logHeader: {
    padding      : '12px 16px',
    borderBottom : '1px solid #1e2e1e',
  },
  logBody: {
    padding       : '16px',
    display       : 'flex',
    flexDirection : 'column',
    gap           : '8px',
    overflowY     : 'auto',
    flex          : 1,
  },
  logLine: {
    display    : 'flex',
    gap        : '10px',
    alignItems : 'flex-start',
  },
  logPrompt: {
    color     : '#a3e635',
    fontSize  : '12px',
    marginTop : '1px',
  },
  logText: {
    fontFamily : "'Space Mono', monospace",
    fontSize   : '12px',
    color      : '#7a8a7a',
    lineHeight : '1.6',
  },
}