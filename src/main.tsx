import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { installDiagnostics } from './utils/diagnostics.ts'
import { installPostHog } from './utils/posthogAnalytics.ts'

installPostHog()
installDiagnostics()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
