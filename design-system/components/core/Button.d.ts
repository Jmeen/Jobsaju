export interface ButtonProps {
  children: React.ReactNode;
  /** primary(초록 채움) · secondary(연한 초록) · guardian(오행 액센트 테두리) */
  variant?: 'primary' | 'secondary' | 'guardian';
  /** variant="guardian"일 때 테두리/배경에 쓸 오행 색 */
  element?: 'wood' | 'fire' | 'earth' | 'metal' | 'water';
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit';
}

/**
 * @startingPoint section="Core" subtitle="CTA 버튼 — primary/secondary/guardian" viewport="700x220"
 */
export function Button(props: ButtonProps): JSX.Element;

export interface TextLinkProps {
  children: React.ReactNode;
  onClick?: () => void;
}
export function TextLink(props: TextLinkProps): JSX.Element;
