
import { useAppFlow } from '../../contexts/AppContext';


import { buildTopScore, buildAllScoreViews, AXIS_ICON } from '../../utils/scorePresentation';
import { buildCharacterTypeLabel, REPORT_HEADINGS } from '../../utils/reportCopy';
import { buildVerdictView, buildScoreBars } from '../../utils/reportViewModel';

import { buildElementInsight, buildCharacterName } from '../../utils/reportInsights';
import { FollowUpLoading, FormattedAnswer } from '../FollowUpContent';




export function LoadingScreen() {
  const {
    copy,
    loadingText,
  } = useAppFlow();

  return (
    <div className="analysis-loading">
          <div className="analysis-pulse"><span /></div>
          <span className="eyebrow">커리어 흐름 분석 중</span>
          <h2>{copy.loadingTitle.map((line: any, i: any) => (
            <span key={line}>{i > 0 && <br />}{line}</span>
          ))}</h2>
          <p>{loadingText}</p>
          <div className="loading-track"><span /></div>
        </div>
  );
}
