
import { AppProvider, useAppContext, STORAGE_KEY } from './contexts/AppContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { BusinessFooter } from './components/BusinessFooter';
import { IntroScreen } from './components/screens/IntroScreen';
import { BirthScreen } from './components/screens/BirthScreen';
import { StatusScreen } from './components/screens/StatusScreen';
import { ConcernScreen } from './components/screens/ConcernScreen';
import { DesiredScreen } from './components/screens/DesiredScreen';
import { LoadingScreen } from './components/screens/LoadingScreen';
import { ResultScreen } from './components/screens/ResultScreen';
import { ManualPayModal } from './components/modals/ManualPayModal';
import { LookupModal } from './components/modals/LookupModal';
import './index.css';

function AppRouter() {
  const { currentInputStep, deepLinkError, setDeepLinkError, setStep, step, sajuResult, showManualPayModal, showLookupModal } = useAppContext();

  return (
    <div className="app-container">
      {currentInputStep >= 0 && (
        <header className="flow-header">
          <div className="flow-progress" aria-label={`입력 ${currentInputStep + 1}단계 / 4단계`}>
            <div className="flow-progress-copy"><span>커리어 진단</span><strong>{currentInputStep + 1} / 4</strong></div>
            <div className="flow-progress-track"><span style={{ width: `${(currentInputStep + 1) * 25}%` }} /></div>
          </div>
        </header>
      )}

      {deepLinkError && (
        <div className="intro-screen" style={{ textAlign: 'center', padding: '48px 20px' }}>
          <p style={{ marginBottom: 20 }}>{deepLinkError}</p>
          <button className="btn-primary" onClick={() => { setDeepLinkError(null); setStep('intro'); }}>처음으로 돌아가기</button>
        </div>
      )}

      {!deepLinkError && step === 'intro' && <IntroScreen />}
      {step === 'birth' && <BirthScreen />}
      {step === 'q_status' && <StatusScreen />}
      {step === 'q_concern' && <ConcernScreen />}
      {step === 'q_desired' && <DesiredScreen />}
      {step === 'loading' && <LoadingScreen />}
      {step === 'result' && sajuResult && (
        <ErrorBoundary
          title="결과를 표시하는 중 문제가 생겼어요"
          description="진단 결과는 저장돼 있습니다. 다시 시도하면 같은 결과를 그대로 불러옵니다."
          storageKey={STORAGE_KEY}
        >
          <ResultScreen />
        </ErrorBoundary>
      )}

      {showManualPayModal && <ManualPayModal />}
      {showLookupModal && <LookupModal />}

      <BusinessFooter />
    </div>
  );
}

export default function App() {
  // 바깥 경계는 AppProvider까지 감싼다 — 컨텍스트 초기화(저장 세션 복원 등)에서
  // 터지는 경우까지 잡아야 흰 화면이 나오지 않는다.
  return (
    <ErrorBoundary storageKey={STORAGE_KEY}>
      <AppProvider>
        <AppRouter />
      </AppProvider>
    </ErrorBoundary>
  );
}
