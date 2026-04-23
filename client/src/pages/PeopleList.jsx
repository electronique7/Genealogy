import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getPeople, getSurnames } from '../api';
import SearchBar from '../components/SearchBar';

function yearFrom(d) {
  if (!d) return '';
  const m = d.match(/\d{4}/);
  return m ? m[0] : d;
}

const FILTER_TYPES = [
  { value: 'contains',     label: 'Contains' },
  { value: 'begins_with',  label: 'Begins With' },
  { value: 'ends_with',    label: 'Ends With' },
  { value: 'exact',        label: 'Equals' },
  { value: 'not_contains', label: 'Does Not Contain' },
];

// Excel-style column filter panel
function ColMenu({ col, label, align, sortBy, sortDir, hideBlanks, colFilters, onSort, onToggleBlank, onSetFilter }) {
  const [open,       setOpen]       = useState(false);
  const [filterVal,  setFilterVal]  = useState('');
  const [filterType, setFilterType] = useState('contains');
  const ref      = useRef();
  const inputRef = useRef();

  const isSorted    = sortBy === col;
  const blankHidden = !!hideBlanks[col];
  const hasFilter   = !!colFilters[col]?.value;
  const isHighlit   = blankHidden || hasFilter;

  // Sync local state when panel opens (pick up current applied values)
  useEffect(() => {
    if (open) {
      setFilterVal(colFilters[col]?.value || '');
      setFilterType(colFilters[col]?.type  || 'contains');
    }
  }, [open]);

  // Sync when parent clears all filters externally
  useEffect(() => {
    if (!open) {
      setFilterVal(colFilters[col]?.value || '');
      setFilterType(colFilters[col]?.type  || 'contains');
    }
  }, [colFilters, col]);

  // Focus the input whenever the panel opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30);
  }, [open]);

  // Click-outside: discard pending changes, close panel
  useEffect(() => {
    if (!open) return;
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setFilterVal(colFilters[col]?.value || '');
        setFilterType(colFilters[col]?.type  || 'contains');
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, colFilters, col]);

  // Apply pending filter and close
  function commitAndClose() {
    onSetFilter(col, filterType, filterVal);
    setOpen(false);
  }

  // Clear this column's filter immediately
  function clearFilter() {
    setFilterVal('');
    onSetFilter(col, filterType, '');
    setOpen(false);
  }

  const activePlaceholder = FILTER_TYPES.find(f => f.value === filterType)?.label || 'Search';

  return (
    <th
      ref={ref}
      className={`py-0 px-0 font-semibold whitespace-nowrap text-${align} relative border-r border-amber-200 last:border-r-0`}
      style={{ minWidth: 90 }}
    >
      {/* Header cell: label + sort + funnel button */}
      <div className="flex items-stretch h-full">
        <button
          onClick={() => onSort(col)}
          className="flex-1 flex items-center gap-1.5 px-3 py-2.5 hover:bg-amber-200 transition-colors text-left text-xs font-semibold tracking-wide"
        >
          <span>{label}</span>
          {isSorted
            ? <span className="text-[10px]">{sortDir === 'asc' ? '▲' : '▼'}</span>
            : <span className="text-amber-300 text-[10px] opacity-70">⇅</span>}
        </button>

        {/* Clear button — only visible when filter/blank-hide is active */}
        {isHighlit && (
          <button
            onClick={e => {
              e.stopPropagation();
              onSetFilter(col, 'contains', '');
              if (blankHidden) onToggleBlank(col);
            }}
            title="Clear filter"
            className="flex items-center justify-center w-5 border-l border-green-300 bg-green-100 text-green-600 hover:bg-red-100 hover:text-red-600 transition-colors text-sm leading-none"
          >×</button>
        )}

        {/* Excel-style funnel/dropdown button */}
        <button
          onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
          title="Filter"
          className={`flex items-center justify-center w-7 border-l transition-colors ${
            isHighlit
              ? 'border-green-300 bg-green-100 text-green-700 hover:bg-green-200'
              : 'border-amber-200 text-amber-400 hover:bg-amber-200 hover:text-amber-800'
          }`}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
            <path d="M0 1.5A.5.5 0 0 1 .5 1h9a.5.5 0 0 1 .354.854L6.5 5.207V9a.5.5 0 0 1-.276.447l-2-1A.5.5 0 0 1 4 8V5.207L.146 1.854A.5.5 0 0 1 0 1.5z"/>
          </svg>
        </button>
      </div>

      {/* Excel-style filter panel */}
      {open && (
        <div
          className="absolute left-0 top-full z-50 bg-white text-gray-800 text-sm"
          style={{
            width: 250,
            border: '1px solid #bdbdbd',
            boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
            fontFamily: 'Segoe UI, system-ui, sans-serif',
          }}
        >
          {/* Panel title bar */}
          <div style={{ background: '#f0f0f0', borderBottom: '1px solid #bdbdbd', padding: '5px 10px' }}
            className="flex items-center justify-between">
            <span style={{ fontSize: 11, fontWeight: 600, color: '#444', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Filter — {label}
            </span>
            <button onClick={commitAndClose}
              title="Apply filter and close"
              style={{ color: '#fff', fontSize: 12, lineHeight: 1, background: '#2e75b6', border: '1px solid #1f5490', padding: '2px 8px', cursor: 'pointer', fontWeight: 600 }}
              className="hover:bg-blue-700">✓ Apply</button>
          </div>

          {/* Sort section */}
          <div style={{ padding: '6px 8px', borderBottom: '1px solid #e0e0e0' }} className="flex gap-1">
            <button
              onClick={() => { onSort(col, 'asc'); setOpen(false); }}
              style={{
                flex: 1, padding: '4px 6px', fontSize: 11, border: '1px solid #bdbdbd',
                background: isSorted && sortDir === 'asc' ? '#dce6f1' : '#f9f9f9',
                color: isSorted && sortDir === 'asc' ? '#1f4e79' : '#333',
                fontWeight: isSorted && sortDir === 'asc' ? 600 : 400,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
              }}
              className="hover:bg-blue-50"
            >
              <span>▲</span> Sort A → Z
            </button>
            <button
              onClick={() => { onSort(col, 'desc'); setOpen(false); }}
              style={{
                flex: 1, padding: '4px 6px', fontSize: 11, border: '1px solid #bdbdbd',
                background: isSorted && sortDir === 'desc' ? '#dce6f1' : '#f9f9f9',
                color: isSorted && sortDir === 'desc' ? '#1f4e79' : '#333',
                fontWeight: isSorted && sortDir === 'desc' ? 600 : 400,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
              }}
              className="hover:bg-blue-50"
            >
              <span>▼</span> Sort Z → A
            </button>
          </div>

          {/* Text filter section */}
          <div style={{ padding: '8px 10px', borderBottom: '1px solid #e0e0e0' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#555', marginBottom: 6 }}>Text Filter</div>

            {/* Filter type pills — 2 columns */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3, marginBottom: 8 }}>
              {FILTER_TYPES.map(ft => (
                <button
                  key={ft.value}
                  onClick={() => setFilterType(ft.value)}
                  style={{
                    padding: '3px 6px', fontSize: 11,
                    border: `1px solid ${filterType === ft.value ? '#2e75b6' : '#bdbdbd'}`,
                    background: filterType === ft.value ? '#2e75b6' : '#f9f9f9',
                    color: filterType === ft.value ? '#fff' : '#333',
                    cursor: 'pointer', textAlign: 'left',
                    fontWeight: filterType === ft.value ? 600 : 400,
                  }}
                  className="hover:border-blue-400"
                >{ft.label}</button>
              ))}
            </div>

            {/* Search input */}
            <input
              ref={inputRef}
              type="text"
              value={filterVal}
              onChange={e => setFilterVal(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') commitAndClose(); if (e.key === 'Escape') { setFilterVal(colFilters[col]?.value || ''); setOpen(false); } }}
              placeholder={`${activePlaceholder}…`}
              style={{
                width: '100%', padding: '4px 6px', fontSize: 12,
                border: '1px solid #bdbdbd', outline: 'none',
                boxSizing: 'border-box',
              }}
              onFocus={e => { e.target.style.borderColor = '#2e75b6'; e.target.style.boxShadow = '0 0 0 2px #c9ddf0'; }}
              onBlur={e => { e.target.style.borderColor = '#bdbdbd'; e.target.style.boxShadow = 'none'; }}
            />
            <div style={{ marginTop: 6, display: 'flex', gap: 6 }}>
              <button
                onClick={commitAndClose}
                style={{ flex: 1, padding: '3px 0', fontSize: 11, background: '#2e75b6', color: '#fff', border: '1px solid #1f5490', cursor: 'pointer', fontWeight: 600 }}
                className="hover:bg-blue-700"
              >Apply</button>
              {hasFilter && (
                <button
                  onClick={clearFilter}
                  style={{ flex: 1, padding: '3px 0', fontSize: 11, background: '#f9f9f9', color: '#c00', border: '1px solid #bdbdbd', cursor: 'pointer' }}
                  className="hover:bg-red-50"
                >✕ Clear</button>
              )}
            </div>
          </div>

          {/* Hide blanks */}
          <div style={{ padding: '7px 10px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontSize: 12 }}>
              <input
                type="checkbox"
                checked={blankHidden}
                onChange={() => onToggleBlank(col)}
                style={{ accentColor: '#2e75b6', width: 13, height: 13 }}
              />
              <span>Hide rows where <strong>{label}</strong> is blank</span>
            </label>
          </div>
        </div>
      )}
    </th>
  );
}

export default function PeopleList() {
  const [data, setData] = useState({ total: 0, data: [] });
  const [search, setSearch] = useState('');
  const [surname, setSurname] = useState('');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('surname');
  const [sortDir, setSortDir] = useState('asc');
  const [hideBlanks, setHideBlanks] = useState({});
  const [colFilters, setColFilters] = useState({});  // { col: { type, value } }
  const [surnames, setSurnames] = useState([]);
  const [loading, setLoading] = useState(false);
  const limit = 50;

  useEffect(() => {
    getSurnames().then(setSurnames).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const hbParams = Object.fromEntries(
      Object.entries(hideBlanks).filter(([, v]) => v).map(([k]) => [`hb_${k}`, '1'])
    );
    const cfParams = {};
    for (const [col, f] of Object.entries(colFilters)) {
      if (f.value) { cfParams[`cf_${col}_type`] = f.type; cfParams[`cf_${col}_value`] = f.value; }
    }
    getPeople({ search, surname, page, limit, sortBy, sortDir, ...hbParams, ...cfParams })
      .then(setData)
      .finally(() => setLoading(false));
  }, [search, surname, page, sortBy, sortDir, hideBlanks, colFilters]);

  const handleSort = useCallback((col, forcedDir) => {
    if (forcedDir) {
      setSortBy(col);
      setSortDir(forcedDir);
    } else if (sortBy === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortDir('asc');
    }
    setPage(1);
  }, [sortBy]);

  const toggleHideBlank = useCallback((col) => {
    setHideBlanks(prev => ({ ...prev, [col]: !prev[col] }));
    setPage(1);
  }, []);

  const handleSetFilter = useCallback((col, type, value) => {
    setColFilters(prev => ({ ...prev, [col]: { type, value } }));
    setPage(1);
  }, []);

  const totalPages = Math.ceil(data.total / limit);
  const anyHidden = Object.values(hideBlanks).some(Boolean);
  const anyColFilter = Object.values(colFilters).some(f => f.value);
  const COLS = [
    { col: 'surname',      label: 'Name',         align: 'left' },
    { col: 'sex',          label: 'Sex',           align: 'left' },
    { col: 'birth_date',   label: 'Birth',         align: 'left' },
    { col: 'birth_place',  label: 'Birthplace',    align: 'left' },
    { col: 'death_date',   label: 'Death',         align: 'left' },
    { col: 'death_place',  label: 'Death Place',   align: 'left' },
    { col: 'burial_date',  label: 'Burial',        align: 'left' },
    { col: 'burial_place', label: 'Burial Place',  align: 'left' },
    { col: 'family_count', label: 'Families',      align: 'center' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">People</h1>
          <p className="text-sm text-gray-500">{data.total.toLocaleString()} records</p>
        </div>
        <Link
          to="/people/new"
          className="bg-green-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
        >
          + Add Person
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5 bg-white p-4 rounded-xl border border-amber-200 shadow-sm">
        <SearchBar value={search} onChange={v => { setSearch(v); setPage(1); }} placeholder="Search by name..." />
        <select
          value={surname}
          onChange={e => { setSurname(e.target.value); setPage(1); }}
          className="border border-amber-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          <option value="">All surnames</option>
          {surnames.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {(search || surname || anyHidden || anyColFilter) && (
          <button
            onClick={() => { setSearch(''); setSurname(''); setHideBlanks({}); setColFilters({}); setPage(1); }}
            className="text-sm text-amber-700 hover:text-amber-900 underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">Loading...</div>
        ) : data.data.length === 0 ? (
          <div className="p-12 text-center text-gray-400">No results found</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-amber-100 text-amber-900 select-none">
              <tr>
                {COLS.map(c => (
                  <ColMenu
                    key={c.col}
                    {...c}
                    sortBy={sortBy}
                    sortDir={sortDir}
                    hideBlanks={hideBlanks}
                    colFilters={colFilters}
                    onSort={handleSort}
                    onToggleBlank={toggleHideBlank}
                    onSetFilter={handleSetFilter}
                  />
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-amber-50">
              {data.data.map(p => (
                <tr key={p.id} className="hover:bg-amber-50 border-l-4 border-l-transparent hover:border-l-green-600 transition-all duration-150">
                  <td className="px-4 py-3">
                    <Link to={`/people/${p.id}`} className="font-medium text-amber-800 hover:underline">
                      {`${p.given_name || ''} ${p.surname || ''}`.trim() || 'Unknown'}
                    </Link>
                    <div className="text-xs text-gray-400">{p.id}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {p.sex === 'M' ? '♂ Male' : p.sex === 'F' ? '♀ Female' : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{yearFrom(p.birth_date) || '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs max-w-[160px] truncate">{p.birth_place || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{yearFrom(p.death_date) || '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs max-w-[160px] truncate">{p.death_place || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{yearFrom(p.burial_date) || '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs max-w-[160px] truncate">{p.burial_place || '—'}</td>
                  <td className="px-4 py-3 text-center text-gray-500">{p.family_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="px-3 py-1 rounded border border-amber-300 disabled:opacity-40 hover:bg-amber-100"
            >← Prev</button>
            <button
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1 rounded border border-amber-300 disabled:opacity-40 hover:bg-amber-100"
            >Next →</button>
          </div>
        </div>
      )}
    </div>
  );
}
