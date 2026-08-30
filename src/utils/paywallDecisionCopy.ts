import type { CareerAxis } from './careerSignal.ts';

export type PaywallDecisionCopy = {
  howTitle: string;
  howBody: string;
  roadmap: string;
  criteria: readonly [string, string];
  scenarios: readonly [string, string];
  questionExamples: readonly [string, string, string];
  personalizePlaceholder: string;
  reportCheckTitle: string;
};

const DECISION_COPY: Record<CareerAxis, PaywallDecisionCopy> = {
  stay: {
    howTitle: '현재 회사에서 확인할 것',
    howBody: '역할·보상 개선 가능성을 확인하고, 언제까지 지켜본 뒤 다음 이동을 판단할지 행동으로 연결해요.',
    roadmap: '현재 조건 점검 → 역할·보상 개선 확인 → 다음 이동 시점 판단처럼, 월별 흐름을 실제 행동 순서로 정리해 드려요.',
    criteria: [
      '현재 회사에서 역할·보상이 개선될 가능성',
      '변화를 확인할 기한과 다음 이동 시점',
    ],
    scenarios: [
      '역할·보상 개선이 확인되면 → 잔류 조건과 재검토 시점 확정',
      '약속한 시점까지 변화가 없으면 → 다음 이동 준비 시작',
    ],
    questionExamples: [
      '“역할과 보상이 개선된다면 얼마나 더 지켜봐도 될까요?”',
      '“약속한 변화가 늦어지면 언제부터 이동을 준비할까요?”',
      '“남기로 결정하기 전에 꼭 확인할 조건은 무엇일까요?”',
    ],
    personalizePlaceholder: '예: 현재 회사에서 역할·보상 개선을 요청할지, 언제까지 지켜볼지 궁금해요.',
    reportCheckTitle: '현재 회사에서 확인할 질문',
  },
  jobChange: {
    howTitle: '다음 회사에서 확인할 것',
    howBody: '다음 회사의 역할·권한과 보상·성장 조건을 비교하고, 오퍼를 받을지 판단하는 기준까지 연결해요.',
    roadmap: '다음 회사 기준 정리 → 제안 조건 검증 → 오퍼 판단처럼, 월별 흐름을 실제 행동 순서로 정리해 드려요.',
    criteria: [
      '다음 회사에서 맡을 역할의 범위와 권한',
      '보상·성장성·업무 환경의 개선 폭',
    ],
    scenarios: [
      '오퍼가 들어오면 → R&R·보고라인·6개월 기대성과 확인',
      '핵심 조건이 맞지 않으면 → 이동 보류',
    ],
    questionExamples: [
      '“9월에 오퍼가 오면 옮기는 게 좋을까요?”',
      '“다음 회사에서 역할과 보상 중 무엇을 먼저 볼까요?”',
      '“핵심 조건이 맞지 않으면 이동을 미루는 게 좋을까요?”',
    ],
    personalizePlaceholder: '예: 받은 제안의 역할과 보상이 옮길 만큼 좋은 조건인지 궁금해요.',
    reportCheckTitle: '오퍼에서 확인할 질문',
  },
  negotiation: {
    howTitle: '협상 전에 준비할 것',
    howBody: '성과와 시장 보상 근거를 정리하고, 요구할 조건과 결과별 다음 행동까지 연결해요.',
    roadmap: '성과 근거 정리 → 요구 조건 협상 → 결과별 다음 행동처럼, 월별 흐름을 실제 행동 순서로 정리해 드려요.',
    criteria: [
      '협상에 사용할 성과와 시장 보상 근거',
      '반드시 개선되어야 할 역할·보상 조건',
    ],
    scenarios: [
      '요구 조건이 받아들여지면 → 합의 내용·적용 시점 확인',
      '핵심 조건이 거절되면 → 잔류와 이동 준비 중 다음 행동 결정',
    ],
    questionExamples: [
      '“지금 연봉보다 직급을 먼저 요구해야 할까요?”',
      '“어떤 성과를 협상 근거로 내세우는 게 좋을까요?”',
      '“핵심 조건이 거절되면 다음 행동은 무엇일까요?”',
    ],
    personalizePlaceholder: '예: 연봉과 역할 중 무엇을 먼저 요구하고, 거절되면 어떻게 할지 궁금해요.',
    reportCheckTitle: '협상 전에 확인할 근거',
  },
};

export function getPaywallDecisionCopy(axis: CareerAxis): PaywallDecisionCopy {
  return DECISION_COPY[axis];
}
