export type PremiumReportPayload = {
  user_context: Record<string, unknown>;
  saju_data: Record<string, unknown>;
};

export class PremiumReportError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = 'PremiumReportError';
    this.status = status;
    this.code = code;
  }
}

async function readJson(response: Response): Promise<Record<string, any>> {
  try {
    return await response.json();
  } catch {
    throw new PremiumReportError(
      '서버 응답을 읽지 못했습니다. 잠시 후 다시 시도해 주세요.',
      response.status,
      'INVALID_RESPONSE',
    );
  }
}

function responseError(response: Response, data: Record<string, any>) {
  const serverMessage = typeof data.error === 'string' ? data.error : '';
  if (response.status === 500 && /API Key|AI API|GEMINI/i.test(serverMessage)) {
    return new PremiumReportError(
      'AI 리포트 서버 설정이 완료되지 않았습니다. 운영자에게 문의해 주세요.',
      response.status,
      'AI_NOT_CONFIGURED',
    );
  }
  return new PremiumReportError(
    serverMessage || '전체 리포트를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.',
    response.status,
    'REPORT_REQUEST_FAILED',
  );
}

export async function validatePayment(
  paymentId: string,
  couponCode?: string,
  fetcher: typeof fetch = fetch,
): Promise<string> {
  const validationResponse = await fetcher('/api/payment/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paymentId, couponCode }),
  });
  const validationData = await readJson(validationResponse);
  if (!validationResponse.ok) throw responseError(validationResponse, validationData);

  const unlockToken = validationData.unlockToken;
  if (typeof unlockToken !== 'string' || !unlockToken) {
    throw new PremiumReportError('결제 확인 토큰을 발급받지 못했습니다.', validationResponse.status, 'TOKEN_MISSING');
  }
  return unlockToken;
}

export async function requestPremiumReport(
  payload: PremiumReportPayload,
  fetcher: typeof fetch = fetch,
  paymentId = '',
  couponCode?: string,
): Promise<Record<string, any>> {
  const unlockToken = await validatePayment(paymentId, couponCode, fetcher);

  const reportResponse = await fetcher('/api/interpret', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, unlock_token: unlockToken }),
  });
  const reportData = await readJson(reportResponse);
  if (!reportResponse.ok) throw responseError(reportResponse, reportData);
  return { ...reportData, unlockToken };
}

export type ReportHistoryEntry = {
  unlock_token: string;
  created_at: string | null;
  label: string;
};

export async function lookupReportByEmail(
  email: string,
  fetcher: typeof fetch = fetch,
) {
  const response = await fetcher('/api/lookup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim() }),
  });
  const data = await readJson(response);
  if (!response.ok) {
    throw new PremiumReportError(
      data.error || '이메일로 리포트를 찾지 못했습니다.',
      response.status,
      'LOOKUP_FAILED',
    );
  }
  return data;
}

export async function lookupReportByToken(
  unlockToken: string,
  fetcher: typeof fetch = fetch,
) {
  const response = await fetcher('/api/report-by-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ unlock_token: unlockToken.trim() }),
  });
  const data = await readJson(response);
  if (!response.ok) {
    throw new PremiumReportError(
      data.error || '토큰으로 리포트를 찾지 못했습니다.',
      response.status,
      'LOOKUP_FAILED',
    );
  }
  return data;
}
