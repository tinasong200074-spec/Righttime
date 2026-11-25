// 명세 10장 붉은 조명. 터치를 막지 않고 화면 가장자리만 물들인다. 빨강은 여기에만 쓴다.
export function Glow({ on }: { on: boolean }) {
  return <div className={`morning-glow ${on ? 'is-on' : ''}`} aria-hidden="true" />;
}
