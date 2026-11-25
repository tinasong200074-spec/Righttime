export function buildShareMessage(kind: 'departed' | 'late', lateMin?: number): string {
  if (kind === 'departed') return '지금 출발했어요! 곧 만나요.';
  if (lateMin === undefined) return '조금 늦을 것 같아요. 미리 알려서 미안해요.';
  return `${lateMin}분쯤 늦을 것 같아요. 미리 알려서 미안해요.`;
}
