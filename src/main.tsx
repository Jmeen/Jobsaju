import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { installDiagnostics } from './utils/diagnostics.ts'
import { installPostHog } from './utils/posthogAnalytics.ts'
import { captureSalesTouch, trackSales } from './utils/salesFunnel.ts'

// 결제 복귀·공유 유입 처리로 주소가 정리되기 전에 최초 유입 태그를 보관한다.
captureSalesTouch(window.location.search)
trackSales('visit')

installPostHog()
installDiagnostics()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
