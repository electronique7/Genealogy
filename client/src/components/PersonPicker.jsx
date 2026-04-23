import { useState, useEffect, useRef } from 'react';
import { getPeople } from '../api';

export default function PersonPicker({ value, onChange, placeholder = 'Search person...' }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(value || null);
  const [open, setOpen] = useState(false);
  const ref = useRef();

  useEffect(() => {
    if (!query) { setResults([]); return; }
    const timer = setTimeout(() => {
      getPeople({ search: query, limit: 10 }).then(d => setResults(d.data));
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function handle(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  function select(p) {
    setSelected(p);
    setQuery('');
    setOpen(false);
    onChange(p?.id || null, p);
  }

  return (
    <div ref={ref} className="relative">
      {selected ? (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-300 rounded-lg px-3 py-2 text-sm">
          <span className="font-medium text-amber-800">
            {`${selected.given_name || ''} ${selected.surname || ''}`.trim()}
          </span>
          <span className="text-xs text-gray-400">{selected.id}</span>
          <button onClick={() => select(null)} className="ml-auto text-gray-400 hover:text-red-500">✕</button>
        </div>
      ) : (
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
      )}
      {open && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-amber-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {results.map(p => (
            <button
              key={p.id}
              onClick={() => select(p)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-amber-50 flex items-center gap-2"
            >
              <span className="font-medium">{`${p.given_name || ''} ${p.surname || ''}`.trim()}</span>
              <span className="text-xs text-gray-400">{p.id}</span>
              {p.birth_date && <span className="text-xs text-gray-400 ml-auto">b. {p.birth_date.match(/\d{4}/)?.[0]}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
