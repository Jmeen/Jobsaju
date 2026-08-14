export type InlineToken = {
  type: 'text' | 'strong';
  content: string;
};

export type AnswerBlock =
  | { type: 'paragraph'; lines: InlineToken[][] }
  | { type: 'list'; items: InlineToken[][] };

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
