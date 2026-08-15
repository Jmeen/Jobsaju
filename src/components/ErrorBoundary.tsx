import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

/**
 * 렌더 중 예외가 나면 흰 화면이 되는 것을 막는다.
 *
 * 결제한 사용자가 여기까지 왔을 수 있으므로, 안내에서 두 가지를 반드시 지킨다.
 * 1. 저장된 세션은 건드리지 않는다 — 새로고침만 해도 '지난 결과 다시 보기'로 돌아갈 수 있다.
 * 2. 그래도 안 되면 이메일로 리포트를 다시 찾을 수 있다는 사실을 알려준다.
 *
 * 저장 데이터를 지우는 선택지는 "새로고침해도 계속 깨지는" 경우에만 노출한다.
 * 손상된 세션 때문에 무한히 같은 화면에서 깨지는 상황을 사용자가 스스로 빠져나오게 하기 위함이다.
 */

const RELOAD_MARK_KEY = 'saju_error_reloaded_at';
/** 이 시간 안에 다시 깨지면 "새로고침으로는 안 되는 상태"로 본다 */
const REPEAT_WINDOW_MS = 60_000;

interface Props {
  children: ReactNode;
  /** 화면 일부만 감쌀 때 쓰는 문구. 생략하면 앱 전체가 멈춘 상황의 문구를 쓴다. */
  title?: string;
  description?: string;
  /** 저장된 세션 키. 넘기면 반복 오류 시 "저장 데이터 지우기"를 제안한다. */
  storageKey?: string;
}

interface State {
  hasError: boolean;
  message: string;
  /** 최근에 이미 새로고침을 한 번 했는데 또 깨진 상태인지 */
  isRepeat: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '', isRepeat: false };

  static getDerivedStateFromError(error: unknown): Partial<State> {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : String(error),
    };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    // 사용자에게는 안내 화면을 보여주고, 원인은 콘솔에 남긴다.
    console.error('렌더 중 오류로 화면을 대체했습니다:', error, info.componentStack);

    let isRepeat = false;
    try {
      const markedAt = Number(sessionStorage.getItem(RELOAD_MARK_KEY) || 0);
      isRepeat = markedAt > 0 && Date.now() - markedAt < REPEAT_WINDOW_MS;
    } catch { /* 스토리지를 못 쓰는 환경은 조용히 무시 */ }
    this.setState({ isRepeat });
  }

  private handleReload = () => {
    try {
      sessionStorage.setItem(RELOAD_MARK_KEY, String(Date.now()));
    } catch { /* 스토리지를 못 쓰는 환경은 조용히 무시 */ }
    window.location.reload();
  };

  private handleResetSession = () => {
    const { storageKey } = this.props;
    try {
      if (storageKey) localStorage.removeItem(storageKey);
      sessionStorage.removeItem(RELOAD_MARK_KEY);
    } catch { /* 스토리지를 못 쓰는 환경은 조용히 무시 */ }
    window.location.href = window.location.pathname;
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const title = this.props.title || '화면을 그리는 중 문제가 생겼어요';
    const description = this.props.description
      || '잠시 후 다시 시도해 주세요. 입력하신 내용과 결제한 리포트는 그대로 남아 있습니다.';

    return (
      <div className="app-container" role="alert">
        <div className="intro-screen" style={{ textAlign: 'center', padding: '48px 20px' }}>
          <p style={{ fontSize: 40, marginBottom: 12 }} aria-hidden="true">🌀</p>
          <h2 style={{ marginBottom: 12 }}>{title}</h2>
          <p style={{ marginBottom: 20, lineHeight: 1.6 }}>{description}</p>

          <button className="btn-primary" onClick={this.handleReload}>다시 시도하기</button>

          {this.state.isRepeat && this.props.storageKey && (
            <div style={{ marginTop: 20 }}>
              <p style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 10 }}>
                계속 같은 화면이 나온다면 저장된 진단 데이터가 손상된 것일 수 있습니다.
                지우고 처음부터 진행해 보세요. 결제한 리포트는 지워지지 않고,
                구매하실 때 입력한 이메일로 다시 찾을 수 있습니다.
              </p>
              <button className="btn-secondary" onClick={this.handleResetSession}>
                저장된 데이터 지우고 처음부터
              </button>
            </div>
          )}

          {this.state.message && (
            <p style={{ fontSize: 11, opacity: 0.55, marginTop: 24, wordBreak: 'break-word' }}>
              오류: {this.state.message}
            </p>
          )}
        </div>
      </div>
    );
  }
}
