// 자리 표시용: 창 C가 약속 추가 화면(S02)으로 교체한다(내보내는 이름은 AppointmentScreen 유지)
export function AppointmentScreen({ onSaved }: { onSaved: () => void }) {
  return <button onClick={onSaved}>약속 추가 화면 준비 중</button>;
}
