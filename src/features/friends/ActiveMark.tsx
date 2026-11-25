// "활성" 표시: 점과 글자를 함께 쓴다(색만으로 구분하지 않기). 새 색 없이 포인트 라임과 잉크 테두리만 쓴다
export function ActiveMark() {
  return (
    <span className="fr-live">
      <i aria-hidden="true" />
      활성
    </span>
  );
}
