import { Fragment, useEffect, useState } from 'react';
import {
  getFollowUpLoadingMessage,
  parseFollowUpAnswer,
} from '../utils/followUpFormat';
import type { InlineToken } from '../utils/followUpFormat';

function InlineContent({ tokens }: { tokens: InlineToken[] }) {
  return tokens.map((token, index) => (
    token.type === 'strong'
      ? <strong key={index}>{token.content}</strong>
      : <Fragment key={index}>{token.content}</Fragment>
  ));
}

export function FormattedAnswer({ answer }: { answer: string }) {
  // 예전 서버 버전이 KV에 answer를 문자열이 아니라 { question_analysis, answer } 객체로 저장했다.
  // 그 레코드는 아직 TTL(90일)이 남아 재열람 시 그대로 내려온다. 문자열이 아니면 답변 텍스트만
  // 뽑아내 렌더가 깨지지 않게 한다(객체에 .replace를 호출하면 TypeError로 화면이 죽는다).
  const text = typeof answer === 'string'
    ? answer
    : ((answer as { answer?: string } | null)?.answer ?? '');
  const blocks = parseFollowUpAnswer(text);

  return (
    <div className="formatted-answer">
      {blocks.map((block, blockIndex) => (
        block.type === 'list' ? (
          <ul key={blockIndex}>
            {block.items.map((item, itemIndex) => (
              <li key={itemIndex}><InlineContent tokens={item} /></li>
            ))}
          </ul>
        ) : (
          <p key={blockIndex}>
            {block.lines.map((line, lineIndex) => (
              <Fragment key={lineIndex}>
                {lineIndex > 0 && <br />}
                <InlineContent tokens={line} />
              </Fragment>
            ))}
          </p>
        )
      ))}
    </div>
  );
}

export function FollowUpLoading() {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setMessageIndex(current => current + 1);
    }, 3200);

    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <div className="followup-loading" role="status" aria-live="polite" aria-atomic="true">
      <div className="followup-spinner" aria-hidden="true" />
      <strong>답변을 준비하고 있어요</strong>
      <p>{getFollowUpLoadingMessage(messageIndex)}</p>
      <div className="loading-track" aria-hidden="true"><span /></div>
      <small>보통 20~40초 정도 걸릴 수 있어요.<br />창을 닫지 말아 주세요.</small>
    </div>
  );
}
