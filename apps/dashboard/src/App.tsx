// ============================================================
// Verity Dashboard — App Router
// ============================================================

import { Routes, Route, Navigate } from 'react-router-dom'
import Landing   from './pages/Landing'
import Dashboard from './pages/Dashboard'

const SESSION_KEY = 'verity_entered'

function RequireDashboard() {
  const hasEntered = sessionStorage.getItem(SESSION_KEY) === 'true'
  return hasEntered ? <Dashboard /> : <Navigate to="/" replace />
}

function App() {
  return (
    <Routes>
      <Route path="/"          element={<Landing />} />
      <Route path="/dashboard" element={<RequireDashboard />} />
      <Route path="*"          element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App