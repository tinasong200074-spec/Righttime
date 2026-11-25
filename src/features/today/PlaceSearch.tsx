import { useId, useState, type FormEvent } from 'react';
import type { FoundPlace } from '../../domain/transit';
import { searchPlaces, TRANSIT_ERROR_TEXT, TransitError } from '../../infra/transit';

interface Props {
  label: string;
  onPick: (p: FoundPlace) => void;
}

function usePlaceSearch() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<FoundPlace[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const search = async (e: FormEvent) => {
    e.preventDefault();
    const query = q.trim();
    if (!query || busy) return;
    setBusy(true);
    setMsg('찾는 중이에요…');
    try {
      const found = await searchPlaces(query);
      setResults(found);
      setMsg(found.length > 0 ? '' : '검색 결과가 없어요. 이름을 바꿔 보세요.');
    } catch (err) {
      setResults([]);
      setMsg(TRANSIT_ERROR_TEXT[err instanceof TransitError ? err.code : 'failed']);
    } finally {
      setBusy(false);
    }
  };
  const reset = () => {
    setResults([]);
    setQ('');
  };
  return { q, setQ, results, busy, msg, search, reset };
}

// 이름으로 장소를 찾는다. 하루 호출 한도가 있어서 글자를 칠 때마다 부르지 않고, 검색 버튼이나 Enter에서만 부른다
export function PlaceSearch({ label, onPick }: Props) {
  const id = useId();
  const { q, setQ, results, busy, msg, search, reset } = usePlaceSearch();
  const pick = (p: FoundPlace) => {
    reset();
    onPick(p);
  };

  return (
    <div>
      <label className="f-label" htmlFor={id}>
        {label}
      </label>
      <form className="f-row" onSubmit={search}>
        <input id={id} className="f-input f-grow" maxLength={40} value={q} onChange={(e) => setQ(e.target.value)} placeholder="예: 강남역, A사" />
        <button type="submit" className="f-btn" disabled={!q.trim() || busy}>
          검색
        </button>
      </form>
      <p className="f-status" aria-live="polite">
        {msg}
      </p>
      <ul className="f-list" aria-label="검색 결과">
        {results.map((r) => (
          <li key={`${r.name}-${r.lat}-${r.lon}`}>
            <button type="button" className="t-found" onClick={() => pick(r)}>
              <strong>{r.name}</strong>
              <span className="f-sub">{r.address}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
