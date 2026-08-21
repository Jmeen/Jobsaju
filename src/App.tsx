
import { Suspense, lazy } from 'react';
import { AppProvider, useAppFlow, useAppReport, useAppActions, STORAGE_KEY } from './contexts/AppContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { BusinessFooter } from './components/BusinessFooter';
import { LandingScreen } from './components/screens/LandingScreen';
import { BirthScreen } from './components/screens/BirthScreen';

// 첫 화면(랜딩·출생 입력) 밖은 나눠 받는다.
// 특히 유료 화면들은 monthlyFlow → sajuCore → 만세력 데이터까지 끌고 오는데,
// 정적으로 묶어두면 랜딩만 보러 온 사람도 그 무게를 전부 내려받게 된다.
const SummonScreen = lazy(() => import('./components/screens/SummonScreen').then(m => ({ default: m.SummonScreen })));
const GuardianResultScreen = lazy(() => import('./components/screens/GuardianResultScreen').then(m => ({ default: m.GuardianResultScreen })));
const ConcernScreen = lazy(() => import('./components/screens/ConcernScreen').then(m => ({ default: m.ConcernScreen })));
const PaywallScreen = lazy(() => import('./components/screens/PaywallScreen').then(m => ({ default: m.PaywallScreen })));
const PersonalizeScreen = lazy(() => import('./components/screens/PersonalizeScreen').then(m => ({ default: m.PersonalizeScreen })));
const ResultScreen = lazy(() => import('./components/screens/ResultScreen').then(m => ({ default: m.ResultScreen })));
const ManualPayModal = lazy(() => import('./components/modals/ManualPayModal').then(m => ({ default: m.ManualPayModal })));
const LookupModal = lazy(() => import('./components/modals/LookupModal').then(m => ({ default: m.LookupModal })));
import './styles/typography.css';
import './index.css';
import './styles/guardian.css';

function AppRouter() {
  const { step, deepLinkError, showManualPayModal, showLookupModal } = useAppFlow();
  const { sajuResult, guardian, isUnlocked, aiReport } = useAppReport();
  const { setDeepLinkError, setStep } = useAppActions();

  // 수호신이 정해진 뒤에야 오행 액센트가 정해진다. 그 전에는 기본값(목)으로 둔다.
  const element = guardian?.element ?? 'wood';

  // 결제까지 끝난 사람에게는 무료 발표 화면 대신 유료 리포트 전문을 보여준다.
  const showPaidReport = step === 'result' && isUnlocked && aiReport;

  return (
    <div className="jg-app" data-element={element}>
      {step !== 'landing' && <div className="jg-brand">내 수호신</div>}

      {deepLinkError && (
        <section className="jg-screen" style={{ textAlign: 'center', paddingTop: 48 }}>
          <p className="jg-sub">{deepLinkError}</p>
          <button className="jg-btn" type="button" onClick={() => { setDeepLinkError(null); setStep('landing'); }}>
            처음으로 돌아가기
          </button>
        </section>
      )}

      {!deepLinkError && (
        <Suspense fallback={<div className="jg-screen" aria-live="polite" />}>
          {step === 'landing' && <LandingScreen />}
          {step === 'birth' && <BirthScreen />}
          {step === 'summon' && <SummonScreen />}
          {step === 'concern' && <ConcernScreen />}
          {step === 'paywall' && <PaywallScreen />}
          {step === 'personalize' && <PersonalizeScreen />}

          {step === 'result' && sajuResult && (
            <ErrorBoundary
              title="결과를 표시하는 중 문제가 생겼어요"
              description="진단 결과는 저장돼 있습니다. 다시 시도하면 같은 결과를 그대로 불러옵니다."
              storageKey={STORAGE_KEY}
            >
              {showPaidReport ? <ResultScreen /> : <GuardianResultScreen />}
            </ErrorBoundary>
          )}
        </Suspense>
      )}

      <Suspense fallback={null}>
        {showManualPayModal && <ManualPayModal />}
        {showLookupModal && <LookupModal />}
      </Suspense>

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
