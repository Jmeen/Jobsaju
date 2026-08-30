export type InlineToken = {
  type: 'text' | 'strong';
  content: string;
};

export type AnswerBlock =
  | { type: 'paragraph'; lines: InlineToken[][] }
  | { type: 'list'; items: InlineToken[][] };

export type StructuredFollowUpAnswer = {
  conclusion: string;
  reasons: string[];
  action: string;
};

const FOLLOW_UP_LOADING_MESSAGES = [
  '질문의 핵심을 정리하고 있어요',
  '사주 흐름과 현재 상황을 대조하고 있어요',
  '실행 가능한 답변으로 다듬고 있어요',
] as const;

export function getFollowUpLoadingMessage(index: number): string {
  const normalizedIndex = ((index % FOLLOW_UP_LOADING_MESSAGES.length) + FOLLOW_UP_LOADING_MESSAGES.length)
    % FOLLOW_UP_LOADING_MESSAGES.length;
  return FOLLOW_UP_LOADING_MESSAGES[normalizedIndex];
}

export function parseInline(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  const pattern = /\*\*([^*\n]+)\*\*/g;
  let cursor = 0;

  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > cursor) {
      tokens.push({ type: 'text', content: text.slice(cursor, index) });
    }
    tokens.push({ type: 'strong', content: match[1] });
    cursor = index + match[0].length;
  }

  if (cursor < text.length || tokens.length === 0) {
    tokens.push({ type: 'text', content: text.slice(cursor) });
  }

  return tokens;
}

function splitReasonSentences(text: string): string[] {
  const sentences = text.match(/[^.!?。]+[.!?。]?/g)?.map(value => value.trim()).filter(Boolean) ?? [];
  if (sentences.length <= 3) return sentences;
  return [sentences[0], sentences[1], sentences.slice(2).join(' ')];
}

function resolveSectionHeading(line: string): keyof StructuredFollowUpAnswer | null {
  const heading = line
    .trim()
    .replace(/^\*\*/, '')
    .replace(/\*\*$/, '')
    .replace(/:$/, '')
    .replace(/^[①②③]\s*/, '')
    .trim();

  if (heading === '결론' || heading === '결론부터') return 'conclusion';
  if (heading === '왜 그런가' || heading === '왜 그렇게 보는지') return 'reasons';
  if (heading === '지금 할 일' || heading === '지금 할 일 하나') return 'action';
  return null;
}

/** 새 답변과 KV에 남아 있는 이전 ①/②/③ 답변을 같은 밀도의 카드로 표시한다. */
export function parseStructuredFollowUpAnswer(text: string): StructuredFollowUpAnswer | null {
  const collected: Record<keyof StructuredFollowUpAnswer, string[]> = {
    conclusion: [],
    reasons: [],
    action: [],
  };
  let currentSection: keyof StructuredFollowUpAnswer | null = null;
  const seenSections = new Set<keyof StructuredFollowUpAnswer>();

  for (const rawLine of text.replace(/\r\n/g, '\n').split('\n')) {
    const heading = resolveSectionHeading(rawLine);
    if (heading) {
      currentSection = heading;
      seenSections.add(heading);
      continue;
    }
    if (currentSection && rawLine.trim()) collected[currentSection].push(rawLine.trim());
  }

  if (seenSections.size !== 3) return null;

  const conclusion = collected.conclusion.join(' ').trim();
  const action = collected.action.join(' ').trim();
  const bulletReasons = collected.reasons
    .filter(line => /^[-*•]\s+/.test(line))
    .map(line => line.replace(/^[-*•]\s+/, '').trim())
    .filter(Boolean);
  const reasons = bulletReasons.length > 0
    ? bulletReasons.slice(0, 3)
    : splitReasonSentences(collected.reasons.join(' '));

  if (!conclusion || reasons.length === 0 || !action) return null;
  return { conclusion, reasons, action };
}

export function parseFollowUpAnswer(text: string): AnswerBlock[] {
  const blocks: AnswerBlock[] = [];
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  let paragraphLines: InlineToken[][] = [];
  let listItems: InlineToken[][] = [];

  const flushParagraph = () => {
    if (paragraphLines.length > 0) {
      blocks.push({ type: 'paragraph', lines: paragraphLines });
      paragraphLines = [];
    }
  };
  const flushList = () => {
    if (listItems.length > 0) {
      blocks.push({ type: 'list', items: listItems });
      listItems = [];
    }
  };

  for (const line of lines) {
    const listMatch = line.match(/^\s*[-*]\s+(.+)$/);
    if (listMatch) {
      flushParagraph();
      listItems.push(parseInline(listMatch[1]));
      continue;
    }

    flushList();
    if (line.trim() === '') {
      flushParagraph();
      continue;
    }
    paragraphLines.push(parseInline(line));
  }

  flushParagraph();
  flushList();
  return blocks;
}
