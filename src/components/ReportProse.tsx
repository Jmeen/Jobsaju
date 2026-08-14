import { splitReportParagraphs } from '../utils/reportProse';

type ReportProseProps = {
  text: string;
  className?: string;
};

export function ReportProse({ text, className = '' }: ReportProseProps) {
  const classes = ['report-prose', className].filter(Boolean).join(' ');

  return (
    <div className={classes}>
      {splitReportParagraphs(text).map((paragraph, index) => (
        <p key={`${index}-${paragraph}`}>{paragraph}</p>
      ))}
    </div>
  );
}
