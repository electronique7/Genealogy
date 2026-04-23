import { useState, useEffect } from 'react';

export default function SearchBar({ value, onChange, placeholder = 'Search...' }) {
  const [local, setLocal] = useState(value || '');

  useEffect(() => {
    const timer = setTimeout(() => onChange(local), 300);
    return () => clearTimeout(timer);
  }, [local]);

  useEffect(() => { setLocal(value || ''); }, [value]);

  return (
    <input
      type="text"
      value={local}
      onChange={e => setLocal(e.target.value)}
      placeholder={placeholder}
      className="border border-amber-300 rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
    />
  );
}
