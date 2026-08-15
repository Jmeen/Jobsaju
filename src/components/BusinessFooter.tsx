import React, { useState } from 'react';
import { PolicyModal } from './modals/PolicyModal';

export function BusinessFooter() {
  const [policyType, setPolicyType] = useState<'terms' | 'privacy' | 'refund' | null>(null);

  return (
    <>
      <footer className="business-footer" aria-label="사업자 정보">
        <p className="business-footer__brand">
          잡사주 <span aria-hidden="true">|</span> 운영: 두리하나랩
        </p>
        <p>
          대표 임재민 <span aria-hidden="true">·</span> 사업자등록번호 306-16-54574
        </p>
        <p>
          고객지원: <a href="mailto:admin@jobsaju.kr">admin@jobsaju.kr</a>
        </p>
        <p className="business-footer__policies">
          <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setPolicyType('terms')}>이용약관</span>
          <span aria-hidden="true">·</span>
          <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setPolicyType('privacy')}>개인정보처리방침</span>
          <span aria-hidden="true">·</span>
          <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setPolicyType('refund')}>환불정책</span>
        </p>
      </footer>

      <PolicyModal 
        type={policyType} 
        onClose={() => setPolicyType(null)} 
      />
    </>
  );
}
