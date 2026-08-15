
import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { decodeSecurePayload } from '../utils/crypto';
import { getSajuAnalysis } from '../utils/sajuCore';
import type { SajuCoreResult } from '../utils/sajuCore';
import { buildScoreBars, buildVerdictView } from '../utils/reportViewModel';
import { buildPremiumExpansion } from '../utils/premiumReport';
import { buildMonthlyFlow } from '../utils/monthlyFlow';
export type { MonthTone } from '../utils/monthlyFlow';
import { buildElementInsight, buildCharacterName } from '../utils/reportInsights';
import { buildTopScore, buildAllScoreViews, AXIS_ICON } from '../utils/scorePresentation';
import { resolveCopyVariant, getCopy } from '../utils/copy';
import { resolvePriceVariant } from '../utils/pricing';
import { validateFollowUpQuestion, buildLocalFollowUpAnswer, FOLLOW_UP_MAX_LENGTH } from '../utils/followUp';
import type { FollowUpRecord } from '../utils/followUp';
import { requestPremiumReport, lookupReportByEmail, lookupReportByToken, PremiumReportError } from '../utils/premiumApi';
import type { ReportHistoryEntry } from '../utils/premiumApi';
import { renderAllResultCards } from '../utils/resultCardTargets';
import { buildShareCardModel, canvasToPngBlob, drawShareCard } from '../utils/shareCard';
import { createSharePage, SHARE_BENEFIT_COPY, shareCareerResult, upload as uploadShareCardImage } from '../utils/kakaoShare';
import { preloadKakaoSdk } from '../utils/kakaoSdk';
import { getCharacterAsset } from '../utils/characterAssets';
import { buildShareHook, earnsBonusQuestion } from '../utils/shareIncentive';
import { FollowUpLoading, FormattedAnswer } from '../components/FollowUpContent';
import { BusinessFooter } from '../components/BusinessFooter';
import { ReportProse } from '../components/ReportProse';
import { buildCharacterTypeLabel, REPORT_HEADINGS } from '../utils/reportCopy';
import { CHECKOUT_COPY, buildCheckoutPresentation, runCheckoutAction } from '../utils/checkoutPresentation';


// === 가상(Mock) AI 해석 리포트 데이터 (API 연결 오류 시 또는 데모용 고품질 Fallback) ===
const MOCK_AI_REPORT: Record<string, any> = {
  '을': {
    one_line_conclusion: "현재는 2026년 병오(丙午) 세운의 식상(상관) 기운이 일간 을목을 강하게 자극하므로, 이직을 긍정적으로 탐색하되 10~11월 연봉 협상에서 주도권을 잡는 흐름이 가장 유리합니다.",
    main_concern_report: {
      title: "연봉 및 처우 협상운 심층 분석",
      content: "귀하의 사주는 관성(금)과 재성(토)이 조화를 이루어 성실하게 명예를 축적하는 직장인 사주입니다. 다만, 현 직장에서는 일한 만큼의 보상(재성)에 목마름을 느낄 수 있습니다. 올해 들어온 병오(丙午) 세운은 '상관생재' 즉, 내 재능과 말솜씨(상관)를 발휘하여 재물(재성)을 벌어들이는 흐름입니다. 이직 면접이나 부서 이동 신청 시 본인의 포트폴리오를 숫자로 명확히 증명한다면 평소보다 15% 이상 높은 처우 제안을 받아낼 수 있습니다."
    },
    career_aspects: [
      { area: "이동 및 변화 (이직)", content: "이직운 점수 83점이 말해주듯, 하반기 9~10월 사이에 강력한 이동수가 들어옵니다. 헤드헌터의 제안에 귀를 기울이고 적극적으로 이력서를 뿌리기에 아주 적절한 타이밍입니다." },
      { area: "현 조직 내 적응 (잔류)", content: "잔류운은 49점으로 낮아 현 조직에 머무를 경우 부당한 R&R 배분이나 연봉 동결로 인한 소외감, 마음의 홧병이 생길 수 있으니 억지로 버티는 것은 추천하지 않습니다." },
      { area: "조직 내 상사/동료 관계", content: "관성이 강해 기본적으로 윗사람의 눈치를 잘 보며 규율을 지키지만, 올해는 불합리한 윗선 지시에 참지 못하고 대립할 우려가 있습니다. 감정적인 충돌을 피하기 위해 현 직장에서는 포커페이스를 유지해야 합니다." }
    ],
    dos: [
      "과거 진행한 프로젝트 기여도를 정량적 수치로 가다듬어 포트폴리오를 업데이트하세요.",
      "인터뷰 시 당당하되 유연한 '을목'의 특성을 살려 커뮤니케이션 면접관을 매료시키세요."
    ],
    donts: [
      "홧김에 이직처가 확정되지 않은 상태에서 먼저 퇴사 통보(사직서 던지기)를 하지 마세요.",
      "기본 연봉 인상분 외에 사이닝 보너스나 성과급 지급 주기를 꼼꼼히 확인하지 않고 계약하지 마세요."
    ],
    character_name: "유연한 협상 테이블의 지배자 🧚"
  },
  'default': {
    one_line_conclusion: "올해 세운의 변화가 커리어 성장에 긍정적인 파동을 일으키고 있습니다. 이직과 연봉 처우 개선을 주도적으로 기획해 보기에 적합한 시기입니다.",
    main_concern_report: {
      title: "커리어 및 연봉운 심층 진단",
      content: "전반적인 사주 원국의 밸런스를 고려했을 때, 본인의 잠재력에 비해 직장 내 R&R 설정이 다소 정체되어 있는 양상입니다. 올해는 운의 흐름이 본인의 성과를 세상 밖으로 드러내는 식상과 재물의 흐름으로 이어집니다. 본인이 기여한 실무 성과를 강하게 리포트화하여 협상을 이끌어 낼 절호의 기회입니다."
    },
    career_aspects: [
      { area: "이동 및 변화 (이직)", content: "변화의 기운이 70점 이상으로 강해, 현 직장에 머무르기보다 채용 시장에서 본인의 시장가치와 적합성을 확인해 볼 수 있는 시기입니다." },
      { area: "현 조직 내 적응 (잔류)", content: "조직 안정성은 다소 흔들리고 있어 현 직장 내에 부서 재배치나 리더십 변경 등의 어수선한 잡음이 발생하기 쉽습니다." },
      { area: "조직 내 상사/동료 관계", content: "상대방의 독선을 참고 넘기기 쉬운 운세이나, 필요할 때는 조리 있게 본인의 주장을 밝혀 선을 긋는 것이 현명합니다." }
    ],
    dos: [
      "경쟁사 연봉 테이블을 조사하고 구체적인 희망 연봉 구간을 2개 이상 준비해두세요.",
      "조급하게 결정하지 말고 제안을 받은 후 최소 3일간 고민의 여지를 두세요."
    ],
    donts: [
      "연봉 협상 시 '회사 내규에 따름' 같은 소극적인 태도는 피하세요.",
      "이전 동료들과의 관계를 험악하게 마무리 지으며 퇴사하지 않도록 마무리에 힘쓰세요."
    ],
    character_name: "영리한 커리어 스나이퍼 🎯"
  }
};

export const STORAGE_KEY = 'saju_session_v1';

/** 공유 카드에 찍히는 유입 경로. */
const SERVICE_URL = 'jobsaju.kr';

// 리포트 가격은 utils/pricing.ts 의 A/B 변형이 결정한다 (?p=6900 / ?p=8900)

type SavedSession = {
  birthData: any;
  careerContext: any;
  aiReport: any | null;
  isUnlocked: boolean;
  followUp?: FollowUpRecord | null;
  followUps?: FollowUpRecord[];
  shareBonusGranted?: boolean;
  unlockToken?: string;
  savedAt: string;
};

function loadSavedSession(): SavedSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.birthData?.year) return null;
    return parsed;
  } catch {
    return null;
  }
}

// === 출생 정보용 스크롤 휠 피커 (공간 절약형 3줄 컴팩트 모드) ===
const WHEEL_ITEM_HEIGHT = 36;
const WHEEL_VISIBLE_ROWS = 3;
const WHEEL_HEIGHT = WHEEL_ITEM_HEIGHT * WHEEL_VISIBLE_ROWS;
const WHEEL_PADDING = (WHEEL_HEIGHT - WHEEL_ITEM_HEIGHT) / 2;

export const CURRENT_YEAR = new Date().getFullYear();
export const WHEEL_YEARS = Array.from({ length: CURRENT_YEAR - 1920 + 1 }, (_, i) => 1920 + i);
export const WHEEL_MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
export const WHEEL_HOURS = Array.from({ length: 24 }, (_, i) => i);
export const WHEEL_MINUTES = Array.from({ length: 60 }, (_, i) => i);

export function daysInMonth(year: number, month: number, isSolar: boolean): number {
  if (!isSolar) return 30; // 음력은 만세력 변환 전이라 30일 상한으로 넉넉히 받아둔다
  if (!year || !month) return 31;
  return new Date(year, month, 0).getDate();
}

/** 값이 바뀌면 해당 항목이 가운데로 오도록 스크롤을 맞추는 iOS 스타일 휠 피커 */
export function WheelColumn({
  values,
  value,
  onChange,
  formatValue = (v: number) => String(v),
  ariaLabel,
}: {
  values: number[];
  value: number;
  onChange: (v: number) => void;
  formatValue?: (v: number) => string;
  ariaLabel: string;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const scrollTimeoutRef = useRef<number | null>(null);

  // 값이 외부에서 바뀌었을 때(초기 로드, 다른 휠의 파생 변경 등) 스크롤 위치를 맞춘다
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const idx = values.indexOf(value);
    if (idx === -1) return;
    const target = idx * WHEEL_ITEM_HEIGHT;
    if (Math.abs(el.scrollTop - target) > 1) {
      el.scrollTo({ top: target, behavior: 'auto' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, values.length]);

  const handleScroll = () => {
    if (scrollTimeoutRef.current) window.clearTimeout(scrollTimeoutRef.current);
    // 스크롤이 멈춘 뒤에만 값을 확정한다 (스크롤 중 계속 갱신하면 매 프레임 리렌더가 생긴다)
    scrollTimeoutRef.current = window.setTimeout(() => {
      const el = scrollRef.current;
      if (!el) return;
      const idx = Math.max(0, Math.min(values.length - 1, Math.round(el.scrollTop / WHEEL_ITEM_HEIGHT)));
      const target = idx * WHEEL_ITEM_HEIGHT;
      if (Math.abs(el.scrollTop - target) > 1) {
        el.scrollTo({ top: target, behavior: 'smooth' });
      }
      const next = values[idx];
      if (next !== undefined && next !== value) onChange(next);
    }, 110);
  };

  return (
    <div className="wheel-col" role="listbox" aria-label={ariaLabel}>
      <div className="wheel-highlight" style={{ height: WHEEL_ITEM_HEIGHT, top: WHEEL_PADDING }} />
      <div
        ref={scrollRef}
        className="wheel-scroll"
        style={{ height: WHEEL_HEIGHT }}
        onScroll={handleScroll}
      >
        <div style={{ height: WHEEL_PADDING }} aria-hidden="true" />
        {values.map(v => (
          <div
            key={v}
            role="option"
            aria-selected={v === value}
            className={`wheel-item${v === value ? ' active' : ''}`}
            style={{ height: WHEEL_ITEM_HEIGHT }}
            onClick={() => onChange(v)}
          >
            {formatValue(v)}
          </div>
        ))}
        <div style={{ height: WHEEL_PADDING }} aria-hidden="true" />
      </div>
    </div>
  );
}


const AppContext = createContext<any>(null);

export function useAppContext() {
    return useContext(AppContext);
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  // === UI Step State ===
  const [step, setStep] = useState<
    'intro' | 'birth' | 'q_status' | 'q_concern' | 'q_desired' | 'loading' | 'result'
  >('intro');

  // === Form Inputs State ===
  const [birthData, setBirthData] = useState({
    year: '1993',
    month: '8',
    day: '12',
    hour: '13',
    minute: '30',
    isSolar: true,
    gender: 1, // 1: 남성, 0: 여성
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
  const [secretClickCount, setSecretClickCount] = useState(0);

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
  const checkout = buildCheckoutPresentation(price.label, Boolean(appliedCoupon));

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
            // ('loading' 스텝이 sajuResult를 만들고 나서 'result'로 넘어간다).
            // 옛 토큰처럼 birth_data가 없는 경우엔 리포트 텍스트만이라도 볼 수 있게 알려준다.
            if (data.user_context?.birth_data) {
              setBirthData((prev: typeof birthData) => ({ ...prev, ...data.user_context.birth_data }));
              setStep('loading');
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

  useEffect(() => {
    document.title = copy.documentTitle;
  }, [copy]);

  const summaryCardCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const viralCardCanvasRef = useRef<HTMLCanvasElement | null>(null);
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
        unlockToken,
        savedAt: new Date().toISOString()
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
      } catch { /* 저장 공간 부족 등은 무시 */ }
    }
  }, [step, sajuResult, aiReport, isUnlocked, followUps, shareBonusGranted, unlockToken, birthData, careerContext]);

  const restoreSavedSession = () => {
    if (!savedSession) return;
    setBirthData(savedSession.birthData);
    setCareerContext(savedSession.careerContext);
    setAiReport(savedSession.aiReport);
    setIsUnlocked(savedSession.isUnlocked);
    setFollowUps(savedSession.followUps ?? (savedSession.followUp ? [savedSession.followUp] : []));
    setShareBonusGranted(savedSession.shareBonusGranted ?? false);
    setUnlockToken(savedSession.unlockToken ?? 'local-developer-unlock-token');
    setStep('loading'); // 저장된 출생정보로 사주를 다시 계산해 결과 화면으로 이동
  };

  const inputSteps = ['birth', 'q_status', 'q_concern', 'q_desired'] as const;
  const currentInputStep = inputSteps.indexOf(step as (typeof inputSteps)[number]);

  // 선택된 연/월/양력여부에 따라 '일' 휠의 선택지가 달라진다 (예: 2월은 28~29일까지만)
  const wheelDayCount = daysInMonth(
    parseInt(birthData.year) || CURRENT_YEAR,
    parseInt(birthData.month) || 1,
    birthData.isSolar,
  );
  const wheelDays = Array.from({ length: wheelDayCount }, (_, i) => i + 1);

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
    return null;
  })();

  const createFallbackReport = () => {
    const elementKey = sajuResult?.dayGan.char === '을' ? '을' : 'default';
    return {
      ...MOCK_AI_REPORT[elementKey],
      character_name: sajuResult
        ? buildCharacterName(sajuResult.dayGan.char, sajuResult.scores)
        : MOCK_AI_REPORT[elementKey].character_name,
      ...buildPremiumExpansion(
        {
          currentStatus: careerContext.current_status,
          currentJob: careerContext.current_job,
          careerGoal: careerContext.career_goal,
          desiredAnswer: careerContext.desired_answer,
        },
        {
          jobChange: sajuResult?.scores.jobChange ?? 50,
          stay: sajuResult?.scores.stay ?? 50,
          negotiation: sajuResult?.scores.negotiation ?? 50,
        },
        {
          dayGan: sajuResult?.dayGan.char,
          bodyStrength: sajuResult?.bodyStrength,
        },
      ),
      source: 'fallback' as const, // AI 미연동 표시 — 테스트 피드백 오염 방지
    };
  };

  // === Screen 6. Analysis Loading Text Sequence ===
  const [loadingText, setLoadingText] = useState('태어난 날의 하늘 우주 배치 확인 중...');
  useEffect(() => {
    if (step === 'loading') {
      const t1 = setTimeout(() => setLoadingText('이동·직장·재물 기운 추출 중...'), 800);
      const t2 = setTimeout(() => setLoadingText('현재 직장 고민 상황과 결합 분석 중...'), 1600);
      const t3 = setTimeout(() => {
        // 사주 계산 코어 돌리기
        const hourVal = birthData.hasTime ? parseInt(birthData.hour) : 12;
        const minVal = birthData.hasTime ? parseInt(birthData.minute) : 0;
        const analysis = getSajuAnalysis(
          parseInt(birthData.year),
          parseInt(birthData.month),
          parseInt(birthData.day),
          hourVal,
          minVal,
          birthData.gender,
          {
            applyTimeCorrection: true,
            isSolar: birthData.isSolar,
            hasTime: birthData.hasTime
          }
        );
        setSajuResult(analysis);
        setStep('result');
      }, 2400);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [step, birthData.day, birthData.gender, birthData.hasTime, birthData.hour, birthData.isSolar, birthData.minute, birthData.month, birthData.year]);

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

        const image = new Image();
        image.decoding = 'async';
        const loadedImage = await new Promise<HTMLImageElement | undefined>(resolve => {
          image.onload = () => resolve(image);
          image.onerror = () => resolve(undefined);
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
  }, [step, isUnlocked, sajuResult, aiReport]);

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
    if (!email || !email.includes('@')) {
      alert("올바른 이메일 주소를 입력해 주세요.");
      return;
    }

    try {
      if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
        Notification.requestPermission();
      }
    } catch { /* 알림 미지원 환경은 조용히 무시 */ }

    setUnlockError(null);

    // If using a coupon, bypass PortOne
    let finalPaymentId = appliedCoupon ? `coupon-${appliedCoupon}` : '';

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

    setIsAILoading(true);

    try {
      // Create request payload
      const payload = {
        payment_id: finalPaymentId,
        birth: birthData,
        career_context: {
          email: email.trim(),
          worry_text: careerContext.current_status,
          job_title: careerContext.current_job,
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
      setShowManualPayModal(false);
      
    } catch (error: any) {
      console.warn("AI 백엔드 연결 실패:", error);
      setUnlockError(error.message || '리포트 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setIsAILoading(false);
    }
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
    if (!canvas || isShareLoading) return;
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
        shareHook,
        description: shareDescription,
        preUploadedImageUrl: imageUrl || undefined,
        unlockToken,
      });
      if (result === 'kakao') {
        // 카카오톡 공유는 실제 "보내기" 완료를 카카오 웹훅으로 확인한 뒤에만 보너스를 준다(클릭만으로는 신뢰하지 않는다).
        if (!shareBonusGranted) pollShareBonusStatus(unlockToken);
      } else if (earnsBonusQuestion(result) && !shareBonusGranted) {
        // 시스템 공유 시트(link/file)는 실제 전송 여부를 확인할 방법이 없어 클릭 자체를 신뢰한다.
        const bonusResponse = await fetch('/api/share-bonus', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ unlock_token: unlockToken }),
        });
        if (!bonusResponse.ok) throw new Error('share bonus registration failed');
        setShareBonusGranted(true);
      }
      if (result === 'download') alert('카카오 공유를 준비하지 못해 이미지를 저장하고 서비스 주소를 복사했어요.');
    } catch {
      alert('공유 카드를 준비하지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setIsShareLoading(false);
    }
  };



  const value = {
    step,
    birthData,
    careerContext,
    sajuResult,
    isUnlocked,
    isAILoading,
    unlockLoadingText,
    unlockError,
    aiReport,
    showManualPayModal,
    savedSession,
    showLookupModal,
    isLookupLoading,
    lookupError,
    lookupSentMessage,
    reportHistory,
    deepLinkError,
    appliedCoupon,
    couponMessage,
    couponError,
    isCouponChecking,
    showSecretCoupon,
    secretClickCount,
    copy,
    price,
    followUps,
    shareBonusGranted,
    followUpError,
    isFollowUpLoading,
    isShareLoading,
    isShareConfirming,
    unlockToken,
    loadingText,
    setStep,
    setBirthData,
    setCareerContext,
    setSajuResult,
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
    setSecretClickCount,
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
    restoreSavedSession,
    handleUnlock,
    handleEmailLookup,
    handleSelectPastReport,
    handleFollowUpSubmit,
    handleDownloadCard,
    handleShareResult,
    handleApplyCoupon,
    pollShareBonusStatus,
    checkout,
    currentInputStep,
    wheelDayCount,
    wheelDays,
    birthError,
    viralCardCanvasRef,
    summaryCardCanvasRef,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
