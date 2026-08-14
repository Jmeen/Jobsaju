export function BusinessFooter() {
  return (
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
        <span>이용약관</span>
        <span aria-hidden="true">·</span>
        <span>개인정보처리방침</span>
        <span aria-hidden="true">·</span>
        <span>환불정책</span>
      </p>
    </footer>
  );
}
