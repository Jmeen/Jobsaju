import { useState, useEffect, useRef } from 'react';
import { getSajuAnalysis } from './utils/sajuCore';
import type { SajuCoreResult } from './utils/sajuCore';
import { buildScoreBars, buildVerdictView } from './utils/reportViewModel';
import { buildPremiumExpansion } from './utils/premiumReport';
import { buildMonthlyFlow } from './utils/monthlyFlow';
import type { MonthTone } from './utils/monthlyFlow';
import { buildElementInsight, buildCharacterName } from './utils/reportInsights';
import { buildTopScore, buildAllScoreViews, AXIS_ICON } from './utils/scorePresentation';
import { resolveCopyVariant, getCopy } from './utils/copy';
import { resolvePriceVariant } from './utils/pricing';
import { validateFollowUpQuestion, buildLocalFollowUpAnswer, FOLLOW_UP_MAX_LENGTH } from './utils/followUp';
import type { FollowUpRecord } from './utils/followUp';
import { requestPremiumReport, lookupReportByEmail, lookupReportByToken, PremiumReportError } from './utils/premiumApi';
import type { ReportHistoryEntry } from './utils/premiumApi';
import { renderAllResultCards } from './utils/resultCardTargets';
import { buildShareCardModel, canvasToPngBlob, drawShareCard } from './utils/shareCard';
import { createSharePage, SHARE_BENEFIT_COPY, shareCareerResult, upload as uploadShareCardImage } from './utils/kakaoShare';
import { getCharacterAsset } from './utils/characterAssets';
import { buildShareHook, earnsBonusQuestion } from './utils/shareIncentive';
import { FollowUpLoading, FormattedAnswer } from './components/FollowUpContent';
import { BusinessFooter } from './components/BusinessFooter';
import { ReportProse } from './components/ReportProse';
import { buildCharacterTypeLabel, REPORT_HEADINGS } from './utils/reportCopy';
import { CHECKOUT_COPY, buildCheckoutPresentation, runCheckoutAction } from './utils/checkoutPresentation';

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

const STORAGE_KEY = 'saju_session_v1';

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

const CURRENT_YEAR = new Date().getFullYear();
const WHEEL_YEARS = Array.from({ length: CURRENT_YEAR - 1920 + 1 }, (_, i) => 1920 + i);
const WHEEL_MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const WHEEL_HOURS = Array.from({ length: 24 }, (_, i) => i);
const WHEEL_MINUTES = Array.from({ length: 60 }, (_, i) => i);

function daysInMonth(year: number, month: number, isSolar: boolean): number {
  if (!isSolar) return 30; // 음력은 만세력 변환 전이라 30일 상한으로 넉넉히 받아둔다
  if (!year || !month) return 31;
  return new Date(year, month, 0).getDate();
}

/** 값이 바뀌면 해당 항목이 가운데로 오도록 스크롤을 맞추는 iOS 스타일 휠 피커 */
function WheelColumn({
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

export default function App() {
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
  const [emailInput, setEmailInput] = useState('');
  const [isAILoading, setIsAILoading] = useState(false);
  const [unlockLoadingText, setUnlockLoadingText] = useState('결제를 확인하는 중...');
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [aiReport, setAiReport] = useState<any | null>(null);
  const [showManualPayModal, setShowManualPayModal] = useState(false);
  const [savedSession, setSavedSession] = useState<SavedSession | null>(() => loadSavedSession());

  // === 이메일 기반 리포트 조회 모달 상태 ===
  const [showLookupModal, setShowLookupModal] = useState(false);
  const [lookupEmailInput, setLookupEmailInput] = useState('');
  const [isLookupLoading, setIsLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  // 이메일로 열람 링크 발송 요청이 성공했을 때 안내 문구 (리포트는 메일 링크를 눌러야 열람 가능)
  const [lookupSentMessage, setLookupSentMessage] = useState<string | null>(null);
  // 이메일로 조회했을 때 해당 이메일로 구매한 전체 리포트 이력(최신순) — 과거 리포트 선택 UI에 사용
  const [reportHistory, setReportHistory] = useState<ReportHistoryEntry[]>([]);
  // 이메일 딥링크(?token=...) 복구가 실패했을 때 빈 화면 대신 안내할 메시지
  const [deepLinkError, setDeepLinkError] = useState<string | null>(null);

  // === 쿠폰 시스템 상태 ===
  const [couponInput, setCouponInput] = useState('');
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
  const [followUpInput, setFollowUpInput] = useState('');
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
    const tokenParam = params.get('token');
    const emailParam = params.get('email');

    if (tokenParam) {
      setIsLookupLoading(true);
      lookupReportByToken(tokenParam)
        .then(data => {
          if (data?.report) {
            setAiReport(data.report);
            setIsUnlocked(true);
            setUnlockToken(tokenParam);
            setReportHistory(data.history || []);
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
      setEmailInput(emailParam);
      setLookupEmailInput(emailParam);
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
  const handleApplyCoupon = async () => {
    const raw = couponInput.trim().toUpperCase();
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

    // 리포트 생성이 오래 걸리므로, 완료 시 알림을 보낼 수 있도록 지금(클릭 시점=사용자 제스처) 권한을 요청해 둔다
    try {
      if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
        Notification.requestPermission();
      }
    } catch { /* 알림 미지원 환경은 조용히 무시 */ }

    setIsAILoading(true);
    setUnlockError(null);

    // 쿠폰이 없으면 paymentId를 비워 서버로 보낸다 — 실제 PG 연동 전까지는 쿠폰 없이는 해금되지 않는다.
    // (예전엔 여기서 임의로 "sandbox-" 문자열을 만들어 보냈는데, 서버가 그 접두사만 보고 무조건
    // 통과시켜서 쿠폰 유무와 무관하게 전원 무료로 열리는 상태였다.)
    const paymentId = appliedCoupon ? `coupon-${appliedCoupon}` : '';

    try {
      // 1. 서버리스 클라우드플레어 Workers API 경로 호출 시도
      // (만약 로컬 실행이고 백엔드 서버가 켜져 있지 않은 상태면 에러 캐치 후 고품질 Mock 데이터로 스위칭)
      const data = await requestPremiumReport({
          user_context: {
            email: email.trim(),
            gender: birthData.gender === 1 ? "남성" : "여성",
            current_status: careerContext.current_status,
            main_concern: Array.isArray(careerContext.main_concern)
              ? careerContext.main_concern.join(', ')
              : careerContext.main_concern,
            current_job: careerContext.current_job,
            career_goal: careerContext.career_goal,
            desired_answer: careerContext.desired_answer,
            // 이메일 딥링크로 재접속했을 때 사주를 다시 계산할 수 있도록 원본 출생정보를 함께 보관해 둔다.
            birth_data: birthData
          },
          saju_data: {
            pillars: {
              year: `${sajuResult?.pillars.year.ganHanja}${sajuResult?.pillars.year.zhiHanja} (${sajuResult?.pillars.year.gan}${sajuResult?.pillars.year.zhi})`,
              month: `${sajuResult?.pillars.month.ganHanja}${sajuResult?.pillars.month.zhiHanja} (${sajuResult?.pillars.month.gan}${sajuResult?.pillars.month.zhi})`,
              day: `${sajuResult?.pillars.day.ganHanja}${sajuResult?.pillars.day.zhiHanja} (${sajuResult?.pillars.day.gan}${sajuResult?.pillars.day.zhi})`,
              hour: sajuResult?.pillars.hour.gan 
                ? `${sajuResult?.pillars.hour.ganHanja}${sajuResult?.pillars.hour.zhiHanja} (${sajuResult?.pillars.hour.gan}${sajuResult?.pillars.hour.zhi})`
                : "모름"
            },
            day_gan: `${sajuResult?.dayGan.hanja} (${sajuResult?.dayGan.char}${sajuResult?.dayGan.element})`,
            elements: {
              wood: sajuResult?.elementsCount.wood,
              fire: sajuResult?.elementsCount.fire,
              earth: sajuResult?.elementsCount.earth,
              metal: sajuResult?.elementsCount.metal,
              water: sajuResult?.elementsCount.water
            },
            scores: {
              job_change: sajuResult?.scores.jobChange,
              stay: sajuResult?.scores.stay,
              negotiation: sajuResult?.scores.negotiation
            },
            body_strength: sajuResult
              ? (sajuResult.bodyStrength > 0.2 ? '신강' : sajuResult.bodyStrength < -0.2 ? '신약' : '중화')
              : undefined,
            daewun: sajuResult?.daewun.current
              ? `${sajuResult.daewun.current.ganZhi} 대운 (${sajuResult.daewun.current.startAge}~${sajuResult.daewun.current.endAge}세)`
              : '대운 정보 없음',
            seewun_year: sajuResult?.seewun.year,
            seewun_ganzhi: sajuResult?.seewun.ganZhi
          }
      }, fetch, paymentId, appliedCoupon || undefined);

      // 실제 AI 응답 — 폴백으로 덮어쓰지 않는다
      setUnlockToken(data.unlockToken || 'local-developer-unlock-token');
      setAiReport({ ...data, source: 'ai' });
      setIsUnlocked(true);
      setShowManualPayModal(false);
      notifyReportReady(true);
    } catch (error) {
      if (error instanceof PremiumReportError) {
        // 서버가 실제로 응답했는데 결제/리포트 생성이 실패한 경우 — 예전엔 이 경우에도 조용히
        // 가짜 리포트로 넘어가서 "생성 성공"처럼 보였지만, 서버엔 아무것도 저장되지 않아
        // 나중에 이메일로 조회하면 "내역 없음"으로 뜨는 문제가 있었다. 이제는 실패를 그대로 알린다.
        setUnlockError(error.message);
      } else if (import.meta.env.DEV) {
        // 로컬 개발 환경에서 백엔드가 꺼져 있을 때만 목업으로 대체한다. 운영 환경까지 여기로 오면
        // 실제 unlockToken이 발급되지 않은 채 isUnlocked만 true가 되어, 이후 추가 질문(/api/followup)이
        // "해금 토큰이 유효하지 않습니다"로 실패하는데도 사용자는 해금된 것처럼 보이는 문제가 있었다.
        console.warn("AI 백엔드에 연결하지 못해 규칙 기반 고품질 리포트로 해금을 진행합니다:", error);
        setAiReport(createFallbackReport());
        setIsUnlocked(true);
        setShowManualPayModal(false);
        notifyReportReady(true);
      } else {
        console.warn("AI 백엔드 연결 실패:", error);
        setUnlockError('리포트 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.');
      }
    } finally {
      setIsAILoading(false);
    }
  };

  // === 이메일 주소로 구매한 해금 리포트 열람 링크 발송 요청 ===
  // 화면에 바로 리포트를 띄우지 않는다 — 이메일 주소만 아는 사람이 남의 리포트를 볼 수 없도록,
  // 실제로 그 메일함을 열 수 있는 사람만 링크를 눌러 열람하게 한다.
  const handleEmailLookup = async () => {
    if (!lookupEmailInput || !lookupEmailInput.includes('@')) {
      setLookupError('올바른 이메일 주소를 입력해 주세요.');
      return;
    }
    setIsLookupLoading(true);
    setLookupError(null);
    setLookupSentMessage(null);

    try {
      const data = await lookupReportByEmail(lookupEmailInput);
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
  const handleFollowUpSubmit = async () => {
    const questionLimit = shareBonusGranted ? 2 : 1;
    if (!sajuResult || followUps.length >= questionLimit) return;

    const validationError = validateFollowUpQuestion(followUpInput);
    if (validationError) {
      setFollowUpError(validationError);
      return;
    }

    setFollowUpError(null);
    setIsFollowUpLoading(true);
    const question = followUpInput.trim();

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
            daewun: sajuResult.daewun.current?.ganZhi || '',
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
      setFollowUpInput('');
    }
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
      const shareDescription = SHARE_BENEFIT_COPY;
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

      {/* === Screen 1. Intro === */}
      {!deepLinkError && step === 'intro' && (
        <div className="intro-screen">
          <div className="intro-brand"><span>커리어 사주</span></div>
          <div className="intro-content">
            <span className="eyebrow">{copy.eyebrow}</span>
            <h1>{copy.headline.map((line, i) => (
              <span key={line}>{i > 0 && <br />}{line}</span>
            ))}</h1>
            <p>{copy.subcopy.map((line, i) => (
              <span key={line}>{i > 0 && <br />}{line}</span>
            ))}</p>
            <div className="intro-proof">
              {copy.proof.map(item => (
                <div key={item.label}><strong>{item.value}</strong><span>{item.label}</span></div>
              ))}
            </div>
          </div>
          <div className="intro-cta">
            <button className="btn-primary" onClick={() => setStep('birth')}>{copy.cta} <span>→</span></button>
            {savedSession && (
              <button className="btn-secondary" style={{ width: '100%' }} onClick={restoreSavedSession}>
                지난 결과 다시 보기{savedSession.isUnlocked ? CHECKOUT_COPY.savedResultSuffix : ''}
              </button>
            )}
            <button 
              className="btn-secondary" 
              style={{ width: '100%', borderColor: 'var(--border-neon)' }} 
              onClick={() => { setShowLookupModal(true); setLookupError(null); }}
            >
              이메일로 내 리포트 찾기 🔍
            </button>
            <p>{copy.ctaNote}</p>
          </div>
        </div>
      )}

      {/* === Screen 2. Birth Info === */}
      {step === 'birth' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: 28 }}>
            <h2>출생 정보 입력</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 6, lineHeight: 1.5 }}>정통 만세력 계산을 위해 태어난 일시를 입력해 주세요.</p>
          </div>

          <div className="glass-card" style={{ padding: '20px 16px', marginBottom: 20 }}>
            {/* 성별 및 양음력 선택 (가로 2단 나란히 배치로 공간 극대화) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: 12, marginBottom: 6 }}>성별 (대운용)</label>
                <div className="tab-group" style={{ marginBottom: 0, padding: 3 }}>
                  <button 
                    className={`tab-button ${birthData.gender === 1 ? 'active' : ''}`}
                    style={{ padding: '8px 4px', fontSize: 13 }}
                    onClick={() => setBirthData({ ...birthData, gender: 1 })}
                  >남성</button>
                  <button 
                    className={`tab-button ${birthData.gender === 0 ? 'active' : ''}`}
                    style={{ padding: '8px 4px', fontSize: 13 }}
                    onClick={() => setBirthData({ ...birthData, gender: 0 })}
                  >여성</button>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: 12, marginBottom: 6 }}>양력 / 음력</label>
                <div className="tab-group" style={{ marginBottom: 0, padding: 3 }}>
                  <button 
                    className={`tab-button ${birthData.isSolar ? 'active' : ''}`}
                    style={{ padding: '8px 4px', fontSize: 13 }}
                    onClick={() => setBirthData({ ...birthData, isSolar: true })}
                  >양력</button>
                  <button 
                    className={`tab-button ${!birthData.isSolar ? 'active' : ''}`}
                    style={{ padding: '8px 4px', fontSize: 13 }}
                    onClick={() => setBirthData({ ...birthData, isSolar: false })}
                  >음력</button>
                </div>
              </div>
            </div>

            {/* 생년월일 */}
            <div className="form-group">
              <label className="form-label">생년월일</label>
              <div className="wheel-row">
                <WheelColumn
                  values={WHEEL_YEARS}
                  value={parseInt(birthData.year) || CURRENT_YEAR}
                  onChange={v => setBirthData(prev => ({ ...prev, year: String(v) }))}
                  formatValue={v => `${v}년`}
                  ariaLabel="출생 연도"
                />
                <WheelColumn
                  values={WHEEL_MONTHS}
                  value={parseInt(birthData.month) || 1}
                  onChange={v => setBirthData(prev => ({ ...prev, month: String(v) }))}
                  formatValue={v => `${v}월`}
                  ariaLabel="출생 월"
                />
                <WheelColumn
                  values={wheelDays}
                  value={Math.min(parseInt(birthData.day) || 1, wheelDayCount)}
                  onChange={v => setBirthData(prev => ({ ...prev, day: String(v) }))}
                  formatValue={v => `${v}일`}
                  ariaLabel="출생 일"
                />
              </div>
            </div>

            {/* 출생시간 유무 */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label className="form-label" style={{ marginBottom: 0 }}>태어난 시간</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  <input
                    type="checkbox" checked={!birthData.hasTime}
                    onChange={e => setBirthData({ ...birthData, hasTime: !e.target.checked })}
                  />
                  태어난 시간 모름 (삼주 분석)
                </label>
              </div>

              {birthData.hasTime && (
                <div className="wheel-row wheel-row-2">
                  <WheelColumn
                    values={WHEEL_HOURS}
                    value={parseInt(birthData.hour) || 0}
                    onChange={v => setBirthData(prev => ({ ...prev, hour: String(v) }))}
                    formatValue={v => `${v}시`}
                    ariaLabel="출생 시"
                  />
                  <WheelColumn
                    values={WHEEL_MINUTES}
                    value={parseInt(birthData.minute) || 0}
                    onChange={v => setBirthData(prev => ({ ...prev, minute: String(v) }))}
                    formatValue={v => `${v}분`}
                    ariaLabel="출생 분"
                  />
                </div>
              )}
            </div>
          </div>

          {birthError && (
            <p style={{ color: '#e08a7a', fontSize: 13, marginBottom: 12, textAlign: 'center' }}>{birthError}</p>
          )}
          <div style={{ marginTop: 'auto', paddingTop: 8 }}>
            <button className="btn-primary" disabled={!!birthError} onClick={() => setStep('q_status')}>다음 단계</button>
          </div>
        </div>
      )}

      {/* === Screen 3. Q&A Current Status === */}
      {step === 'q_status' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: 28 }}>
            <h2>현재 커리어 상황은 어떤가요?</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 6, lineHeight: 1.5 }}>현재 상황과 가장 가까운 항목을 선택해 주세요.</p>
          </div>

          <div className="option-grid" style={{ marginBottom: 30 }}>
            {[
              "적극적으로 여러 회사에 이직 시도 중",
              "최근 오퍼 제안을 받고 이직 여부 조율 중",
              "현 직장에 남을지 이직을 시작할지 고민 중",
              "퇴사 후 휴식 혹은 1인 창업/사이드잡 준비 중"
            ].map(status => (
              <button 
                key={status}
                className={`option-button ${careerContext.current_status === status ? 'selected' : ''}`}
                onClick={() => setCareerContext({ ...careerContext, current_status: status })}
              >
                {status}
                {careerContext.current_status === status && <span style={{ color: 'var(--accent-purple)' }}>✓</span>}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 'auto', paddingTop: 8 }}>
            <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setStep('birth')}>이전</button>
            <button 
              className="btn-primary" style={{ flex: 2 }} 
              disabled={!careerContext.current_status}
              onClick={() => setStep('q_concern')}
            >다음 단계</button>
          </div>
        </div>
      )}

      {/* === Screen 4. Q&A Main Concern (Multi-select) === */}
      {step === 'q_concern' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: 28 }}>
            <h2>현 직장에서 가장 큰 고민은 무엇인가요?</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 6, lineHeight: 1.5 }}>여러 항목을 선택할 수 있으며, 선택한 내용은 종합 분석에 반영됩니다.</p>
          </div>

          <div className="option-grid" style={{ marginBottom: 30 }}>
            {[
              "연봉 및 보상 (내가 일한 가치에 미치지 못하는 보상)",
              "성장 가능성 (이 직무에 더 배울 것이 없거나 도태되는 느낌)",
              "조직 문화 및 상사/동료 갈등 (인간관계 스트레스)",
              "안정성 (회사의 경영난 및 구조조정 불안감)",
              "워라밸 (야근이 너무 많아 삶의 균형 붕괴)"
            ].map(concern => {
              const isSelected = careerContext.main_concern.includes(concern);
              const toggleConcern = () => {
                setCareerContext(prev => {
                  const newConcerns = isSelected
                    ? prev.main_concern.filter(c => c !== concern)
                    : [...prev.main_concern, concern];
                  return { ...prev, main_concern: newConcerns };
                });
              };

              return (
                <button 
                  key={concern}
                  className={`option-button ${isSelected ? 'selected' : ''}`}
                  onClick={toggleConcern}
                >
                  {concern.split(' ')[0]} {/* 요약어 노출 */}
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 8 }}>
                    {concern.slice(concern.indexOf('('))}
                  </span>
                  {isSelected && <span style={{ color: 'var(--accent-purple)' }}>✓</span>}
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 'auto', paddingTop: 8 }}>
            <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setStep('q_status')}>이전</button>
            <button 
              className="btn-primary" style={{ flex: 2 }} 
              disabled={careerContext.main_concern.length === 0}
              onClick={() => setStep('q_desired')}
            >다음 단계</button>
          </div>
        </div>
      )}

      {/* === Screen 5. Q&A Career Profile & Desired Answer (Free Text Input Form) === */}
      {step === 'q_desired' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: 28 }}>
            <h2>나의 커리어 프로필과 상세 고민</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 6, lineHeight: 1.5 }}>
              구체적으로 적어주실수록 입력한 상황과 운의 흐름을 함께 반영해 더 세밀하게 분석합니다. (선택사항)
            </p>
          </div>

          <div className="glass-card" style={{ padding: '22px 18px', marginBottom: 20 }}>
            {/* 현재 하고 계신 일 */}
            <div className="form-group" style={{ marginBottom: 18 }}>
              <label className="form-label" style={{ marginBottom: 8 }}>현재 하시는 일 (직무 및 연차)</label>
              <input
                type="text"
                className="input-text"
                placeholder="예: 6년차 풀스택 소프트웨어 엔지니어"
                value={careerContext.current_job}
                onChange={e => setCareerContext({ ...careerContext, current_job: e.target.value })}
              />
            </div>

            {/* 최종 커리어의 골 */}
            <div className="form-group" style={{ marginBottom: 18 }}>
              <label className="form-label" style={{ marginBottom: 8 }}>최종 커리어 목표 (도달하고 싶은 지향점)</label>
              <input
                type="text"
                className="input-text"
                placeholder="예: 나만의 B2B SaaS 스타트업 창업 및 운영"
                value={careerContext.career_goal}
                onChange={e => setCareerContext({ ...careerContext, career_goal: e.target.value })}
              />
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6, lineHeight: 1.45 }}>
                지금의 목표를 구체적으로 적을수록 그 목표에 맞춰 더 자세하고 맞춤화된 분석을 받을 수 있어요.
              </p>
            </div>

            {/* 상세 고민 */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ marginBottom: 8 }}>현재 상황이나 구체적인 고민 정황</label>
              <textarea
                className="input-text"
                rows={4}
                style={{
                  width: '100%',
                  resize: 'vertical',
                  minHeight: 96,
                  fontFamily: 'inherit',
                  padding: '12px 14px',
                  fontSize: 13.5,
                  lineHeight: 1.6,
                  color: '#fff'
                }}
                placeholder="예: 이번에 이직 제안을 한 곳이 있는데 연봉 조율을 세게 해도 괜찮은 운세인지 궁금해요. 혹은 지금 상사와의 갈등 때문에 충동적으로 퇴사하고 싶은데 버티는 게 답일까요?"
                value={careerContext.desired_answer}
                onChange={e => setCareerContext({ ...careerContext, desired_answer: e.target.value })}
              />
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6, lineHeight: 1.45 }}>
                지금 처한 상황을 구체적으로 적을수록 그 상황에 맞춰 더 자세하고 맞춤화된 분석을 받을 수 있어요.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 'auto', paddingTop: 8 }}>
            <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setStep('q_concern')}>이전</button>
            <button 
              className="btn-primary" style={{ flex: 2 }} 
              onClick={() => setStep('loading')}
            >결과 확인하기</button>
          </div>
        </div>
      )}

      {/* === Screen 6. Loading Step === */}
      {step === 'loading' && (
        <div className="analysis-loading">
          <div className="analysis-pulse"><span /></div>
          <span className="eyebrow">커리어 흐름 분석 중</span>
          <h2>{copy.loadingTitle.map((line, i) => (
            <span key={line}>{i > 0 && <br />}{line}</span>
          ))}</h2>
          <p>{loadingText}</p>
          <div className="loading-track"><span /></div>
        </div>
      )}

      {/* === Screen 7. Result Summary (Free + Locked/Unlocked Area) === */}
      {step === 'result' && sajuResult && (
        <div className="result-screen">
          
          {/* Top Header info */}
          <div className="result-header">
            <div className="intro-brand"><span>커리어 리포트</span></div>
            <span className="result-date">
              {birthData.isSolar ? '양력' : '음력'} {birthData.year}.{birthData.month}.{birthData.day} {birthData.hasTime ? `${birthData.hour}:${birthData.minute}` : '(시간 모름)'}
              {!birthData.isSolar && ` · 양력 ${sajuResult.solarDate.year}.${sajuResult.solarDate.month}.${sajuResult.solarDate.day} 기준 계산`}
            </span>
          </div>

          <div className="result-primary">

          {/* 내 일간 크리처 — 결과를 열자마자 가장 먼저 보이는 "내 카드" */}
          {(() => {
            const character = getCharacterAsset(sajuResult.dayGan.char);
            const top = buildTopScore(sajuResult.scores);
            return (
              <section className="creature-hero" aria-label={`${character.title}, ${top.axisLabel} 우세`}>
                <div className={`creature-hero-stage tone-${top.tone}`}>
                  <img
                    src={character.imageUrl}
                    alt=""
                    aria-hidden="true"
                    className="creature-hero-img"
                    width={640}
                    height={640}
                    loading="eager"
                  />
                  <div className="creature-hero-no">No. {String(character.collectionNo).padStart(2, '0')} / {character.collectionTotal}</div>
                  <div className="creature-hero-badge">{AXIS_ICON[top.axis]} {top.axisLabel} 우세</div>
                </div>
                <strong className="creature-hero-title">{character.title}</strong>
                <span className="creature-hero-type">{buildCharacterTypeLabel(character.elementLabel, character.title, top.axisLabel)}</span>
              </section>
            );
          })()}

          <section className="verdict-card">
            <span className="eyebrow">{buildVerdictView(sajuResult.scores).isClose ? `${REPORT_HEADINGS.verdict} · 점수 근접` : REPORT_HEADINGS.verdict}</span>
            <h1>{buildVerdictView(sajuResult.scores).title}</h1>
            <p>{buildVerdictView(sajuResult.scores).subtitle}</p>
          </section>

          {/* 현재 가장 높은 선택 지표 */}
          {(() => {
            const top = buildTopScore(sajuResult.scores);
            return (
              <section className={`rank-card rank-${top.tone}`}>
                <span className="eyebrow">{REPORT_HEADINGS.strongestFlow}</span>
                <strong>{top.headline}</strong>
                <p>{top.detail}</p>
              </section>
            );
          })()}

          <section className="glass-card score-report">
            <div className="section-heading"><div><span className="eyebrow">{REPORT_HEADINGS.scoreComparison}</span><h3>{REPORT_HEADINGS.scoreComparisonTitle}</h3></div><span>100점 기준</span></div>
            <div className="score-bars">
              {buildScoreBars(sajuResult.scores).map(score => {
                const scoreView = buildAllScoreViews(sajuResult.scores).find(view => view.axis === score.key);
                return (
                  <div className="score-row" key={score.key}>
                    <div className="score-meta">
                      <span>{score.label}{scoreView && <em className="score-rank">{scoreView.level}</em>}</span>
                      <strong>{score.value}</strong>
                    </div>
                    <div className="score-track"><span className={`score-fill ${score.tone}`} style={{ width: `${score.width}%` }} /></div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="next-action-card">
            <span className="action-index">01</span>
            <div><span className="eyebrow">{REPORT_HEADINGS.nextAction}</span><h3>{buildVerdictView(sajuResult.scores).action.title}</h3><p>{buildVerdictView(sajuResult.scores).action.desc}</p></div>
          </section>

          {/* 이번 달 브리핑 — 매달 바뀌므로 다시 찾아올 이유가 된다 (무료) */}
          {(() => {
            const natalZhis = [
              sajuResult.pillars.year.zhi,
              sajuResult.pillars.month.zhi,
              sajuResult.pillars.day.zhi,
              ...(sajuResult.pillars.hour.zhi ? [sajuResult.pillars.hour.zhi] : []),
            ];
            const thisMonth = buildMonthlyFlow(sajuResult.dayGan.char, natalZhis, 1)[0];
            if (!thisMonth) return null;

            return (
              <section className="month-brief-card">
                <div className="month-brief-head">
                  <span className="eyebrow">{thisMonth.year}년 {thisMonth.month}월의 흐름</span>
                  <span className="month-brief-ganzhi">{thisMonth.ganZhi}월</span>
                </div>
                <h3>{thisMonth.label.replace(/^\d+월 \[|\]$/g, '')}</h3>
                <p>{thisMonth.description}</p>
                <small>달이 바뀌면 이 조언도 함께 바뀝니다.</small>
              </section>
            );
          })()}

          </div>

          {/* 사주 원국표 (무료) — 판단과 행동 요약 다음에 근거로 제공 */}
          <div className="glass-card evidence-card result-evidence">
            <div className="section-heading"><div><span className="eyebrow">{REPORT_HEADINGS.evidence}</span><h3>{REPORT_HEADINGS.chart}</h3></div><span>{sajuResult.dayGan.char}목 본원</span></div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
              {/* 시주 */}
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: 8, borderRadius: 10, textAlign: 'center', border: '1px solid rgba(255,255,255,0.03)' }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>시주</span>
                {sajuResult.pillars.hour.gan ? (
                  <>
                    <h4 style={{ color: 'var(--accent-purple)', fontSize: 18, marginTop: 4 }}>{sajuResult.pillars.hour.ganHanja}{sajuResult.pillars.hour.zhiHanja}</h4>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{sajuResult.pillars.hour.gan}{sajuResult.pillars.hour.zhi}</span>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>{sajuResult.pillars.hour.shiShen}</div>
                  </>
                ) : (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>모름</div>
                )}
              </div>

              {/* 일주 */}
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: 8, borderRadius: 10, textAlign: 'center', border: '1px solid var(--border-neon)' }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>일주 (나)</span>
                <h4 style={{ color: 'var(--accent-pink)', fontSize: 18, marginTop: 4 }}>{sajuResult.pillars.day.ganHanja}{sajuResult.pillars.day.zhiHanja}</h4>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{sajuResult.pillars.day.gan}{sajuResult.pillars.day.zhi}</span>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>{sajuResult.pillars.day.shiShen}</div>
              </div>

              {/* 월주 */}
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: 8, borderRadius: 10, textAlign: 'center', border: '1px solid rgba(255,255,255,0.03)' }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>월주</span>
                <h4 style={{ color: 'var(--accent-purple)', fontSize: 18, marginTop: 4 }}>{sajuResult.pillars.month.ganHanja}{sajuResult.pillars.month.zhiHanja}</h4>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{sajuResult.pillars.month.gan}{sajuResult.pillars.month.zhi}</span>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>{sajuResult.pillars.month.shiShen}</div>
              </div>

              {/* 연주 */}
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: 8, borderRadius: 10, textAlign: 'center', border: '1px solid rgba(255,255,255,0.03)' }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>연주</span>
                <h4 style={{ color: 'var(--accent-purple)', fontSize: 18, marginTop: 4 }}>{sajuResult.pillars.year.ganHanja}{sajuResult.pillars.year.zhiHanja}</h4>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{sajuResult.pillars.year.gan}{sajuResult.pillars.year.zhi}</span>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>{sajuResult.pillars.year.shiShen}</div>
              </div>
            </div>
          </div>

          {/* === LOCKED / UNLOCKED AREA === */}
          <div className="locked-area">
            
            {/* 1. Locked Overlay (Only shown when not unlocked) */}
            {!isUnlocked && (
              <div className="unlock-overlay">
                <div className="unlock-card">
                  <h3 style={{ fontSize: 18, color: '#fff', marginBottom: 8 }}>{copy.unlockTitle}</h3>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.5 }}>
                    {copy.unlockBody}
                  </p>

                  {/* 6개월 로드맵 미리보기 — 가장 반응이 좋은 기능이므로 결제 전에 실물을 보여준다 */}
                  {(() => {
                    const natalZhis = [
                      sajuResult.pillars.year.zhi,
                      sajuResult.pillars.month.zhi,
                      sajuResult.pillars.day.zhi,
                      ...(sajuResult.pillars.hour.zhi ? [sajuResult.pillars.hour.zhi] : []),
                    ];
                    const preview = buildMonthlyFlow(sajuResult.dayGan.char, natalZhis, 6);
                    return (
                      <div className="roadmap-teaser">
                        <span className="roadmap-teaser-title">내 6개월 이직 로드맵</span>
                        <ul>
                          {preview.map((m, i) => (
                            <li key={`${m.year}-${m.month}`} className={i < 2 ? 'open' : 'locked'}>
                              <strong>{m.month}월</strong>
                              <span>{i < 2 ? m.label.replace(/^\d+월 \[|\]$/g, '') : '••••••'}</span>
                              {m.isPeak && i < 2 && <em>가장 강한 달</em>}
                              {i >= 2 && <i>🔒</i>}
                            </li>
                          ))}
                        </ul>
                        <small>달마다 무엇을 해야 하는지, 왜 그런지까지 전부 열립니다.</small>
                      </div>
                    );
                  })()}

                  <p style={{ fontSize: 12, color: 'var(--accent-purple)', margin: '16px 0 20px' }}>
                    ✓ 궁금증 1가지를 추가로 질문할 수 있습니다.
                  </p>
                  <button className="btn-primary" onClick={() => setShowManualPayModal(true)}>
                    {copy.unlockCta(price.label)}
                  </button>
                </div>
              </div>
            )}

            {/* 2. Content Area (Blurred when locked) */}
            <div className={`report-details${!isUnlocked ? ' blur-content' : ''}`}>
              
              {/* Continuous premium report */}
              {aiReport && (
                <div>
                  {reportHistory.length > 1 && (
                    <div className="glass-card" style={{ textAlign: 'left', marginBottom: 16, padding: 14 }}>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>
                        이 이메일로 구매한 리포트가 {reportHistory.length}건 있어요. 보고 싶은 리포트를 선택하세요.
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {reportHistory.map((entry, idx) => {
                          const isActive = entry.unlock_token === unlockToken;
                          return (
                            <button
                              key={entry.unlock_token}
                              type="button"
                              onClick={() => handleSelectPastReport(entry.unlock_token)}
                              disabled={isLookupLoading}
                              style={{
                                textAlign: 'left', padding: '8px 12px', borderRadius: 8,
                                border: isActive ? '1px solid var(--border-neon-bright)' : '1px solid rgba(255,255,255,0.08)',
                                background: isActive ? 'rgba(168,85,247,0.12)' : 'transparent',
                                color: '#fff', cursor: isLookupLoading ? 'default' : 'pointer', fontSize: 12,
                              }}
                            >
                              <strong>{entry.label}</strong>
                              {idx === 0 && <span style={{ marginLeft: 6, color: '#4ade80' }}>· 최신</span>}
                              {entry.created_at && (
                                <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 2 }}>
                                  {new Date(entry.created_at).toLocaleDateString('ko-KR')}
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                      {lookupError && (
                        <p style={{ color: '#f87171', fontSize: 12, marginTop: 8, marginBottom: 0 }}>{lookupError}</p>
                      )}
                    </div>
                  )}
                  {aiReport.source === 'fallback' && (
                    <p className="fallback-notice">
                      규칙 기반 간이 리포트입니다 — AI 상담 서버가 연결되면 입력한 고민을 더 깊게 반영한 해석이 제공됩니다.
                    </p>
                  )}
                  {aiReport.intent_summary && (
                    <section className="intent-card">
                      <span className="eyebrow">{REPORT_HEADINGS.intent}</span>
                      <h3>{aiReport.intent_summary.primary_question}</h3>
                      <p>{aiReport.intent_summary.role_interpretation}</p>
                      <div className="assumption-list">
                        {aiReport.intent_summary.assumptions.map((item: string) => <span key={item}>{item}</span>)}
                      </div>
                      {aiReport.intent_summary.needs_clarification && <small>직함의 정확한 의미는 실제 업무 범위를 확인한 뒤 판단해야 합니다.</small>}
                    </section>
                  )}
                  {aiReport.decision_factors && (
                    <section className="decision-factor-card">
                      <span className="eyebrow">{REPORT_HEADINGS.decisionFactors}</span>
                      <p>{aiReport.decision_factors.summary}</p>
                      <strong>{aiReport.decision_factors.recommendation}</strong>
                      <div className="decision-checks">
                        {aiReport.decision_factors.checks?.map((item: string) => <span key={item}>{item}</span>)}
                      </div>
                    </section>
                  )}
                  {/* One line conclusion */}
                  <div className="glass-card" style={{ textAlign: 'left' }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-purple)', display: 'block', marginBottom: 6 }}>총평</span>
                    <p style={{ fontSize: 15, lineHeight: 1.5, color: '#f3f4f6' }}>{aiReport.one_line_conclusion}</p>
                  </div>

                  {aiReport.personal_answer && (
                    <section className="glass-card premium-section personal-answer">
                      <span className="report-number">01</span>
                      <span className="eyebrow">{REPORT_HEADINGS.personalAnswer}</span>
                      <h3>“{aiReport.personal_answer.question}”</h3>
                      <ReportProse text={aiReport.personal_answer.content} />
                    </section>
                  )}

                  {aiReport.current_dilemma && (
                    <section className="glass-card premium-section">
                      <span className="report-number">02</span>
                      <span className="eyebrow">{REPORT_HEADINGS.situation}</span>
                      <h3>{aiReport.current_dilemma.title}</h3>
                      <ReportProse text={aiReport.current_dilemma.content} />
                    </section>
                  )}

                  {aiReport.career_nature && (
                    <section className="glass-card premium-section">
                      <span className="report-number">03</span>
                      <span className="eyebrow">{REPORT_HEADINGS.careerNature}</span>
                      <h3>{aiReport.career_nature.title}</h3>
                      <ReportProse text={aiReport.career_nature.content} />
                      <div className="trait-grid">
                        <div><strong>{REPORT_HEADINGS.strengths}</strong>{aiReport.career_nature.strengths.map((item: string) => <span key={item}>{item}</span>)}</div>
                        <div><strong>{REPORT_HEADINGS.cautions}</strong>{aiReport.career_nature.cautions.map((item: string) => <span key={item}>{item}</span>)}</div>
                      </div>
                    </section>
                  )}

                  {aiReport.three_paths && (
                    <section className="glass-card premium-section">
                      <span className="report-number">04</span>
                      <span className="eyebrow">{REPORT_HEADINGS.paths}</span>
                      <h3>선택에 따라 무엇이 달라지는지</h3>
                      <div className="path-list">
                        {aiReport.three_paths.map((path: any) => (
                          <article key={path.key}>
                            <div><h4>{path.title}</h4><strong>{path.score}</strong></div>
                            <p>{path.content}</p>
                          </article>
                        ))}
                      </div>
                    </section>
                  )}

                  {aiReport.ideal_environment && (
                    <section className="glass-card premium-section">
                      <span className="report-number">05</span>
                      <span className="eyebrow">{REPORT_HEADINGS.environment}</span>
                      <h3>{aiReport.ideal_environment.title}</h3>
                      <ReportProse text={aiReport.ideal_environment.content} />
                      <div className="check-list">{aiReport.ideal_environment.checklist.map((item: string) => <span key={item}>{item}</span>)}</div>
                    </section>
                  )}

                  {aiReport.action_plan && (
                    <section className="glass-card premium-section">
                      <span className="report-number">06</span>
                      <span className="eyebrow">{REPORT_HEADINGS.actionPlan}</span>
                      <h3>이번 주에 할 일과 미룰 일</h3>
                      <div className="action-columns">
                        <div><strong>{REPORT_HEADINGS.actionDo}</strong>{aiReport.action_plan.do.map((item: string) => <span key={item}>{item}</span>)}</div>
                        <div><strong>{REPORT_HEADINGS.actionAvoid}</strong>{aiReport.action_plan.avoid.map((item: string) => <span key={item}>{item}</span>)}</div>
                      </div>
                    </section>
                  )}

                  {aiReport.closing_advice && (
                    <section className="closing-card">
                      <span className="eyebrow">{REPORT_HEADINGS.closing}</span>
                      <p>{aiReport.closing_advice}</p>
                    </section>
                  )}
                </div>
              )}

              {/* Monthly Timeline Calendar (월운 규칙 엔진 기반) */}
              <div className="glass-card" style={{ textAlign: 'left' }}>
                  <h3 style={{ fontSize: 16, color: '#fff', marginBottom: 12 }}>{REPORT_HEADINGS.roadmap}</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 16 }}>내 일간과 매달 실제 월운(월건)을 대조해 계산한 달별 추천 행동입니다.</p>

                  <div className="timeline-list">
                    {(() => {
                      const natalZhis = [
                        sajuResult.pillars.year.zhi,
                        sajuResult.pillars.month.zhi,
                        sajuResult.pillars.day.zhi,
                        ...(sajuResult.pillars.hour.zhi ? [sajuResult.pillars.hour.zhi] : []),
                      ];
                      const toneColor: Record<MonthTone, string> = {
                        move: 'var(--accent-purple)',
                        nego: 'var(--accent-pink)',
                        press: '#b3583f',
                        doc: 'var(--accent-blue)',
                        peer: 'var(--accent-cyan)',
                        calm: '#4d5a78',
                      };
                      return buildMonthlyFlow(sajuResult.dayGan.char, natalZhis, 6).map(plan => (
                        <div className="timeline-item" key={`${plan.year}-${plan.month}`}>
                          <div>
                            <span className="timeline-badge" style={{ background: toneColor[plan.tone] }}>
                              {plan.label}{plan.isPeak ? ' ★' : ''}
                            </span>
                            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{plan.description}</p>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
              </div>

              {/* Elements Radar Chart */}
              <div className="glass-card">
                  <h3 style={{ fontSize: 16, color: '#fff', marginBottom: 12, textAlign: 'left' }}>{REPORT_HEADINGS.elementProfile}</h3>
                  
                  {/* Radar Chart SVG rendering */}
                  <div className="radar-wrapper">
                    <svg className="radar-svg" width="220" height="220" viewBox="0 0 220 220">
                      {/* Grid Pentagon 1 (Outer) */}
                      <polygon points="110,10 205,79 169,191 51,191 15,79" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                      {/* Grid Pentagon 2 (Middle) */}
                      <polygon points="110,60 157.5,94.5 139.5,150.5 80.5,150.5 62.5,94.5" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                      
                      {/* Axes */}
                      <line x1="110" y1="110" x2="110" y2="10" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                      <line x1="110" y1="110" x2="205" y2="79" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                      <line x1="110" y1="110" x2="169" y2="191" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                      <line x1="110" y1="110" x2="51" y2="191" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                      <line x1="110" y1="110" x2="15" y2="79" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />

                      {/* Labels */}
                      <text x="110" y="5" fill="var(--text-secondary)" fontSize="10" textAnchor="middle">추진력 (목)</text>
                      <text x="210" y="82" fill="var(--text-secondary)" fontSize="10" textAnchor="start">열정/소통 (화)</text>
                      <text x="175" y="202" fill="var(--text-secondary)" fontSize="10" textAnchor="start">끈기/안정 (토)</text>
                      <text x="45" y="202" fill="var(--text-secondary)" fontSize="10" textAnchor="end">결단/실행 (금)</text>
                      <text x="10" y="82" fill="var(--text-secondary)" fontSize="10" textAnchor="end">기획/전략 (수)</text>

                      {/* Data polygon (Dynamically generated based on elementsCount) */}
                      {/* Scale elementsCount to radar coordinate. Element maximum = 5 */}
                      {(() => {
                        const maxVal = 5;
                        const w = Math.max(0.5, Math.min(maxVal, sajuResult.elementsCount.wood));
                        const f = Math.max(0.5, Math.min(maxVal, sajuResult.elementsCount.fire));
                        const e = Math.max(0.5, Math.min(maxVal, sajuResult.elementsCount.earth));
                        const m = Math.max(0.5, Math.min(maxVal, sajuResult.elementsCount.metal));
                        const wa = Math.max(0.5, Math.min(maxVal, sajuResult.elementsCount.water));

                        const p1 = { x: 110, y: 110 - (100 * (w / maxVal)) };
                        const p2 = { x: 110 + (95 * (f / maxVal)), y: 110 - (31 * (f / maxVal)) };
                        const p3 = { x: 110 + (59 * (e / maxVal)), y: 110 + (81 * (e / maxVal)) };
                        const p4 = { x: 110 - (59 * (m / maxVal)), y: 110 + (81 * (m / maxVal)) };
                        const p5 = { x: 110 - (95 * (wa / maxVal)), y: 110 - (31 * (wa / maxVal)) };

                        const points = `${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y} ${p4.x},${p4.y} ${p5.x},${p5.y}`;

                        return (
                          <>
                            <polygon points={points} fill="rgba(168, 85, 247, 0.25)" stroke="var(--accent-purple)" strokeWidth="2" />
                            {/* Dots */}
                            <circle cx={p1.x} cy={p1.y} r="3" fill="#fff" />
                            <circle cx={p2.x} cy={p2.y} r="3" fill="#fff" />
                            <circle cx={p3.x} cy={p3.y} r="3" fill="#fff" />
                            <circle cx={p4.x} cy={p4.y} r="3" fill="#fff" />
                            <circle cx={p5.x} cy={p5.y} r="3" fill="#fff" />
                          </>
                        );
                      })()}
                    </svg>
                  </div>

                  <div style={{ textAlign: 'left', background: 'rgba(255,255,255,0.01)', padding: 12, borderRadius: 12, border: '1px solid rgba(255,255,255,0.03)' }}>
                    <span style={{ fontSize: 13, fontWeight: 'bold', color: '#fff', display: 'block', marginBottom: 4 }}>{REPORT_HEADINGS.elementBalance}</span>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      {buildElementInsight(sajuResult.elementsCount)}
                    </p>
                  </div>
              </div>
            </div>

            {/* 추가 질문 — 상세 리포트 다음, 이직운 캐릭터 카드 바로 위 */}
            {isUnlocked && (
              <section className="followup-card">
                <div className="section-heading" style={{ marginBottom: 12 }}>
                  <div>
                    <span className="eyebrow">{REPORT_HEADINGS.followUp}</span>
                    <h3>{isFollowUpLoading ? '질문을 살펴보고 있어요' : followUps.length ? REPORT_HEADINGS.followUp : '아직 궁금한 게 남았나요?'}</h3>
                  </div>
                  <span>{isFollowUpLoading ? '답변 생성 중' : `${followUps.length}/${shareBonusGranted ? 2 : 1} 사용`}</span>
                </div>

                {followUps.map((record, index) => (
                  <div className="followup-thread" key={record.answeredAt}>
                    <p className="followup-q">Q{index + 1}. {record.question}</p>
                    <div className="followup-a"><FormattedAnswer answer={record.answer} /></div>
                  </div>
                ))}

                {isFollowUpLoading ? (
                  <FollowUpLoading />
                ) : followUps.length < (shareBonusGranted ? 2 : 1) ? (
                  <>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 10, lineHeight: 1.5 }}>
                      리포트를 읽고 남은 궁금증 하나를 적어주세요. 내 사주 데이터를 근거로 그 질문에만 집중해 답합니다.
                    </p>
                    <div className="followup-examples">
                      {['몇 월에 지원하는 게 좋을까요?', '연봉을 얼마나 불러도 될까요?', '승진을 1년 더 기다려도 될까요?', '지금 받은 오퍼를 수락해도 될까요?'].map(example => (
                        <button key={example} type="button" onClick={() => { setFollowUpInput(example); setFollowUpError(null); }}>
                          {example}
                        </button>
                      ))}
                    </div>
                    <textarea
                      className="input-text followup-input"
                      rows={3}
                      maxLength={FOLLOW_UP_MAX_LENGTH}
                      placeholder="예: 지금 회사에서 딱 1년만 더 버티면 승진 가능성이 있는데, 그걸 기다리는 게 나을까요?"
                      value={followUpInput}
                      onChange={e => { setFollowUpInput(e.target.value); setFollowUpError(null); }}
                    />
                    <div className="followup-foot">
                      <span>{followUpInput.trim().length}/{FOLLOW_UP_MAX_LENGTH}</span>
                      {followUpError && <em>{followUpError}</em>}
                    </div>
                    <button className="btn-primary" style={{ marginTop: 10 }} onClick={handleFollowUpSubmit}>
                      내 사주 기준으로 답변 받기
                    </button>
                  </>
                ) : !shareBonusGranted ? (
                  <>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '12px 0 10px', lineHeight: 1.5 }}>
                      {isShareConfirming
                        ? '카카오톡에서 실제로 보내기를 누르면 자동으로 확인돼요. 잠시만 기다려 주세요.'
                        : '결과를 친구에게 공유하면 추가 질문 1회가 열립니다.'}
                    </p>
                    <button className="btn-primary" onClick={handleShareResult} disabled={isShareLoading || isShareConfirming}>
                      {isShareConfirming ? '카카오톡 전송 확인 중...' : isShareLoading ? '공유 카드 준비 중...' : '친구에게 공유하고 한 번 더 물어보기'}
                    </button>
                  </>
                ) : (
                  <small>추가 질문 2회를 모두 사용했습니다.</small>
                )}
              </section>
            )}

            {/* === 바이럴 공유 카드 섹션 === */}
            <section className="glass-card" style={{
              background: 'linear-gradient(135deg, rgba(168,85,247,0.18) 0%, rgba(236,72,153,0.18) 100%)',
              border: '1px solid var(--border-neon-bright)',
              textAlign: 'center',
              padding: '24px 20px',
              marginTop: 24,
              marginBottom: 20
            }}>
              <span className="eyebrow" style={{ color: 'var(--accent-pink)' }}>{REPORT_HEADINGS.shareCard}</span>
              <h3 style={{ fontSize: 17, color: '#fff', margin: '8px 0 6px' }}>
                커리어 성향 공유 카드
              </h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 1.5 }}>
                카카오톡이나 SNS에 공유하여 동기나 지인들의 이직운 점수와 비교해 보세요.
              </p>

              {/* 시각적으로 바로 보이는 결과 카드 (Canvas) */}
              <canvas 
                ref={viralCardCanvasRef} 
                width="800" 
                height="800" 
                role="img"
                aria-label="커리어 성향과 선택지 점수 공유 카드"
                style={{ 
                  width: '100%', 
                  maxWidth: 360, 
                  height: 'auto', 
                  borderRadius: 16, 
                  border: '1px solid var(--border-neon-bright)', 
                  margin: '12px auto 18px', 
                  display: 'block', 
                  boxShadow: '0 0 20px rgba(168,85,247,0.25)' 
                }} 
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <button
                  className="btn-primary"
                  style={{ padding: '13px 8px', fontSize: 13 }}
                  onClick={handleShareResult}
                  disabled={isShareLoading || isShareConfirming}
                >
                  {isShareConfirming ? '전송 확인 중...' : isShareLoading ? '준비 중...' : '💬 카톡 공유'}
                </button>
                <button 
                  className="btn-secondary" 
                  style={{ padding: '13px 8px', fontSize: 13, borderColor: 'var(--accent-purple)' }}
                  onClick={() => void handleDownloadCard(viralCardCanvasRef.current, '이직사주_캐릭터카드.png')}
                >
                  🖼️ 이미지 저장
                </button>
              </div>
            </section>
          </div>

          {/* 다시 입력하기는 잠금 여부와 무관하게 항상 눌릴 수 있어야 한다 */}
          <button
            className="btn-secondary" style={{ width: '100%', margin: '24px 0 16px' }}
            onClick={() => {
              try { localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
              setSavedSession(null);
              setStep('intro');
              setIsUnlocked(false);
              setAiReport(null);
              setFollowUps([]);
              setShareBonusGranted(false);
              setFollowUpInput('');
              setFollowUpError(null);
              setReportHistory([]);
              setCareerContext({ current_status: '', main_concern: [], current_job: '', career_goal: '', desired_answer: '', email: '' });
            }}
          >
            처음부터 다시 입력하기
          </button>

          <p style={{ fontSize: 11.5, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.6, margin: '4px 0 8px' }}>
            본 결과는 명리학을 바탕으로 한 참고 자료이며, 오락과 자기 성찰 목적으로 제공됩니다.<br />
            이직·퇴사 등 중요한 결정은 반드시 현실 조건을 함께 검토해 주세요.
          </p>
        </div>
      )}

      {/* === [POPUP] 웹 결제 모달 (수동 송금 우회/메일 입력) === */}
      {showManualPayModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center',
          zIndex: 100, padding: 20
        }}>
          <div className="glass-card" style={{
            width: '100%', maxWidth: 400, background: '#120d21', border: '1px solid var(--border-neon-bright)',
            boxShadow: '0 0 30px rgba(168,85,247,0.3)', padding: 24
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 
                  style={{ 
                    fontSize: 18, 
                    color: '#fff', 
                    margin: 0, 
                    cursor: 'pointer',
                    userSelect: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                  title="🔮"
                  onClick={() => {
                    const nextCount = secretClickCount + 1;
                    setSecretClickCount(nextCount);
                    if (nextCount >= 3) {
                      setShowSecretCoupon(true);
                      setSecretClickCount(0);
                    }
                  }}
                >
                  {CHECKOUT_COPY.title} {appliedCoupon ? <span style={{ color: '#4ade80', fontSize: 15 }}>(0원 무료 적용)</span> : `(${price.label})`}
                  {!showSecretCoupon && !appliedCoupon && secretClickCount > 0 && (
                    <span style={{ fontSize: 11, color: 'var(--accent-purple)', opacity: 0.8 }}>
                      {secretClickCount}/3
                    </span>
                  )}
                </h3>
              </div>
              <button 
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: 18, cursor: 'pointer' }}
                onClick={() => {
                  setShowManualPayModal(false);
                  setSecretClickCount(0);
                }}
              >✕</button>
            </div>

            {isAILoading ? (
              // 리포트 생성이 수십 초 걸릴 수 있어, 진행 중임을 계속 보여주고 창을 닫아도 완료 시 알려준다
              <div className="unlock-loading">
                <div className="unlock-loading-spinner" />
                <p>{unlockLoadingText}</p>
                <div className="loading-track"><span /></div>
                <small style={{ lineHeight: 1.5, display: 'block', marginTop: 10 }}>
                  💡 이 창을 닫으셔도 AI 분석은 백그라운드에서 계속 진행되며,<br />
                  완료 시 입력하신 <strong>{emailInput || '이메일'}</strong>로 안전하게 보관 및 열람 링크가 전달됩니다.
                </small>
              </div>
            ) : (
              <>
                {/* Email Input (결제 유실 복구 및 알림용) */}
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label">이메일 주소 <span style={{ color: 'var(--accent-purple)', fontSize: 12 }}>(완성 알림 및 분실 복구용)</span></label>
                  <input
                    type="email" className="input-text" placeholder="yourname@gmail.com"
                    value={emailInput} onChange={e => setEmailInput(e.target.value)}
                  />
                </div>

                {/* 숨겨진 쿠폰 코드 입력 섹션 (3회 탭 또는 적용 시 노출) */}
                {(showSecretCoupon || appliedCoupon) && (
                  <div style={{ 
                    background: 'rgba(168, 85, 247, 0.08)', 
                    padding: 14, 
                    borderRadius: 12, 
                    border: '1px dashed var(--accent-purple)', 
                    marginBottom: 16,
                    animation: 'fadeIn 0.25s ease-out'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <label className="form-label" style={{ fontSize: 12, marginBottom: 0, color: 'var(--accent-purple)', fontWeight: 600 }}>
                        🎟️ 시크릿 프로모션 쿠폰
                      </label>
                      <button
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer' }}
                        onClick={() => setShowSecretCoupon(false)}
                      >
                        숨기기
                      </button>
                    </div>
                    <div className="coupon-code-row">
                      <input
                        type="text"
                        className="input-text coupon-code-input"
                        placeholder="발급받은 쿠폰 코드를 입력하세요"
                        value={couponInput}
                        disabled={isCouponChecking}
                        onChange={e => {
                          setCouponInput(e.target.value);
                          setCouponError(null);
                        }}
                        onKeyDown={e => { if (e.key === 'Enter') void handleApplyCoupon(); }}
                        style={{ fontSize: 13, textTransform: 'uppercase' }}
                        autoFocus
                      />
                      <button
                        className="btn-secondary coupon-apply-button"
                        onClick={() => void handleApplyCoupon()}
                        disabled={isCouponChecking}
                      >
                        {isCouponChecking ? '확인 중...' : '적용'}
                      </button>
                    </div>

                    {couponMessage && (
                      <p style={{ color: '#4ade80', fontSize: 12, marginTop: 8, marginBottom: 0, fontWeight: 500 }}>
                        {couponMessage}
                      </p>
                    )}
                    {couponError && (
                      <p style={{ color: '#f87171', fontSize: 12, marginTop: 8, marginBottom: 0 }}>
                        {couponError}
                      </p>
                    )}
                  </div>
                )}

                {/* 결제 / 해금 버튼 */}
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: 14, borderRadius: 12, border: '1px solid rgba(255,255,255,0.04)', marginBottom: 10, textAlign: 'left' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>최종 결제 금액</span>
                    <span style={{ fontSize: 16, fontWeight: 'bold', color: appliedCoupon ? '#4ade80' : '#fff' }}>
                      {checkout.originalLabel && (
                        <span style={{ textDecoration: 'line-through', color: 'var(--text-muted)', fontSize: 12, marginRight: 6 }}>
                          {checkout.originalLabel}
                        </span>
                      )}
                      {checkout.finalLabel}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <button
                      className="btn-primary"
                      style={appliedCoupon
                        ? { padding: 13, fontSize: 14, background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', boxShadow: '0 0 15px rgba(16,185,129,0.4)' }
                        : { padding: 12, fontSize: 13, boxShadow: 'none' }}
                      onClick={() => runCheckoutAction(checkout.action, () => { void handleUnlock(emailInput); })}
                    >
                      {checkout.buttonLabel}
                    </button>

                    {unlockError && (
                      <div role="alert" className="unlock-error">
                        <strong>전체 리포트를 불러오지 못했어요.</strong>
                        <span>{unlockError}</span>
                        <small>입력 내용은 그대로 유지됩니다. 서버 설정을 확인한 뒤 다시 눌러주세요.</small>
                      </div>
                    )}

                    <div style={{ fontSize: 11, color: 'var(--text-muted)', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 8, marginTop: 4, textAlign: 'center' }}>
                      {appliedCoupon ? (
                        '무료 프로모션 쿠폰이 적용된 상태입니다.'
                      ) : (
                        <span>
                          안전하고 간편한 결제가 지원됩니다.
                          {!showSecretCoupon && (
                            <button
                              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)', fontSize: 10, cursor: 'pointer', marginLeft: 6, textDecoration: 'underline' }}
                              onClick={() => setShowSecretCoupon(true)}
                              title="시크릿 코드 입력"
                            >
                              코드입력
                            </button>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* === 이메일 기반 해금 리포트 조회 모달 === */}
      {showLookupModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16
        }}>
          <div className="glass-card" style={{
            width: '100%', maxWidth: 420, background: '#120d21', border: '1px solid var(--border-neon-bright)',
            boxShadow: '0 0 30px rgba(168,85,247,0.3)', padding: 24
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 18, color: '#fff' }}>구매한 리포트 찾기</h3>
              <button
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: 18, cursor: 'pointer' }}
                onClick={() => { setShowLookupModal(false); setLookupSentMessage(null); setLookupError(null); }}
              >✕</button>
            </div>

            {lookupSentMessage ? (
              <div role="status" style={{ fontSize: 13, color: '#4ade80', lineHeight: 1.6, padding: '8px 0' }}>
                {lookupSentMessage}
              </div>
            ) : (
              <>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.5 }}>
                  {CHECKOUT_COPY.lookupDescription} 입력하신 이메일로 리포트 열람 링크를 보내드려요 — 그 메일함을 열 수 있는 분만 다시 볼 수 있어요.
                </p>

                <div className="form-group">
                  <label className="form-label">결제 이메일 주소</label>
                  <input
                    type="email" className="input-text" placeholder="yourname@gmail.com"
                    value={lookupEmailInput} onChange={e => setLookupEmailInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleEmailLookup(); }}
                  />
                </div>

                {lookupError && (
                  <div role="alert" className="unlock-error" style={{ marginBottom: 16 }}>
                    <span>{lookupError}</span>
                  </div>
                )}

                <button
                  className="btn-primary" style={{ width: '100%', padding: 14, fontSize: 14 }}
                  onClick={handleEmailLookup} disabled={isLookupLoading}
                >
                  {isLookupLoading ? '링크를 보내는 중...' : CHECKOUT_COPY.lookupButton}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <BusinessFooter />
    </div>
  );
}
