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
  const blocks = parseFollowUpAnswer(answer);

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
