
import React, { createContext, useCallback, useContext, useState, useEffect, useRef, useMemo } from 'react';
import { decodeSecurePayload } from '../utils/crypto';
import { STORAGE_KEY, loadSavedSession } from '../utils/session';
import { daysInMonth, CURRENT_YEAR } from '../utils/birthWheel';
import type { SavedSession } from '../utils/session';
import type { SajuCoreResult } from '../utils/sajuCore';
import { buildVerdictView } from '../utils/reportViewModel';
export type { MonthTone } from '../utils/monthlyFlow';
import { buildCharacterName } from '../utils/reportInsights';
import { buildTopScore, buildAllScoreViews, AXIS_ICON } from '../utils/scorePresentation';
import { resolveCopyVariant, getCopy } from '../utils/copy';
import { resolvePriceVariant } from '../utils/pricing';
import { validateFollowUpQuestion } from '../utils/followUpValidation';
import type { FollowUpRecord } from '../utils/followUpValidation';
import { lookupReportByEmail, lookupReportByToken } from '../utils/premiumApi';
import type { ReportHistoryEntry } from '../utils/premiumApi';
import { renderAllResultCards } from '../utils/resultCardTargets';
import { buildShareCardModel, canvasToPngBlob, drawShareCard } from '../utils/shareCard';
import { createSharePage, SHARE_BENEFIT_COPY, shareCareerResult, upload as uploadShareCardImage } from '../utils/kakaoShare';
import { preloadKakaoSdk } from '../utils/kakaoSdk';
import { getCharacterAsset } from '../utils/characterAssets';
import { fetchFreeResult } from '../utils/freeResultApi';
import { clearPaidSession, loadPaidSession, savePaidSession } from '../utils/paidSession';
import { resolveShareInbound } from '../utils/shareInbound';
import {
  buildGuardianShareQuery,
  buildGuardianShareUrl,
  copyGuardianShareLink,
  sendGuardianKakaoShare,
  type GuardianShareFeedback,
} from '../utils/guardianShare';
import type { ShareInbound } from '../utils/shareInbound';
import { drawGuardianShareCard, ensureShareCardFonts, loadGuardianImage } from '../utils/guardianShareCard';
import type { PaidSession } from '../utils/paidSession';
import { getGuardianAsset, guardianIdFromPillar } from '../utils/guardianAssets';
import type { GuardianConcernType } from '../utils/guardianConcern';
import { buildShareHook, earnsBonusQuestion } from '../utils/shareIncentive';
import { buildCheckoutPresentation } from '../utils/checkoutPresentation';
import {
  createResultSessionId,
  ensureShareId,
  getGuardianResultViewEventId,
  getVisitorSessionId,
  trackGuardianEvent,
  type GuardianAnalyticsIds,
  type GuardianEventName,
} from '../utils/guardianAnalytics';


export { STORAGE_KEY } from '../utils/session';

/** 공유 카드에 찍히는 유입 경로. */
const SERVICE_URL = 'jobsaju.kr';

function guardianIdFor(result: SajuCoreResult): string {
  return guardianIdFromPillar(result.pillars.day.ganHanja, result.pillars.day.zhiHanja);
}

// 리포트 가격은 utils/pricing.ts 의 A/B 변형이 결정한다 (?p=6900 / ?p=8900)

const AppFlowContext = createContext<any>(null);
const AppReportContext = createContext<any>(null);
const AppCheckoutContext = createContext<any>(null);
const AppActionsContext = createContext<any>(null);

function useRequired(ctx: any, name: string) {
  if (!ctx) throw new Error(`${name}은(는) AppProvider 안에서만 쓸 수 있습니다.`);
  return ctx;
}

/** 입력 단계 진행 상태 — step, 생년월일, 고민 입력, 저장 세션. */
export function useAppFlow() {
  return useRequired(useContext(AppFlowContext), 'useAppFlow');
}

/** 진단 결과와 그 이후 — 사주 결과, 유료 리포트, 추가 질문, 공유, 조회. */
export function useAppReport() {
  return useRequired(useContext(AppReportContext), 'useAppReport');
}

/** 결제·쿠폰 — 결제 모달이 열려 있는 동안에만 바쁘게 바뀌는 값들. */
export function useAppCheckout() {
  return useRequired(useContext(AppCheckoutContext), 'useAppCheckout');
}

/** 상태를 바꾸는 함수들. 참조가 고정돼 있어 이것만 쓰는 컴포넌트는 다시 그려지지 않는다. */
export function useAppActions() {
  const ctx = useContext(AppActionsContext);
  if (!ctx) throw new Error('useAppActions는 AppProvider 안에서만 쓸 수 있습니다.');
  return ctx;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  // === UI Step State ===
  // 무료 커리어 신호(◎○△)를 수호신 결과 화면 안으로 흡수하면서 별도 '고민 선택' 단계는 없앴다.
  // 흐름: landing → birth → summon → result(무료 수호신+신호) → paywall(왜·언제·어떻게) → personalize.
  // 직무·목표·상황 입력은 결제 전이 아니라 결제 후 'personalize' 한 화면에서 받는다.
  const [step, setStep] = useState<
    'landing' | 'birth' | 'summon' | 'result' | 'paywall' | 'personalize'
  >('landing');

  // === Form Inputs State ===
  const [birthData, setBirthData] = useState({
    year: '',
    month: '',
    day: '',
    hour: '13',
    minute: '30',
    isSolar: true,
    gender: null as number | null, // 1: 남성, 0: 여성, null: 아직 선택하지 않음
    hasTime: true
  });

  const [careerContext, setCareerContext] = useState({
    current_status: '',
    main_concern: [] as string[],
    current_job: '',
    career_goal: '',
    desired_answer: '',
    email: ''
  });

  // === Calculation & Unlock Results State ===
  const [sajuResult, setSajuResult] = useState<SajuCoreResult | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  // 입력 중인 텍스트는 컨텍스트 state로 두지 않는다.
  // 한 글자마다 Provider가 리렌더되면 ResultScreen 전체(레이더 차트·12개월 타임라인 포함)가
  // 다시 그려져 저사양 기기에서 입력이 밀린다. 값은 각 컴포넌트의 로컬 state가 들고,
  // 여기서는 모달이 닫혔다 열려도 입력이 남도록 ref로만 초안을 보관한다.
  const emailDraftRef = useRef('');
  const [isAILoading, setIsAILoading] = useState(false);
  const [unlockLoadingText, setUnlockLoadingText] = useState('결제를 확인하는 중...');
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [aiReport, setAiReport] = useState<any | null>(null);
  const [showManualPayModal, setShowManualPayModal] = useState(false);
  const [savedSession, setSavedSession] = useState<SavedSession | null>(() => loadSavedSession());
  const [analyticsIds, setAnalyticsIds] = useState<GuardianAnalyticsIds>(() => ({
    visitorSessionId: getVisitorSessionId(),
    resultSessionId: savedSession?.resultSessionId || createResultSessionId(),
    shareId: savedSession?.shareId || null,
  }));
  const restoringSavedSessionRef = useRef(false);
  const reportedResultSessionIdsRef = useRef(new Set<string>());
  // 결과 화면에서 고르는 고민 유형. 고르기 전에는 null이라 선택지만 보여준다.
  const [guardianConcern, setGuardianConcern] = useState<GuardianConcernType | null>(null);
  // 일주에서 정해지는 60갑자 수호신 — 캐릭터 원문과 아트워크를 함께 들고 있다.
  const guardian = useMemo(
    () => (sajuResult ? getGuardianAsset(guardianIdFor(sajuResult)) : null),
    [sajuResult],
  );

  // 이미 결제한 리포트를 메일/토큰 링크로 다시 열어보는 경우다.
  // 새 진단이 아니므로 guardian_result_view 분모에 넣으면 share_rate·paid_conversion_rate가
  // 재열람 횟수만큼 희석된다 — 저장 세션 복원과 같은 이유로 집계에서 제외한다.
  const revisitingPurchasedReportRef = useRef(false);
  // 결제는 끝났는데 리포트를 아직 못 만든 구간이 있다. 그 사이 새로고침하면
  // 메모리의 ref만으로는 결제 사실을 잃어버려, 이미 낸 사람에게 처음부터 다시 하라고 하게 된다.
  // 리포트 생성이 끝나면 지운다.
  const paidSessionRef = useRef<PaidSession | null>(loadPaidSession());
  // 결제 후 입력 화면에서 새로고침한 경우다. 사주를 다시 계산한 뒤 그 화면으로 되돌린다.
  const resumePersonalizeRef = useRef(Boolean(paidSessionRef.current));

  // 공유 링크로 들어온 문맥. 입력 단계에서 쿼리가 사라져도 세션에 남아 결과 완료까지 간다.
  const [shareInbound] = useState<ShareInbound | null>(() =>
    (typeof window === 'undefined' ? null : resolveShareInbound(window.location.search)));
  // 수호신 공유 카드는 결과 화면이 아니라 여기서 만든다 — 화면에 캔버스를 띄우지 않는다.
  const guardianCardCanvasRef = useRef<HTMLCanvasElement | null>(null);
  // R2에 미리 올려둔 수호신 카드 URL. 카카오 리치카드는 절대 URL 이미지만 받는다.
  const guardianCardImageUrlRef = useRef<string | null>(null);

  // === 이메일 기반 리포트 조회 모달 상태 ===
  const [showLookupModal, setShowLookupModal] = useState(false);
  const lookupEmailDraftRef = useRef('');
  const [isLookupLoading, setIsLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  // 이메일로 열람 링크 발송 요청이 성공했을 때 안내 문구 (리포트는 메일 링크를 눌러야 열람 가능)
  const [lookupSentMessage, setLookupSentMessage] = useState<string | null>(null);
  // 이메일로 조회했을 때 해당 이메일로 구매한 전체 리포트 이력(최신순) — 과거 리포트 선택 UI에 사용
  const [reportHistory, setReportHistory] = useState<ReportHistoryEntry[]>([]);
  // 이메일 딥링크(?token=...) 복구가 실패했을 때 빈 화면 대신 안내할 메시지
  const [deepLinkError, setDeepLinkError] = useState<string | null>(null);

  // === 쿠폰 시스템 상태 ===
  const couponDraftRef = useRef('');
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [couponMessage, setCouponMessage] = useState<string | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isCouponChecking, setIsCouponChecking] = useState(false);
  const [showSecretCoupon, setShowSecretCoupon] = useState(false);

  // 랜딩 카피 A/B — 광고 링크에 ?c=a / ?c=b 를 붙이면 고정된다
  const [copy] = useState(() =>
    getCopy(resolveCopyVariant(
      typeof window === 'undefined' ? '' : window.location.search,
      typeof window === 'undefined' ? null : window.localStorage,
    )),
  );

  // 가격 A/B — ?p=6900 / ?p=8900, 배정 후 고정 (기본 8,900원)
  const [price] = useState(() =>
    resolvePriceVariant(
      typeof window === 'undefined' ? '' : window.location.search,
      typeof window === 'undefined' ? null : window.localStorage,
    ),
  );
  // 매 렌더 새 객체를 만들면 checkoutState 메모가 늘 무효가 된다.
  const checkout = useMemo(
    () => buildCheckoutPresentation(price.label, Boolean(appliedCoupon)),
    [price.label, appliedCoupon],
  );

  // 추가 질문 기본 1회 + 친구 공유 보너스 1회
  const [followUps, setFollowUps] = useState<FollowUpRecord[]>([]);
  const [shareBonusGranted, setShareBonusGranted] = useState(false);
  const [followUpError, setFollowUpError] = useState<string | null>(null);
  const [isFollowUpLoading, setIsFollowUpLoading] = useState(false);
  const [isShareLoading, setIsShareLoading] = useState(false);
  // 카카오톡 공유는 실제로 "보내기"를 눌러야 카카오 웹훅이 도착하므로, 도착할 때까지 백그라운드로 확인한다.
  const [isShareConfirming, setIsShareConfirming] = useState(false);
  const [unlockToken, setUnlockToken] = useState('local-developer-unlock-token');

  // === 딥링크 (이메일/토큰 링크로 접속 시 즉시 리포트 복구) ===
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    let tokenParam = params.get('token');
    let emailParam = params.get('email');
    const pParam = params.get('p');
    if (pParam) {
      const decoded = decodeSecurePayload(pParam);
      if (decoded) {
        tokenParam = decoded.token || tokenParam;
        emailParam = decoded.email || emailParam;
      }
    }

    if (tokenParam) {
      setIsLookupLoading(true);
      lookupReportByToken(tokenParam)
        .then(data => {
          if (data?.report) {
            setAiReport(data.report);
            setIsUnlocked(true);
            setUnlockToken(tokenParam);
            setReportHistory(data.history || []);
            if (data.followups && data.followups.length > 0) {
              setFollowUps(data.followups);
            }
            if (data.user_context) {
              setCareerContext(prev => ({ ...prev, ...data.user_context }));
            }
            // 저장된 birth_data가 있으면 사주를 다시 계산해 결과 화면을 정상적으로 채운다
            // ('summon' 스텝이 sajuResult를 만들고, 소환 연출이 끝나면 'result'로 넘어간다).
            // 옛 토큰처럼 birth_data가 없는 경우엔 리포트 텍스트만이라도 볼 수 있게 알려준다.
            if (data.user_context?.birth_data) {
              setBirthData((prev: typeof birthData) => ({ ...prev, ...data.user_context.birth_data }));
              // 재열람이므로 새 result_session_id를 발급하지도, 결과 조회로 집계하지도 않는다.
              restoringSavedSessionRef.current = true;
              revisitingPurchasedReportRef.current = true;
              setStep('summon');
            } else {
              setDeepLinkError('이 링크는 사주 원본 데이터가 없어 리포트를 온전히 복구할 수 없습니다. "이메일로 리포트 다시 찾기"를 이용해 주세요.');
            }
          } else {
            setDeepLinkError('리포트를 찾지 못했습니다. 링크가 만료되었을 수 있습니다.');
          }
        })
        .catch(err => {
          console.warn('토큰 기반 리포트 복구 실패:', err);
          setDeepLinkError('리포트를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
        })
        .finally(() => {
          setIsLookupLoading(false);
        });
    } else if (emailParam && !savedSession) {
      // 아직 열리지 않은 모달들이 마운트될 때 초기값으로 읽어간다
      emailDraftRef.current = emailParam;
      lookupEmailDraftRef.current = emailParam;
    }
  }, [savedSession]);

  // 탭 제목은 수호신 브랜드로 고정한다. 예전 이직운 A/B 카피(copy.documentTitle)는
  // index.html의 제목을 런타임에 옛 문구로 덮어써, 랜딩이 바뀐 뒤에도 탭에만 이직사주가 남았다.
  useEffect(() => {
    document.title = '60마리 중 내 수호신은 누구?';
  }, []);

  const summaryCardCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const viralCardCanvasRef = useRef<HTMLCanvasElement | null>(null);
  // ResultScreen은 lazy load된다. ref만 쓰면 Provider의 효과가 캔버스가 생기기 전에
  // 한 번 실행되고 끝날 수 있으므로, 실제 DOM 노드가 붙는 순간을 state로도 알린다.
  const [viralCardCanvasNode, setViralCardCanvasNode] = useState<HTMLCanvasElement | null>(null);
  const setViralCardCanvasRef = useCallback((node: HTMLCanvasElement | null) => {
    viralCardCanvasRef.current = node;
    setViralCardCanvasNode(node);
  }, []);
  // 카드가 그려지자마자 백그라운드로 미리 업로드해 둔 이미지 URL 캐시.
  // 클릭 시점엔 이 값만 넘겨 fetch 없이 곧바로 Kakao.Share를 호출한다(iOS 제스처 컨텍스트 보존).
  const preUploadedShareImageUrlRef = useRef<string | null>(null);
  // 카카오 SDK를 못 쓰는 브라우저에서 "링크만" 공유돼도 미리보기가 뜨도록, R2 카드 이미지를 og 태그로
  // 박은 개인화 랜딩 페이지를 미리 만들어 둔 URL. 실패하면 null — 클릭 시점에 기본 서비스 URL을 쓴다.
  const preUploadedSharePageUrlRef = useRef<string | null>(null);
  const shareBonusPollTimerRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (shareBonusPollTimerRef.current) window.clearInterval(shareBonusPollTimerRef.current);
  }, []);

  // 카드 이미지 업로드 + 개인화 랜딩 페이지 생성을 "보장"한다. 백그라운드 프리업로드가 이미 끝나 있으면
  // 캐시된 값을 즉시 돌려주고, 아직이면(사용자가 준비되기 전에 공유 버튼을 눌렀다면) 이 자리에서 만든다.
  // 이게 없으면 클릭이 준비보다 빠를 때 개인화 링크 대신 기본 서비스 URL이 공유돼 버린다.
  const ensureShareAssets = async (
    canvas: HTMLCanvasElement,
    title: string,
    description: string,
  ): Promise<{ imageUrl: string | null; sharePageUrl: string | null }> => {
    let imageUrl = preUploadedShareImageUrlRef.current;
    if (!imageUrl) {
      try {
        const blob = await canvasToPngBlob(canvas);
        imageUrl = await uploadShareCardImage(blob);
        preUploadedShareImageUrlRef.current = imageUrl;
      } catch {
        return { imageUrl: null, sharePageUrl: null };
      }
    }

    let sharePageUrl = preUploadedSharePageUrlRef.current;
    if (!sharePageUrl) {
      sharePageUrl = await createSharePage({ imageUrl, title, description });
      if (sharePageUrl) preUploadedSharePageUrlRef.current = sharePageUrl;
    }

    return { imageUrl, sharePageUrl };
  };

  // === 결과·해금 상태 저장 (새로고침해도 유지) ===
  useEffect(() => {
    if (step === 'result' && sajuResult) {
      const snapshot: SavedSession = {
        birthData,
        careerContext,
        aiReport,
        isUnlocked,
        followUps,
        shareBonusGranted,
        resultSessionId: analyticsIds.resultSessionId,
        ...(analyticsIds.shareId ? { shareId: analyticsIds.shareId } : {}),
        unlockToken,
        savedAt: new Date().toISOString()
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
      } catch { /* 저장 공간 부족 등은 무시 */ }
    }
  }, [step, sajuResult, aiReport, isUnlocked, followUps, shareBonusGranted, analyticsIds.resultSessionId, analyticsIds.shareId, unlockToken, birthData, careerContext]);

  const restoreSavedSession = () => {
    if (!savedSession) return;
    restoringSavedSessionRef.current = true;
    setAnalyticsIds(current => ({
      visitorSessionId: current.visitorSessionId,
      resultSessionId: savedSession.resultSessionId || createResultSessionId(),
      shareId: savedSession.shareId || null,
    }));
    setBirthData(savedSession.birthData);
    setCareerContext(savedSession.careerContext);
    setAiReport(savedSession.aiReport);
    setIsUnlocked(savedSession.isUnlocked);
    setFollowUps(savedSession.followUps ?? (savedSession.followUp ? [savedSession.followUp] : []));
    setShareBonusGranted(savedSession.shareBonusGranted ?? false);
    setUnlockToken(savedSession.unlockToken ?? 'local-developer-unlock-token');
    setStep('summon'); // 저장된 출생정보로 사주를 다시 계산해 결과 화면으로 이동
  };

  // 선택된 연/월/양력여부에 따라 '일' 휠의 선택지가 달라진다 (예: 2월은 28~29일까지만)
  const wheelDayCount = daysInMonth(
    parseInt(birthData.year) || CURRENT_YEAR,
    parseInt(birthData.month) || 1,
    birthData.isSolar,
  );
  // 같은 이유로 배열도 개수가 그대로면 같은 참조를 유지한다.
  const wheelDays = useMemo(
    () => Array.from({ length: wheelDayCount }, (_, i) => i + 1),
    [wheelDayCount],
  );

  // 연/월이 바뀌어 지금의 '일'이 더는 유효하지 않으면 그달의 말일로 당겨준다 (예: 31일 → 2월 선택 시 28일)
  useEffect(() => {
    const current = parseInt(birthData.day);
    if (!Number.isNaN(current) && current > wheelDayCount) {
      setBirthData(prev => ({ ...prev, day: String(wheelDayCount) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wheelDayCount]);

  // === 출생 정보 유효성 검증 ===
  const birthError = (() => {
    const y = parseInt(birthData.year);
    const m = parseInt(birthData.month);
    const d = parseInt(birthData.day);
    const nowYear = new Date().getFullYear();
    if (Number.isNaN(y) || y < 1920 || y > nowYear) return `연도는 1920~${nowYear} 사이로 입력해 주세요.`;
    if (Number.isNaN(m) || m < 1 || m > 12) return '월은 1~12 사이로 입력해 주세요.';
    const maxDay = birthData.isSolar ? new Date(y, m || 1, 0).getDate() : 30;
    if (Number.isNaN(d) || d < 1 || d > maxDay) return `일은 1~${maxDay} 사이로 입력해 주세요.`;
    if (birthData.hasTime) {
      const h = parseInt(birthData.hour);
      const min = parseInt(birthData.minute);
      if (Number.isNaN(h) || h < 0 || h > 23) return '시는 0~23 사이로 입력해 주세요.';
      if (Number.isNaN(min) || min < 0 || min > 59) return '분은 0~59 사이로 입력해 주세요.';
    }
    if (birthData.gender !== 0 && birthData.gender !== 1) return '성별을 선택해 주세요.';
    return null;
  })();

  // === Screen 6. Analysis Loading Text Sequence ===
  const [loadingText, setLoadingText] = useState('태어난 날의 하늘 우주 배치 확인 중...');
  useEffect(() => {
    if (step === 'summon') {
      const gender = birthData.gender;
      if (gender !== 0 && gender !== 1) {
        setStep('birth');
        return;
      }
      // 만세력 엔진(gzip 약 100KB)이 처음 필요해지는 지점이다.
      // 로딩 연출이 2.4초 돌아가는 동안 받아두면 사용자가 기다리는 시간은 늘지 않는다.
      // 만세력 엔진(gzip 약 100KB)이 처음 필요해지는 지점이다.
      // 로딩 연출이 2.4초 돌아가는 동안 받아두면 사용자가 기다리는 시간은 늘지 않는다.
      const enginePromise = import('../utils/sajuCore');
      const hourVal = birthData.hasTime ? parseInt(birthData.hour) : 12;
      const minVal = birthData.hasTime ? parseInt(birthData.minute) : 0;

      // 무료 결과의 정식 경로는 백엔드다. 연출과 나란히 던져두고 t3에서 받는다 —
      // 서버·클라이언트가 같은 sajuCore를 쓰므로 어느 쪽으로 계산해도 결과는 같다.
      const controller = new AbortController();
      const freeResultPromise = fetchFreeResult({
        year: parseInt(birthData.year),
        month: parseInt(birthData.month),
        day: parseInt(birthData.day),
        hour: birthData.hasTime ? hourVal : null,
        minute: birthData.hasTime ? minVal : null,
        gender,
        isSolar: birthData.isSolar,
      }, { signal: controller.signal });

      const t1 = setTimeout(() => setLoadingText('이동·직장·재물 기운 추출 중...'), 800);
      const t2 = setTimeout(() => setLoadingText('현재 직장 고민 상황과 결합 분석 중...'), 1600);
      const t3 = setTimeout(() => {
        void (async () => {
          // 서버가 못 주면(오프라인·장애) 같은 계산을 클라이언트에서 돌려 결과 화면을 살린다.
          const fromServer = await freeResultPromise;
          const analysis = fromServer?.sajuResult ?? (await enginePromise).getSajuAnalysis(
            parseInt(birthData.year),
            parseInt(birthData.month),
            parseInt(birthData.day),
            hourVal,
            minVal,
            gender,
            {
              applyTimeCorrection: true,
              isSolar: birthData.isSolar,
              hasTime: birthData.hasTime
            }
          );
          if (restoringSavedSessionRef.current) {
            restoringSavedSessionRef.current = false;
          } else {
            setAnalyticsIds(current => ({
              visitorSessionId: current.visitorSessionId,
              resultSessionId: createResultSessionId(),
              shareId: null,
            }));
          }
          // 앞선 진단에서 고른 유형이 새 결과에 남아 있으면 안 된다.
          setGuardianConcern(null);
          setSajuResult(analysis);
          // 여기서 화면을 넘기지 않는다 — 소환 연출이 끝난 뒤 사용자가 직접 만나러 간다.
        })().catch(() => {
          // 서버도 실패하고 엔진 청크도 못 받은 경우 — 결과 화면으로 넘기지 않고 안내한다.
          setDeepLinkError('사주 계산 엔진을 불러오지 못했습니다. 연결을 확인하고 다시 시도해 주세요.');
          setStep('landing');
        });
      }, 2400);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
        controller.abort();
      };
    }
  }, [step, birthData.day, birthData.gender, birthData.hasTime, birthData.hour, birthData.isSolar, birthData.minute, birthData.month, birthData.year]);

  useEffect(() => {
    if (step !== 'result' || !sajuResult || reportedResultSessionIdsRef.current.has(analyticsIds.resultSessionId)) return;
    reportedResultSessionIdsRef.current.add(analyticsIds.resultSessionId);
    if (revisitingPurchasedReportRef.current) {
      // 결제분 재열람은 소진 처리만 하고 넘어간다. 이후 이 탭에서 새로 진단하면
      // 새 result_session_id가 발급되므로 정상적으로 다시 집계된다.
      revisitingPurchasedReportRef.current = false;
      return;
    }
    void trackGuardianEvent({
      eventId: getGuardianResultViewEventId(analyticsIds.resultSessionId),
      eventName: 'guardian_result_view',
      occurredAt: new Date().toISOString(),
      visitorSessionId: analyticsIds.visitorSessionId,
      resultSessionId: analyticsIds.resultSessionId,
      guardianId: guardianIdFor(sajuResult),
    });
  }, [step, sajuResult, analyticsIds.resultSessionId, analyticsIds.visitorSessionId]);

  // 공유 링크 유입을 한 번만 기록한다. Primary KPI의 분모다.
  const reportedLandingRef = useRef(false);
  useEffect(() => {
    if (!shareInbound || reportedLandingRef.current) return;
    reportedLandingRef.current = true;
    void trackGuardianEvent({
      eventId: crypto.randomUUID(),
      eventName: 'guardian_share_landing_view',
      occurredAt: new Date().toISOString(),
      visitorSessionId: analyticsIds.visitorSessionId,
      shareId: shareInbound.shareId,
      fromGuardianId: shareInbound.fromGuardianId,
      shareChannel: shareInbound.medium,
      utmSource: 'guardian_share',
    });
  }, [shareInbound, analyticsIds.visitorSessionId]);

  // 공유로 들어온 사람이 자기 결과까지 완료했는가 — Primary KPI의 분자다.
  // 결과 세션마다 한 번만 보낸다.
  const completedFromShareRef = useRef(new Set<string>());
  useEffect(() => {
    if (!shareInbound || step !== 'result' || !sajuResult) return;
    if (completedFromShareRef.current.has(analyticsIds.resultSessionId)) return;
    completedFromShareRef.current.add(analyticsIds.resultSessionId);
    void trackGuardianEvent({
      eventId: crypto.randomUUID(),
      eventName: 'guardian_result_complete_from_share',
      occurredAt: new Date().toISOString(),
      visitorSessionId: analyticsIds.visitorSessionId,
      resultSessionId: analyticsIds.resultSessionId,
      shareId: shareInbound.shareId,
      guardianId: guardianIdFor(sajuResult),
      fromGuardianId: shareInbound.fromGuardianId,
      shareChannel: shareInbound.medium,
      utmSource: 'guardian_share',
    });
  }, [shareInbound, step, sajuResult, analyticsIds.resultSessionId, analyticsIds.visitorSessionId]);

  // 궁합 블록이 실제로 보였는지 — 공유 허브가 노출됐다는 신호다.
  const reportedMatchRef = useRef(new Set<string>());
  const trackMatchSectionView = () => {
    if (!sajuResult || reportedMatchRef.current.has(analyticsIds.resultSessionId)) return;
    reportedMatchRef.current.add(analyticsIds.resultSessionId);
    void trackGuardianEvent({
      eventId: crypto.randomUUID(),
      eventName: 'guardian_match_section_view',
      occurredAt: new Date().toISOString(),
      visitorSessionId: analyticsIds.visitorSessionId,
      resultSessionId: analyticsIds.resultSessionId,
      guardianId: guardianIdFor(sajuResult),
    });
  };

  // 결제만 끝난 채 새로고침된 세션을 복구한다.
  // 저장된 출생정보가 없으면 되살릴 수 없으므로 결제 대기 표시를 지우고 일반 흐름으로 둔다.
  useEffect(() => {
    if (!resumePersonalizeRef.current) return;
    if (!savedSession?.birthData?.year) {
      resumePersonalizeRef.current = false;
      paidSessionRef.current = null;
      clearPaidSession();
      return;
    }
    restoreSavedSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 복구 계산이 끝나면 결과가 아니라 결제 후 입력 화면으로 보낸다.
  useEffect(() => {
    if (!resumePersonalizeRef.current || !sajuResult) return;
    resumePersonalizeRef.current = false;
    setStep('personalize');
  }, [sajuResult]);

  // === 결제 후 AI 리포트 생성 대기 문구 순환 (소요 시간이 길어 진행감을 계속 보여줘야 한다) ===
  useEffect(() => {
    if (!isAILoading) return;
    const messages = [
      '결제를 확인하는 중...',
      '내 사주 데이터를 다시 정리하는 중...',
      '입력하신 고민에 맞는 해석을 찾는 중...',
      '리포트 문장을 다듬는 중... (조금만 더 기다려 주세요)',
    ];
    let i = 0;
    setUnlockLoadingText(messages[0]);
    const id = setInterval(() => {
      i = (i + 1) % messages.length;
      setUnlockLoadingText(messages[i]);
    }, 2600);
    return () => clearInterval(id);
  }, [isAILoading]);

  // === 리포트 완료를 창을 떠나 있어도 알려준다 (브라우저 알림 + 탭 제목 깜빡임) ===
  const notifyReportReady = (success: boolean) => {
    const title = success ? '이직사주 리포트가 준비됐어요' : '리포트 생성에 문제가 있었어요';
    const body = success ? '탭으로 돌아와 결과를 확인해 보세요.' : '다시 열어 재시도해 주세요.';

    try {
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification(title, { body, tag: 'saju-report' });
      }
    } catch { /* 알림 미지원 환경은 조용히 무시 */ }

    // 다른 탭을 보고 있을 때는 탭 제목을 바꿔 눈에 띄게 하고, 돌아오면 원래대로 되돌린다
    if (typeof document !== 'undefined' && document.hidden) {
      const original = document.title;
      document.title = success ? '✅ 리포트 준비 완료' : '⚠️ 리포트 생성 실패';
      const restore = () => {
        document.title = original;
        document.removeEventListener('visibilitychange', restore);
      };
      document.addEventListener('visibilitychange', restore);
    }
  };

  // === SNS 공유 카드 이미지 생성 (Canvas API) ===
  useEffect(() => {
    if (step === 'result' && sajuResult) {
      // 공유 버튼은 이 화면에만 있다. 클릭 시점에 받기 시작하면 iOS에서 제스처 컨텍스트가
      // 끊기므로, 화면에 도달한 지금 미리 받아둔다.
      preloadKakaoSdk();

      const renderCanvas = (canvas: HTMLCanvasElement) => {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const KR_FONT = '"Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
        const charName = aiReport?.character_name
          || buildCharacterName(sajuResult.dayGan.char, sajuResult.scores);
        const conclusion: string = aiReport?.one_line_conclusion
          || buildVerdictView(sajuResult.scores).title;

        // measureText 기반 단어 단위 줄바꿈
        const wrapText = (text: string, maxWidth: number, maxLines: number): string[] => {
          const words = text.split(' ');
          const lines: string[] = [];
          let line = '';
          let consumed = 0;

          for (const word of words) {
            const tryLine = line ? `${line} ${word}` : word;
            if (ctx.measureText(tryLine).width > maxWidth && line) {
              lines.push(line);
              line = word;
              if (lines.length === maxLines) break;
            } else {
              line = tryLine;
            }
            consumed++;
          }
          if (lines.length < maxLines && line) {
            lines.push(line);
            consumed = words.length;
          }

          // 다 담지 못하고 잘렸다면 마지막 줄을 말줄임으로 마무리한다
          if (consumed < words.length && lines.length) {
            let last = lines[lines.length - 1];
            while (last.length > 1 && ctx.measureText(`${last}…`).width > maxWidth) {
              last = last.slice(0, -1);
            }
            lines[lines.length - 1] = `${last}…`;
          }
          return lines;
        };

        // 1. 배경
        ctx.fillStyle = '#0d0a1b';
        ctx.fillRect(0, 0, 400, 400);

        // 2. Nebula 그라데이션
        const grad = ctx.createRadialGradient(320, 80, 20, 320, 80, 160);
        grad.addColorStop(0, 'rgba(168, 85, 247, 0.25)');
        grad.addColorStop(1, 'rgba(13, 10, 27, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 400, 400);

        // 3. 테두리
        ctx.strokeStyle = 'rgba(147, 51, 234, 0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(20, 20, 360, 360);

        // 4. 타이틀
        ctx.fillStyle = '#f3f4f6';
        ctx.font = `bold 22px ${KR_FONT}`;
        ctx.fillText(`${sajuResult.seewun.year} 직장인 이직운`, 40, 60);

        // 5. 현재 가장 높은 선택 지표
        const top = buildTopScore(sajuResult.scores);
        ctx.fillStyle = '#c084fc';
        ctx.font = `bold 19px ${KR_FONT}`;
        ctx.fillText(top.headline, 40, 96);

        // 6. 캐릭터 이름
        ctx.fillStyle = 'rgba(243, 244, 246, 0.9)';
        ctx.font = `14px ${KR_FONT}`;
        wrapText(charName, 320, 1).forEach(ln => ctx.fillText(ln, 40, 122));

        // 7. 점수 + 직관적인 등급
        const rows = buildAllScoreViews(sajuResult.scores);
        const icons = ['🚀', '🛡️', '💼'];
        rows.forEach((r, i) => {
          const y = 172 + i * 34;
          ctx.fillStyle = '#9ca3af';
          ctx.font = `14px ${KR_FONT}`;
          ctx.fillText(`${icons[i]} ${r.axisLabel}`, 45, y);

          ctx.fillStyle = '#f3f4f6';
          ctx.font = `bold 16px ${KR_FONT}`;
          ctx.fillText(`${r.score}점`, 150, y);

          ctx.fillStyle = 'rgba(192, 132, 252, 0.85)';
          ctx.font = `12px ${KR_FONT}`;
          ctx.fillText(r.level, 205, y);
        });

        // 8. 한 줄 결론 (최대 3줄 줄바꿈)
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.beginPath();
        ctx.moveTo(40, 272);
        ctx.lineTo(360, 272);
        ctx.stroke();

        ctx.fillStyle = '#9ca3af';
        ctx.font = `13px ${KR_FONT}`;
        wrapText(conclusion, 320, 3).forEach((ln, i) => ctx.fillText(ln, 40, 298 + i * 20));

        // 9. 브랜드 + 유입 경로 (공유 이미지가 트래픽으로 이어지려면 주소가 찍혀 있어야 한다)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.font = `11px ${KR_FONT}`;
        ctx.fillText('직장인 이직사주', 40, 372);
        ctx.fillStyle = 'rgba(192, 132, 252, 0.75)';
        ctx.textAlign = 'right';
        ctx.fillText(SERVICE_URL, 360, 372);
        ctx.textAlign = 'left';
      };

      const renderVisibleCards = () => renderAllResultCards(
        [summaryCardCanvasRef.current],
        renderCanvas,
      );

      let cancelled = false;
      const renderShareCard = async () => {
        if (!viralCardCanvasRef.current) return;
        const canvas = viralCardCanvasRef.current;
        const character = getCharacterAsset(sajuResult.dayGan.char);
        const topScore = buildTopScore(sajuResult.scores);
        const scoreViews = buildAllScoreViews(sajuResult.scores);
        const model = buildShareCardModel({
          characterName: character.title,
          elementLabel: character.elementLabel,
          imageUrl: character.imageUrl,
          collectionNo: character.collectionNo,
          collectionTotal: character.collectionTotal,
          topAxisIcon: AXIS_ICON[topScore.axis],
          topAxisLabel: topScore.axisLabel,
          topAxisLevel: topScore.level,
          topAxisTone: topScore.tone,
          scores: scoreViews.map(view => ({
            axis: view.axis,
            label: view.axisLabel,
            score: view.score,
            level: view.level,
          })),
          conclusion: aiReport?.one_line_conclusion || buildVerdictView(sajuResult.scores).title,
        });

        // 이미지 파일의 로드가 지연돼도 빈 카드가 남지 않도록, 텍스트 기반 카드부터 즉시 그린다.
        drawShareCard(canvas, model);
        const image = new Image();
        image.decoding = 'async';
        const loadedImage = await new Promise<HTMLImageElement | undefined>(resolve => {
          const timeout = window.setTimeout(() => resolve(undefined), 5000);
          image.onload = () => { window.clearTimeout(timeout); resolve(image); };
          image.onerror = () => { window.clearTimeout(timeout); resolve(undefined); };
          image.src = model.imageUrl;
        });
        if (cancelled) return;
        drawShareCard(canvas, model, loadedImage);
        preUploadedShareImageUrlRef.current = null;
        preUploadedSharePageUrlRef.current = null;
        await ensureShareAssets(canvas, buildShareHook(sajuResult.scores), SHARE_BENEFIT_COPY);
        if (cancelled) {
          // 이 사이 사주 입력이 바뀌는 등 효과가 취소됐다면, 새 렌더링과 무관한 값이 캐시에 남지 않게 비운다.
          preUploadedShareImageUrlRef.current = null;
          preUploadedSharePageUrlRef.current = null;
        }
      };
      renderVisibleCards();
      void renderShareCard();
      const timer = setTimeout(() => {
        renderVisibleCards();
        void renderShareCard();
      }, 150);
      return () => {
        cancelled = true;
        clearTimeout(timer);
      };
    }
  }, [step, isUnlocked, sajuResult, aiReport, viralCardCanvasNode]);

  // === 수호신 공유 카드 사전 준비 ===
  // 카카오 리치카드는 절대 URL 이미지만 받는다. 클릭한 다음에 그리고 올리기 시작하면
  // iOS에서 사용자 제스처 컨텍스트가 끊겨 카카오톡이 열리지 않는다. 화면에 도착한 지금 만들어 둔다.
  // 유료 리포트 화면에는 자체 공유 카드가 따로 있으므로, 무료 수호신 화면일 때만 준비한다.
  useEffect(() => {
    if (step !== 'result' || !guardian || (isUnlocked && aiReport)) return;

    let cancelled = false;
    guardianCardImageUrlRef.current = null;
    void (async () => {
      try {
        const canvas = guardianCardCanvasRef.current ?? document.createElement('canvas');
        guardianCardCanvasRef.current = canvas;
        const [image] = await Promise.all([loadGuardianImage(guardian.imageUrl), ensureShareCardFonts()]);
        if (cancelled) return;
        drawGuardianShareCard(canvas, guardian, image);
        const blob = await canvasToPngBlob(canvas);
        const imageUrl = await uploadShareCardImage(blob);
        // 이 사이 수호신이 바뀌었다면 남의 카드가 캐시에 남지 않게 버린다.
        if (!cancelled) guardianCardImageUrlRef.current = imageUrl;
      } catch {
        // 실패해도 공유 클릭 시점에 한 번 더 시도한다.
      }
    })();
    return () => { cancelled = true; };
  }, [step, guardian, isUnlocked, aiReport]);

  // === 쿠폰 적용 핸들러 ===
  // 코드 자체를 프론트에 하드코딩하지 않는다 — 서버(SAJU_KV의 coupon:<CODE> 레코드)에 실시간으로
  // 물어봐서 사용 가능 여부만 확인한다(이 확인 자체는 사용 횟수를 소비하지 않고, 실제 소비는
  // "무료 해금하기" 클릭 시 /api/payment/validate에서 일어난다).
  const handleApplyCoupon = async (code: string) => {
    const raw = code.trim().toUpperCase();
    if (!raw) {
      setCouponError('쿠폰 코드를 입력해 주세요.');
      setCouponMessage(null);
      return;
    }
    setIsCouponChecking(true);
    setCouponError(null);
    try {
      const response = await fetch('/api/coupon/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ couponCode: raw }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.valid) {
        setAppliedCoupon(null);
        setCouponMessage(null);
        setCouponError(data.error || '유효하지 않거나 만료된 쿠폰 번호입니다.');
        return;
      }
      setAppliedCoupon(raw);
      const remainingHint = typeof data.remainingUses === 'number' ? ` (남은 사용 ${data.remainingUses}회)` : '';
      setCouponMessage(`🎉 100% 무료 프로모션 쿠폰(${raw})이 적용되었습니다!${remainingHint}`);
    } catch {
      setAppliedCoupon(null);
      setCouponMessage(null);
      setCouponError('쿠폰 확인 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setIsCouponChecking(false);
    }
  };

  // === 해금 시 AI API 통신 (또는 초정밀 Fallback 로드) ===
  const handleUnlock = async (email: string) => {
    // 결제 모달이 넘겨주는 값만 받는다. alert는 브라우저를 막아버려 화면 안 오류로 보여준다.
    if (typeof email !== 'string' || !email.includes('@')) {
      setUnlockError('올바른 이메일 주소를 입력해 주세요.');
      return;
    }

    try {
      if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
        Notification.requestPermission();
      }
    } catch { /* 알림 미지원 환경은 조용히 무시 */ }

    setUnlockError(null);

    // 쿠폰 코드는 결제 수단일 뿐 리포트 ID가 아니다. 같은 쿠폰·같은 이메일로 다시
    // 구매해도 리포트별 추가 질문권과 다시보기 이력이 분리되도록 매번 새 토큰을 쓴다.
    let finalPaymentId = appliedCoupon ? `coupon-${appliedCoupon}-${crypto.randomUUID()}` : '';

    if (!finalPaymentId) {
      try {
        const { requestPortOnePayment } = await import('../utils/portone');
        const paymentRes = await requestPortOnePayment({
          paymentId: `pid-${Date.now()}-${Math.floor(Math.random()*1000)}`,
          orderName: '잡사주 유료 리포트',
          totalAmount: price.amount,
          currency: 'KRW',
          payMethod: 'CARD'
        });
        
        if (paymentRes.code != null) {
          // PortOne V2 returns code on failure
          setUnlockError(`결제 실패: ${paymentRes.message}`);
          return;
        }
        
        finalPaymentId = paymentRes.paymentId;
      } catch (err: any) {
        setUnlockError(`결제 초기화 실패: ${err.message}`);
        return;
      }
    }

    // 결제까지가 여기 몫이다. 직무·목표·상황은 결제 후 personalize 화면에서 받는다.
    paidSessionRef.current = { paymentId: finalPaymentId, email: email.trim() };
    savePaidSession(paidSessionRef.current);
    // 새 리포트를 시작할 때 이전 리포트의 질문·공유 보너스 상태를 이어받지 않는다.
    setFollowUps([]);
    setShareBonusGranted(false);
    setFollowUpError(null);
    setCareerContext(prev => ({ ...prev, email: email.trim() }));
    setShowManualPayModal(false);
    setStep('personalize');
  };

  // 결제 후 입력 화면에서 호출된다. 입력을 건너뛰면 빈 객체가 들어온다.
  const submitPersonalization = async (patch: Record<string, string>): Promise<boolean> => {
    const paid = paidSessionRef.current;
    if (!paid) {
      setUnlockError('결제 정보를 찾지 못했습니다. 고객센터로 문의해 주시면 바로 도와드릴게요.');
      return false;
    }
    const context = { ...careerContext, ...patch };
    setCareerContext(context);
    setIsAILoading(true);
    setUnlockError(null);

    const finalPaymentId = paid.paymentId;
    try {
      // Create request payload
      const payload = {
        payment_id: finalPaymentId,
        birth: birthData,
        career_context: {
          email: paid.email,
          worry_text: context.desired_answer,
          job_title: context.current_job,
          career_goal: context.career_goal,
          years_of_experience: 5 // Defaulting, you might want to derive this
        }
      };

      // We'll poll up to 6 times (about 30 seconds) if it returns 429
      let retries = 0;
      let finalData = null;

      while (retries < 6) {
        const res = await fetch('/api/paid-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (res.status === 202) {
          // Generating...
          setUnlockLoadingText('수만 가지 경우의 수를 분석하여 리포트를 작성하고 있습니다... (최대 15초 소요)');
          await new Promise(r => setTimeout(r, 5000));
          retries++;
          continue;
        }

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || '리포트 생성 중 오류가 발생했습니다.');
        }

        finalData = await res.json();
        break;
      }

      if (!finalData) {
        throw new Error('리포트 생성이 지연되고 있습니다. 잠시 후 다시 시도해주세요.');
      }

      // Map finalData to aiReport structure
      setAiReport({ ...finalData, source: 'ai' });
      setIsUnlocked(true);
      setUnlockToken(finalPaymentId);
      // 리포트가 나왔으니 결제 대기 상태는 지운다.
      paidSessionRef.current = null;
      clearPaidSession();
      setStep('result');
      if (sajuResult) {
        void trackGuardianEvent({
          eventId: crypto.randomUUID(),
          eventName: 'paid_conversion',
          occurredAt: new Date().toISOString(),
          visitorSessionId: analyticsIds.visitorSessionId,
          resultSessionId: analyticsIds.resultSessionId,
          guardianId: guardianIdFor(sajuResult),
        });
      }
      // 생성에 최대 30초까지 걸려 그 사이 탭을 떠나 있을 수 있다.
      // handleUnlock 진입 때 알림 권한을 받아둔 이유가 이것이다.
      notifyReportReady(true);
    } catch (error: any) {
      console.warn("AI 백엔드 연결 실패:", error);
      setUnlockError(error.message || '리포트 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.');
      notifyReportReady(false);
      return false;
    } finally {
      setIsAILoading(false);
    }
    return true;
  };

  // === 이메일 주소로 구매한 해금 리포트 열람 링크 발송 요청 ===
  // 화면에 바로 리포트를 띄우지 않는다 — 이메일 주소만 아는 사람이 남의 리포트를 볼 수 없도록,
  // 실제로 그 메일함을 열 수 있는 사람만 링크를 눌러 열람하게 한다.
  const handleEmailLookup = async (email: string) => {
    if (!email || !email.includes('@')) {
      setLookupError('올바른 이메일 주소를 입력해 주세요.');
      return;
    }
    setIsLookupLoading(true);
    setLookupError(null);
    setLookupSentMessage(null);

    try {
      const data = await lookupReportByEmail(email);
      setLookupSentMessage(data.message || '입력하신 이메일로 리포트 열람 링크를 보내드렸습니다. 메일함을 확인해 주세요.');
    } catch (error: any) {
      setLookupError(error?.message || '이메일 조회 중 오류가 발생했습니다.');
    } finally {
      setIsLookupLoading(false);
    }
  };

  // === 이메일 조회로 찾은 과거 리포트 이력 중 하나를 선택해서 전환 ===
  const handleSelectPastReport = async (token: string) => {
    if (token === unlockToken) return;
    setIsLookupLoading(true);
    setLookupError(null);
    try {
      const data = await lookupReportByToken(token);
      if (data.report) {
        setAiReport(data.report);
        setUnlockToken(data.unlockToken || token);
        setReportHistory(data.history || []);
        if (data.user_context) {
          setCareerContext((prev) => ({ ...prev, ...data.user_context }));
        }
      } else {
        setLookupError('보관된 리포트를 찾지 못했습니다.');
      }
    } catch (error: any) {
      setLookupError(error?.message || '이메일 조회 중 오류가 발생했습니다.');
    } finally {
      setIsLookupLoading(false);
    }
  };

  // === 추가 질문 제출 (기본 1회 + 공유 보너스 1회) ===
  // 요청을 실제로 보냈으면 true — 호출한 쪽에서 입력창을 비울지 판단한다.
  // (검증 실패로 되돌아온 경우에는 사용자가 쓴 질문을 지우지 않는다)
  const handleFollowUpSubmit = async (rawQuestion: string): Promise<boolean> => {
    const questionLimit = shareBonusGranted ? 2 : 1;
    if (!sajuResult || followUps.length >= questionLimit) return false;

    const validationError = validateFollowUpQuestion(rawQuestion);
    if (validationError) {
      setFollowUpError(validationError);
      return false;
    }

    setFollowUpError(null);
    setIsFollowUpLoading(true);
    const question = rawQuestion.trim();

    // 대운은 이 프롬프트에서만 쓰이므로 lunar-javascript(gzip 약 113KB)를 여기서만 내려받는다.
    // 실패해도 추가 질문 자체는 진행한다 (프롬프트에서 대운 한 줄이 비는 정도의 영향).
    let daewunGanZhi = '';
    try {
      const { computeDaewun } = await import('../utils/daewun');
      daewunGanZhi = computeDaewun(sajuResult.daewunInput).current?.ganZhi || '';
    } catch {
      daewunGanZhi = '';
    }

    try {
      const res = await fetch('/api/followup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unlock_token: unlockToken,
          question,
          question_index: followUps.length + 1,
          saju_summary: {
            day_gan: `${sajuResult.dayGan.hanja} (${sajuResult.dayGan.char}${sajuResult.dayGan.element})`,
            scores: sajuResult.scores,
            score_levels: buildAllScoreViews(sajuResult.scores).map(view => `${view.axisLabel} ${view.score}점 · ${view.level}`),
            body_strength: sajuResult.bodyStrength > 0.2 ? '신강' : sajuResult.bodyStrength < -0.2 ? '신약' : '중화',
            seewun: `${sajuResult.seewun.year}년 ${sajuResult.seewun.ganZhi}`,
            daewun: daewunGanZhi,
            prior_conclusion: aiReport?.one_line_conclusion || '',
          },
          user_context: {
            current_status: careerContext.current_status,
            current_job: careerContext.current_job,
            career_goal: careerContext.career_goal,
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setFollowUps(current => [...current, { question, answer: data.answer, answeredAt: new Date().toISOString() }]);
      } else if (res.status === 409) {
        setFollowUpError('추가 질문을 이미 사용했습니다.');
      } else if (res.status === 422) {
        const data = await res.json().catch(() => null);
        setFollowUpError([data?.error, data?.suggestion].filter(Boolean).join(' ')
          || '이 질문은 커리어 상담 범위에서 답하기 어렵습니다. 다른 커리어 질문을 적어주세요.');
      } else {
        const data = await res.json().catch(() => null);
        if (import.meta.env.DEV) {
          // 개발 중 API 없이 화면을 보기 위한 로컬 폴백. 프로덕션 번들에는 들어가지 않는다.
          const { buildLocalFollowUpAnswer } = await import('../utils/followUp');
          setFollowUps(current => [...current, {
            question,
            answer: buildLocalFollowUpAnswer(question, sajuResult, careerContext),
            answeredAt: new Date().toISOString(),
          }]);
        } else {
          setFollowUpError(data?.error || '답변을 만들지 못했습니다. 질문권은 사용되지 않았으니 다시 시도해 주세요.');
        }
      }
    } catch {
      if (import.meta.env.DEV) {
        const { buildLocalFollowUpAnswer } = await import('../utils/followUp');
        setFollowUps(current => [...current, {
          question,
          answer: buildLocalFollowUpAnswer(question, sajuResult, careerContext),
          answeredAt: new Date().toISOString(),
        }]);
      } else {
        setFollowUpError('네트워크 연결을 확인해 주세요. 질문권은 사용되지 않았습니다.');
      }
    } finally {
      setIsFollowUpLoading(false);
    }
    return true;
  };

  // iOS Safari(WebKit)는 <a download>를 지원하지 않아 클릭해도 아무 일도 일어나지 않는다.
  // Web Share API로 파일을 공유하면 시스템 공유 시트의 "이미지 저장"으로 실제 저장이 가능하다.
  const handleDownloadCard = async (canvas: HTMLCanvasElement | null, filename: string) => {
    if (!canvas) return;
    try {
      const blob = await canvasToPngBlob(canvas);
      const file = new File([blob], filename, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] });
        return;
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return; // 사용자가 공유 시트를 취소함
      // Web Share가 없거나 실패하면 아래 다운로드 방식으로 폴백한다 (데스크톱·안드로이드에서 정상 동작)
    }
    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL();
    link.click();
  };

  // === 수호신 공유 ===
  // 목적은 URL 전달이 아니라 루프다: 결과 확인 → 공유 → 친구 유입 → 친구 결과 완료 → 재공유.
  // 경로는 카카오톡과 링크 복사 두 가지만 둔다. 시스템 공유 시트(navigator.share)는 쓰지 않는다 —
  // 어느 앱으로 갔는지 알 수 없어 medium 구분이 무너지고, 카카오톡에 리치카드 대신 링크만 꽂힌다.

  /**
   * 이번 공유 흐름의 익명 id를 확정한다. 두 버튼이 같은 id를 공유해야
   * 카카오 공유와 링크 복사가 하나의 공유 흐름으로 묶여 재공유까지 추적된다.
   */
  const ensureGuardianShareIds = (): GuardianAnalyticsIds & { shareId: string } => {
    const shareId = ensureShareId(analyticsIds.shareId);
    const next = { ...analyticsIds, shareId };
    if (shareId !== analyticsIds.shareId) setAnalyticsIds(next);
    return next;
  };

  // 공유 링크의 기준 주소는 개인화 미리보기 페이지가 아니라 앱 진입점이다.
  // 미리보기 페이지를 거치면 그 페이지의 CTA가 귀속 쿼리를 떨어뜨려 친구의 결과 완료가 집계되지 않는다.
  const guardianShareBaseUrl = () => import.meta.env.VITE_PUBLIC_SERVICE_URL || window.location.origin;

  /**
   * 카카오 리치카드에 박을 800×800 카드 이미지 URL을 보장한다.
   * 결과 화면 진입 시 백그라운드로 이미 올려뒀으면 즉시 돌려준다 — 그래야 클릭 시점에
   * 네트워크를 기다리지 않고, iOS에서 사용자 제스처 컨텍스트가 끊기지 않는다.
   */
  const ensureGuardianCardImageUrl = async (): Promise<string | null> => {
    if (guardianCardImageUrlRef.current) return guardianCardImageUrlRef.current;
    if (!guardian) return null;
    try {
      const canvas = guardianCardCanvasRef.current ?? document.createElement('canvas');
      guardianCardCanvasRef.current = canvas;
      const [image] = await Promise.all([loadGuardianImage(guardian.imageUrl), ensureShareCardFonts()]);
      drawGuardianShareCard(canvas, guardian, image);
      const blob = await canvasToPngBlob(canvas);
      const imageUrl = await uploadShareCardImage(blob);
      guardianCardImageUrlRef.current = imageUrl;
      return imageUrl;
    } catch {
      return null;
    }
  };

  const trackGuardianShare = (
    eventName: GuardianEventName,
    ids: GuardianAnalyticsIds & { shareId: string },
    guardianId: string,
    shareChannel: 'kakao' | 'copy',
  ) => {
    void trackGuardianEvent({
      eventId: crypto.randomUUID(),
      eventName,
      occurredAt: new Date().toISOString(),
      visitorSessionId: ids.visitorSessionId,
      resultSessionId: ids.resultSessionId,
      shareId: ids.shareId,
      guardianId,
      shareChannel,
    });
  };

  /**
   * 카카오톡 공유. 사용자 정의 템플릿으로 보낸다 — 수호신 카드는 정사각형이라
   * 기본 피드 레이아웃에 맞춰 크롭되면 캐릭터가 잘린다.
   * 공유 대상 Picker는 기본값이라 친구·채팅방·단톡방을 모두 고를 수 있다.
   */
  const handleGuardianKakaoShare = async (): Promise<GuardianShareFeedback> => {
    if (!sajuResult || !guardian || isShareLoading) return { ok: false, message: null };

    const ids = ensureGuardianShareIds();
    const guardianId = guardian.id;
    trackGuardianShare('guardian_share_click', ids, guardianId, 'kakao');

    setIsShareLoading(true);
    try {
      const imageUrl = await ensureGuardianCardImageUrl();
      if (!imageUrl) throw new Error('공유 카드 이미지를 준비하지 못했습니다.');

      const urlInput = {
        baseUrl: guardianShareBaseUrl(),
        guardianId,
        shareSessionId: ids.shareId,
        medium: 'kakao' as const,
      };
      await sendGuardianKakaoShare({
        kakaoKey: import.meta.env.VITE_KAKAO_JS_KEY || '',
        templateId: import.meta.env.VITE_KAKAO_GUARDIAN_TEMPLATE_ID || '',
        guardian,
        imageUrl,
        shareUrl: buildGuardianShareUrl(urlInput),
        shareQuery: buildGuardianShareQuery(urlInput),
        shareSessionId: ids.shareId,
        // 카카오가 실제 전송에 성공했을 때만 그대로 돌려주는 값이다.
        // guardian_share_confirmed(= 진짜 발송)는 오직 이 웹훅으로만 기록된다.
        // 개인정보는 넣지 않는다 — 전부 익명 UUID와 수호신 id뿐이다.
        serverCallbackArgs: {
          share_id: ids.shareId,
          result_session_id: ids.resultSessionId,
          visitor_session_id: ids.visitorSessionId,
          guardian_id: guardianId,
          ...(isUnlocked ? { unlock_token: unlockToken } : {}),
        },
      });

      trackGuardianShare('guardian_share_sheet_opened', ids, guardianId, 'kakao');
      // 공유 보너스(추가 질문)는 결제한 사람에게만 있는 혜택이라, 해금된 경우에만 확인한다.
      if (isUnlocked && !shareBonusGranted) pollShareBonusStatus(unlockToken);
      return { ok: true, message: null };
    } catch {
      // 카카오 SDK 실패·카카오톡 미설치가 결과 화면 전체를 깨뜨리면 안 된다. 링크 복사로 안내한다.
      return { ok: false, message: '카카오톡 공유를 열 수 없어요. 아래 “링크 복사”로 공유할 수 있어요.' };
    } finally {
      setIsShareLoading(false);
    }
  };

  /** 링크 복사. 카카오와 같은 귀속 구조를 쓰되 utm_medium=copy로 갈라 집계한다. */
  const handleGuardianLinkCopy = async (): Promise<GuardianShareFeedback> => {
    if (!guardian) return { ok: false, message: null };

    const ids = ensureGuardianShareIds();
    const guardianId = guardian.id;
    trackGuardianShare('guardian_share_click', ids, guardianId, 'copy');

    const shareUrl = buildGuardianShareUrl({
      baseUrl: guardianShareBaseUrl(),
      guardianId,
      shareSessionId: ids.shareId,
      medium: 'copy',
    });
    if (!(await copyGuardianShareLink(shareUrl))) {
      return { ok: false, message: '링크를 복사하지 못했어요. 주소창의 주소를 직접 복사해 주세요.' };
    }

    // 복사에 성공했을 때만 집계한다 — 클립보드가 막힌 환경의 실패까지 공유로 세면 K가 부풀려진다.
    trackGuardianShare('guardian_share_link_copy', ids, guardianId, 'copy');
    return { ok: true, message: '링크를 복사했어요!' };
  };

  // 카카오톡 공유는 사용자가 채팅방을 골라 실제로 "보내기"를 눌러야 카카오 서버가 웹훅을 보낸다.
  // 그 전까진 보너스를 줄 수 없으므로, 도착할 때까지 백그라운드에서 짧은 간격으로 확인한다.
  const pollShareBonusStatus = (token: string) => {
    if (shareBonusPollTimerRef.current) return; // 이미 확인 중이면 중복 시작하지 않는다
    setIsShareConfirming(true);
    let attempts = 0;
    const maxAttempts = 20; // 2초 간격으로 약 40초까지 확인
    const stop = () => {
      if (shareBonusPollTimerRef.current) {
        window.clearInterval(shareBonusPollTimerRef.current);
        shareBonusPollTimerRef.current = null;
      }
      setIsShareConfirming(false);
    };
    const tick = async () => {
      attempts += 1;
      try {
        const res = await fetch(`/api/share-bonus/status?unlock_token=${encodeURIComponent(token)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.granted) {
            setShareBonusGranted(true);
            stop();
            return;
          }
        }
      } catch {
        // 네트워크 오류는 다음 주기에서 다시 확인한다
      }
      if (attempts >= maxAttempts) stop();
    };
    void tick();
    shareBonusPollTimerRef.current = window.setInterval(tick, 2000);
  };

  // === 카카오톡 및 SNS 바이럴 공유 기능 (Web Share API + 클립보드 복사) ===
  const handleShareResult = async () => {
    const canvas = viralCardCanvasRef.current;
    if (!canvas || !sajuResult || isShareLoading) return;
    const shareId = ensureShareId(analyticsIds.shareId);
    const shareAnalyticsIds = { ...analyticsIds, shareId };
    if (shareId !== analyticsIds.shareId) setAnalyticsIds(shareAnalyticsIds);
    const guardianId = guardianIdFor(sajuResult);
    void trackGuardianEvent({
      eventId: crypto.randomUUID(),
      eventName: 'guardian_share_click',
      occurredAt: new Date().toISOString(),
      visitorSessionId: shareAnalyticsIds.visitorSessionId,
      resultSessionId: shareAnalyticsIds.resultSessionId,
      shareId: shareAnalyticsIds.shareId,
      guardianId,
    });
    setIsShareLoading(true);
    try {
      const blob = await canvasToPngBlob(canvas);
      const baseServiceUrl = import.meta.env.VITE_PUBLIC_SERVICE_URL || window.location.origin;
      const shareHook = buildShareHook(sajuResult!.scores);
      const character = getCharacterAsset(sajuResult!.dayGan.char);
      const verdict = buildVerdictView(sajuResult!.scores);
      const shareDescription = `나의 직장인 사주: ${character.title}\n"${verdict.title}"\n👉 내 커리어 타이밍 확인하기`;
      // 백그라운드 준비가 클릭보다 늦었을 수 있으니, 여기서 한 번 더 "보장"한다 — 이미 캐시돼 있으면 즉시 반환된다.
      const { imageUrl, sharePageUrl } = await ensureShareAssets(canvas, shareHook, shareDescription);
      // 개인화 랜딩 페이지가 있으면 그 URL을 공유한다 — 카카오 SDK를 못 쓰는 브라우저에서 링크만
      // 공유돼도, 그 링크를 열어보면 내 결과카드 이미지·문구가 미리보기로 뜬다. 실패했을 때만 기본 URL.
      const shareUrl = sharePageUrl || baseServiceUrl;
      const result = await shareCareerResult({
        blob,
        serviceUrl: shareUrl,
        kakaoKey: import.meta.env.VITE_KAKAO_JS_KEY || '',
        templateId: import.meta.env.VITE_KAKAO_GUARDIAN_TEMPLATE_ID || '',
        shareHook,
        description: shareDescription,
        preUploadedImageUrl: imageUrl || undefined,
        unlockToken,
        shareId: shareAnalyticsIds.shareId,
        resultSessionId: shareAnalyticsIds.resultSessionId,
        visitorSessionId: shareAnalyticsIds.visitorSessionId,
        guardianId,
      });
      if (result === 'kakao') {
        void trackGuardianEvent({
          eventId: crypto.randomUUID(), eventName: 'guardian_share_sheet_opened', occurredAt: new Date().toISOString(),
          visitorSessionId: shareAnalyticsIds.visitorSessionId, resultSessionId: shareAnalyticsIds.resultSessionId,
          shareId: shareAnalyticsIds.shareId, guardianId, shareChannel: 'kakao',
        });
        // 카카오톡 공유는 실제 "보내기" 완료를 카카오 웹훅으로 확인한 뒤에만 보너스를 준다(클릭만으로는 신뢰하지 않는다).
        if (!shareBonusGranted) pollShareBonusStatus(unlockToken);
      } else if (result === 'link' || result === 'file') {
        void trackGuardianEvent({
          eventId: crypto.randomUUID(), eventName: 'guardian_share_sheet_opened', occurredAt: new Date().toISOString(),
          visitorSessionId: shareAnalyticsIds.visitorSessionId, resultSessionId: shareAnalyticsIds.resultSessionId,
          shareId: shareAnalyticsIds.shareId, guardianId,
          shareChannel: result === 'link' ? 'web_link' : 'web_file',
        });
        if (!shareBonusGranted && earnsBonusQuestion(result)) {
          // 시스템 공유 시트(link/file)는 실제 전송 여부를 확인할 방법이 없어 클릭 자체를 신뢰한다.
          const bonusResponse = await fetch('/api/share-bonus', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ unlock_token: unlockToken }),
          });
          if (!bonusResponse.ok) throw new Error('share bonus registration failed');
          setShareBonusGranted(true);
        }
      }
      if (result === 'download') {
        // 다운로드 폴백도 공유 시도이므로 집계에 넣는다.
        // 빠지면 completed_guardians_per_attempted_share의 분모가 과소 계상된다.
        void trackGuardianEvent({
          eventId: crypto.randomUUID(), eventName: 'guardian_share_sheet_opened', occurredAt: new Date().toISOString(),
          visitorSessionId: shareAnalyticsIds.visitorSessionId, resultSessionId: shareAnalyticsIds.resultSessionId,
          shareId: shareAnalyticsIds.shareId, guardianId, shareChannel: 'download',
        });
        alert('카카오 공유를 준비하지 못해 이미지를 저장하고 서비스 주소를 복사했어요.');
      }
    } catch {
      alert('공유 카드를 준비하지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setIsShareLoading(false);
    }
  };



  // 상태와 액션을 분리한 두 컨텍스트로 내보낸다.
  //
  // 상태 객체는 굳이 메모하지 않는다 — AppProvider가 다시 그려지는 이유가 곧 상태 변경이라,
  // 어차피 매번 새 값이 맞다. 대신 액션 쪽 신원을 고정해서, 액션만 쓰는 화면(입력 단계들)은
  // 다른 상태가 바뀌어도 다시 그려지지 않게 한다.
  // 상태를 도메인별로 나눠 내보낸다.
  //
  // 한 덩어리로 두면 결제 진행 중 2.6초마다 도는 안내 문구 갱신 같은 변화가
  // 결과 화면(레이더 차트·12개월 타임라인)까지 매번 다시 그리게 만든다.
  // 실제 소비를 보면 경계가 겹치지 않는다 — ResultScreen은 결제 상태를 쓰지 않고,
  // ManualPayModal은 리포트 상태를 쓰지 않는다.
  //
  // 각 객체는 자기 도메인 값으로만 메모한다. 이게 없으면 AppProvider가 다시 그려질 때마다
  // 세 객체가 모두 새로 만들어져, 컨텍스트를 나눈 의미가 사라진다(실제로 그랬다).
  /** 입력 단계 진행 상태 */
  const flowState = useMemo(() => ({
    step,
    birthData,
    careerContext,
    birthError,
    wheelDayCount,
    wheelDays,
    loadingText,
    copy,
    deepLinkError,
    savedSession,
    showManualPayModal,
    showLookupModal,
  }), [step, birthData, careerContext, birthError, wheelDayCount, wheelDays, loadingText, copy, deepLinkError, savedSession, showManualPayModal, showLookupModal]);

  /** 진단 결과와 그 이후 */
  const reportState = useMemo(() => ({
    sajuResult,
    guardian,
    guardianConcern,
    shareInbound,
    isUnlocked,
    aiReport,
    unlockToken,
    followUps,
    followUpError,
    isFollowUpLoading,
    shareBonusGranted,
    isShareLoading,
    isShareConfirming,
    isLookupLoading,
    lookupError,
    lookupSentMessage,
    reportHistory,
  }), [sajuResult, guardian, guardianConcern, shareInbound, isUnlocked, aiReport, unlockToken, followUps, followUpError, isFollowUpLoading, shareBonusGranted, isShareLoading, isShareConfirming, isLookupLoading, lookupError, lookupSentMessage, reportHistory]);

  /** 결제·쿠폰 */
  const checkoutState = useMemo(() => ({
    isAILoading,
    unlockLoadingText,
    unlockError,
    appliedCoupon,
    couponMessage,
    couponError,
    isCouponChecking,
    showSecretCoupon,
    checkout,
    price,
  }), [isAILoading, unlockLoadingText, unlockError, appliedCoupon, couponMessage, couponError, isCouponChecking, showSecretCoupon, checkout, price]);

  // 안쪽 핸들러는 지금처럼 매 렌더 새로 만들어진다(클로저가 항상 최신).
  // 밖으로 나가는 것은 이 ref를 거치는 고정 참조라, 렌더가 바뀌어도 같은 함수다.
  const handlersRef = useRef<Record<string, (...args: any[]) => any>>({});
  handlersRef.current = {
    restoreSavedSession,
    handleUnlock,
    submitPersonalization,
    handleEmailLookup,
    handleSelectPastReport,
    handleFollowUpSubmit,
    handleDownloadCard,
    handleShareResult,
    handleGuardianKakaoShare,
    handleGuardianLinkCopy,
    trackMatchSectionView,
    handleApplyCoupon,
    pollShareBonusStatus,
  };

  const actions = useMemo(() => {
    const stable = (name: string) => (...args: any[]) => handlersRef.current[name](...args);
    return {
      setStep,
      setBirthData,
      setCareerContext,
      setSajuResult,
      setGuardianConcern,
      setIsUnlocked,
      setIsAILoading,
      setUnlockLoadingText,
      setUnlockError,
      setAiReport,
      setShowManualPayModal,
      setSavedSession,
      setShowLookupModal,
      setIsLookupLoading,
      setLookupError,
      setLookupSentMessage,
      setReportHistory,
      setDeepLinkError,
      setAppliedCoupon,
      setCouponMessage,
      setCouponError,
      setIsCouponChecking,
      setShowSecretCoupon,
      setFollowUps,
      setShareBonusGranted,
      setFollowUpError,
      setIsFollowUpLoading,
      setIsShareLoading,
      setIsShareConfirming,
      setUnlockToken,
      emailDraftRef,
      lookupEmailDraftRef,
      couponDraftRef,
      viralCardCanvasRef,
      setViralCardCanvasRef,
      summaryCardCanvasRef,
      restoreSavedSession: stable('restoreSavedSession'),
      handleUnlock: stable('handleUnlock'),
      submitPersonalization: stable('submitPersonalization'),
      handleEmailLookup: stable('handleEmailLookup'),
      handleSelectPastReport: stable('handleSelectPastReport'),
      handleFollowUpSubmit: stable('handleFollowUpSubmit'),
      handleDownloadCard: stable('handleDownloadCard'),
      handleShareResult: stable('handleShareResult'),
      handleGuardianKakaoShare: stable('handleGuardianKakaoShare'),
      handleGuardianLinkCopy: stable('handleGuardianLinkCopy'),
      trackMatchSectionView: stable('trackMatchSectionView'),
      handleApplyCoupon: stable('handleApplyCoupon'),
      pollShareBonusStatus: stable('pollShareBonusStatus'),
    };
    // setState 함수와 ref는 렌더가 바뀌어도 같은 참조라 의존성이 없다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AppActionsContext.Provider value={actions}>
      <AppFlowContext.Provider value={flowState}>
        <AppReportContext.Provider value={reportState}>
          <AppCheckoutContext.Provider value={checkoutState}>{children}</AppCheckoutContext.Provider>
        </AppReportContext.Provider>
      </AppFlowContext.Provider>
    </AppActionsContext.Provider>
  );
}
