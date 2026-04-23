import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Tree from 'react-d3-tree';
import { getAncestors, getDescendants, searchTree } from '../api';

// Card dimensions
const W = 220;
const H = 80;
const SEX_COLOR = { M: '#1e6fba', F: '#a8335f', U: '#64748b' };

function sexColor(sex) { return SEX_COLOR[sex] || SEX_COLOR.U; }

function initials(given, surname) {
  const g = (given  || '').trim()[0] || '';
  const s = (surname || '').trim()[0] || '';
  return (g + s).toUpperCase() || '?';
}

function truncate(str, max) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max - 1) + '…' : str;
}

function yearRange(birth, death) {
  const b = birth?.match(/\d{4}/)?.[0];
  const d = death?.match(/\d{4}/)?.[0];
  if (!b && !d) return '';
  if (b && d) return `${b} – ${d}`;
  return b ? `b. ${b}` : `d. ${d}`;
}

// ── Person card using foreignObject for crisp HTML text rendering ─────────────
function PersonCard({ nodeDatum, onNodeClick, offset, onDragStart, draggingId }) {
  const a       = nodeDatum.attributes || {};
  const nodeId  = a.id;
  const color   = sexColor(a.sex);
  const focused = !!a.focused;
  const isDragging = draggingId === nodeId;

  const given   = truncate(a.givenName  ?? nodeDatum.name ?? '', 22);
  const surname = a.givenName != null ? truncate(a.surname ?? '', 22) : '';
  const dates   = yearRange(a.birth, a.death);
  const inits   = initials(a.givenName ?? nodeDatum.name, a.surname);

  const dx = offset?.dx || 0;
  const dy = offset?.dy || 0;

  return (
    <g transform={`translate(${dx},${dy})`}>
      {/* Shadow */}
      <rect
        x={-W / 2 + 2} y={-H / 2 + 3}
        width={W} height={H} rx={10}
        fill={isDragging ? 'rgba(0,0,0,0.18)' : 'rgba(0,0,0,0.09)'}
      />
      {/* foreignObject renders HTML — gives proper font weight + antialiasing */}
      <foreignObject x={-W / 2} y={-H / 2} width={W} height={H}>
        <div
          xmlns="http://www.w3.org/1999/xhtml"
          onMouseDown={e => onDragStart(e, nodeId)}
          onClick={e => { e.stopPropagation(); onNodeClick(nodeDatum); }}
          style={{
            width: '100%', height: '100%',
            background: focused ? '#fffbeb' : '#ffffff',
            border: `${focused ? 2 : 1.5}px solid ${focused ? '#f59e0b' : '#e2e8f0'}`,
            borderRadius: 10,
            boxShadow: isDragging
              ? '0 8px 24px rgba(0,0,0,0.22)'
              : '0 2px 6px rgba(0,0,0,0.08)',
            display: 'flex',
            alignItems: 'center',
            overflow: 'hidden',
            boxSizing: 'border-box',
            cursor: isDragging ? 'grabbing' : 'grab',
            userSelect: 'none',
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            transform: isDragging ? 'scale(1.03)' : 'scale(1)',
            transition: isDragging ? 'none' : 'box-shadow 0.15s',
          }}
        >
          {/* Left colour accent */}
          <div style={{ width: 6, height: '100%', background: color, flexShrink: 0 }} />

          {/* Avatar circle */}
          <div style={{
            width: 42, height: 42, borderRadius: '50%',
            background: color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 15, fontWeight: 600,
            flexShrink: 0, margin: '0 10px',
            letterSpacing: 0.5,
          }}>{inits}</div>

          {/* Name + dates */}
          <div style={{ minWidth: 0, flex: 1, paddingRight: 10 }}>
            <div style={{
              fontSize: 13, fontWeight: 600, color: '#111827',
              lineHeight: 1.3, whiteSpace: 'nowrap',
              overflow: 'hidden', textOverflow: 'ellipsis',
            }}>{given}</div>
            {surname && (
              <div style={{
                fontSize: 12, fontWeight: 400, color: '#374151',
                lineHeight: 1.3, whiteSpace: 'nowrap',
                overflow: 'hidden', textOverflow: 'ellipsis',
              }}>{surname}</div>
            )}
            {dates && (
              <div style={{
                fontSize: 10.5, color: '#6b7280',
                marginTop: 3, lineHeight: 1.2,
              }}>{dates}</div>
            )}
          </div>
        </div>
      </foreignObject>
    </g>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function TreeView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const focusId  = searchParams.get('focus');
  const mode     = searchParams.get('mode') || 'ancestors';

  const [treeData,      setTreeData]      = useState(null);
  const [generations,   setGenerations]   = useState(5);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState(null);
  const [selected,      setSelected]      = useState(null);
  const [searchQ,       setSearchQ]       = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [translate,     setTranslate]     = useState({ x: 0, y: 0 });
  const [zoom,          setZoom]          = useState(0.75);
  const [nodeOffsets,   setNodeOffsets]   = useState({});  // { [nodeId]: {dx,dy} }
  const [draggingId,    setDraggingId]    = useState(null);
  const [navHistory,    setNavHistory]    = useState([]);  // [{id, name}] trail from Center Tree Here

  const containerRef = useRef();
  const zoomRef      = useRef(zoom);     // live zoom for drag calculations
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);

  const MIN_ZOOM = 0.08;
  const MAX_ZOOM = 3;

  // Centre tree when data or mode changes
  useEffect(() => {
    if (!containerRef.current) return;
    const { width, height } = containerRef.current.getBoundingClientRect();
    if (mode === 'ancestors') {
      setTranslate({ x: 150, y: height / 2 });
    } else {
      setTranslate({ x: width / 2, y: 100 });
    }
    setZoom(0.75);
    setNodeOffsets({});
  }, [mode, treeData]);

  // Fetch tree data
  useEffect(() => {
    if (!focusId) return;
    setLoading(true);
    setError(null);
    setSelected(null);
    setNodeOffsets({});
    const fetcher = mode === 'ancestors'
      ? getAncestors(focusId, generations)
      : getDescendants(focusId, generations);
    fetcher
      .then(data => { markFocused(data, focusId); setTreeData(data); })
      .catch(() => setError('Failed to load tree data.'))
      .finally(() => setLoading(false));
  }, [focusId, mode, generations]);

  function markFocused(node, id) {
    if (!node) return;
    node.attributes = node.attributes || {};
    if (node.attributes.id === id) node.attributes.focused = true;
    (node.children || []).forEach(c => markFocused(c, id));
  }

  // Debounced search
  useEffect(() => {
    if (!searchQ) { setSearchResults([]); return; }
    const t = setTimeout(() => searchTree(searchQ).then(setSearchResults), 280);
    return () => clearTimeout(t);
  }, [searchQ]);

  function setFocus(id, clearHistory = true) {
    setSearchParams({ focus: id, mode });
    setSearchQ('');
    setSearchResults([]);
    setSelected(null);
    if (clearHistory) setNavHistory([]);
  }

  function centerHere(newId) {
    if (treeData && focusId) {
      const rootName = treeData.name || '';
      setNavHistory(h => [...h, { id: focusId, name: rootName }]);
    }
    setFocus(newId, false);
  }

  function navigateBack(idx) {
    const entry = navHistory[idx];
    setNavHistory(h => h.slice(0, idx));
    setFocus(entry.id, false);
  }

  // ── Per-node drag ────────────────────────────────────────────────────────────
  const handleDragStart = useCallback((e, nodeId) => {
    if (!nodeId) return;
    e.stopPropagation();
    e.preventDefault();

    const orig = nodeOffsets[nodeId] || { dx: 0, dy: 0 };
    const startX = e.clientX;
    const startY = e.clientY;
    setDraggingId(nodeId);

    function onMove(ev) {
      const dx = orig.dx + (ev.clientX - startX) / zoomRef.current;
      const dy = orig.dy + (ev.clientY - startY) / zoomRef.current;
      setNodeOffsets(prev => ({ ...prev, [nodeId]: { dx, dy } }));
    }
    function onUp() {
      setDraggingId(null);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  // nodeOffsets intentionally not in deps — we capture `orig` at drag-start time
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeOffsets]);

  // ── Landing ──────────────────────────────────────────────────────────────────
  if (!focusId) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-5">🌳</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Family Tree Viewer</h2>
        <p className="text-gray-400 text-sm mb-8">Search for any person to explore their ancestor or descendant chart.</p>
        <SearchDropdown
          value={searchQ} onChange={setSearchQ}
          results={searchResults} onSelect={p => setFocus(p.id)}
          placeholder="Search by name…" autoFocus large
        />
      </div>
    );
  }

  // ── Tree view ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-[calc(100vh-56px)]">

      {/* Sidebar */}
      <div className="w-56 bg-white border-r border-gray-200 flex flex-col shrink-0 text-sm">

        {/* Breadcrumb trail */}
        {navHistory.length > 0 && (
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-400 tracking-widest uppercase mb-2">History</p>
            <div className="flex flex-col gap-1">
              {navHistory.map((entry, idx) => (
                <button
                  key={`${entry.id}-${idx}`}
                  onClick={() => navigateBack(idx)}
                  className="text-left text-xs px-2 py-1.5 rounded-lg hover:bg-amber-50 text-amber-700 hover:text-amber-900 transition-colors flex items-center gap-1.5"
                  title={`Go back to ${entry.name}`}
                >
                  <span className="text-gray-300">←</span>
                  <span className="truncate">{entry.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-400 tracking-widest uppercase mb-2">Find Person</p>
          <SearchDropdown
            value={searchQ} onChange={setSearchQ}
            results={searchResults} onSelect={p => setFocus(p.id)}
            placeholder="Search…"
          />
        </div>

        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-400 tracking-widest uppercase mb-2">View</p>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
            {[
              { key: 'ancestors',   label: '← Ancestors' },
              { key: 'descendants', label: 'Descendants →' },
            ].map(({ key, label }) => (
              <button key={key}
                onClick={() => setSearchParams({ focus: focusId, mode: key })}
                className={`flex-1 py-2 font-medium transition-colors
                  ${mode === key ? 'bg-gray-800 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
              >{label}</button>
            ))}
          </div>
        </div>

        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-400 tracking-widest uppercase mb-2">
            Generations &nbsp;<span className="text-gray-700 font-bold">{generations}</span>
          </p>
          <input type="range" min={2} max={15} value={generations}
            onChange={e => setGenerations(Number(e.target.value))}
            className="w-full accent-gray-700"
          />
          <div className="flex justify-between text-[10px] text-gray-300 mt-0.5"><span>2</span><span>15</span></div>
        </div>

        {/* Zoom controls in sidebar */}
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-400 tracking-widest uppercase mb-2">
            Zoom &nbsp;<span className="text-gray-700 font-bold">{Math.round(zoom * 100)}%</span>
          </p>
          <input type="range" min={8} max={200} value={Math.round(zoom * 100)}
            onChange={e => setZoom(Number(e.target.value) / 100)}
            className="w-full accent-gray-700"
          />
          <div className="flex justify-between text-[10px] text-gray-300 mt-0.5"><span>8%</span><span>200%</span></div>
          <button
            onClick={() => {
              const { width, height } = containerRef.current.getBoundingClientRect();
              setZoom(0.75);
              setTranslate(mode === 'ancestors' ? { x: 150, y: height / 2 } : { x: width / 2, y: 100 });
            }}
            className="mt-2 w-full text-xs py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
          >Reset view</button>
          {Object.keys(nodeOffsets).length > 0 && (
            <button
              onClick={() => setNodeOffsets({})}
              className="mt-1.5 w-full text-xs py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 transition-colors"
            >Reset card positions</button>
          )}
        </div>

        {/* Legend */}
        <div className="px-4 py-3 mt-auto border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-400 tracking-widest uppercase mb-2">Legend</p>
          <p className="text-[10px] text-gray-400 mb-2 leading-tight">Drag any card to reposition it. Pan the canvas by dragging empty space.</p>
          {[
            { color: SEX_COLOR.M, label: 'Male' },
            { color: SEX_COLOR.F, label: 'Female' },
            { color: SEX_COLOR.U, label: 'Unknown' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-2 mb-1.5">
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0"
                   style={{ backgroundColor: color }}>AB</div>
              <span className="text-xs text-gray-500">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden"
        style={{
          backgroundColor: '#f1f5f9',
          backgroundImage: 'radial-gradient(#cbd5e1 1.5px, transparent 1.5px)',
          backgroundSize: '28px 28px',
          cursor: draggingId ? 'grabbing' : 'default',
        }}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm z-10">
            <span className="text-sm text-gray-400">Loading…</span>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm text-red-400">{error}</span>
          </div>
        )}

        {treeData && !loading && (
          <Tree
            data={treeData}
            orientation={mode === 'ancestors' ? 'horizontal' : 'vertical'}
            pathFunc="diagonal"
            translate={translate}
            nodeSize={mode === 'ancestors'
              ? { x: W + 70, y: H + 28 }
              : { x: W + 50, y: H + 50 }}
            separation={{ siblings: 1.05, nonSiblings: 1.3 }}
            renderCustomNodeElement={rd3tProps => (
              <PersonCard
                {...rd3tProps}
                onNodeClick={setSelected}
                offset={nodeOffsets[rd3tProps.nodeDatum.attributes?.id]}
                onDragStart={handleDragStart}
                draggingId={draggingId}
              />
            )}
            zoom={zoom}
            scaleExtent={{ min: MIN_ZOOM, max: MAX_ZOOM }}
            onUpdate={({ zoom: z }) => setZoom(z)}
          />
        )}

        {/* Floating zoom buttons */}
        {treeData && !loading && (
          <div className="absolute bottom-5 right-5 flex flex-col gap-1 z-20">
            <button onClick={() => setZoom(z => +Math.min(MAX_ZOOM, z * 1.25).toFixed(3))}
              className="w-9 h-9 bg-white rounded-lg shadow border border-gray-200 text-gray-600 text-xl hover:bg-gray-50 transition-colors flex items-center justify-center font-light"
              title="Zoom in">+</button>
            <button onClick={() => setZoom(z => +Math.max(MIN_ZOOM, z * 0.8).toFixed(3))}
              className="w-9 h-9 bg-white rounded-lg shadow border border-gray-200 text-gray-600 text-xl hover:bg-gray-50 transition-colors flex items-center justify-center font-light"
              title="Zoom out">−</button>
          </div>
        )}

        {/* Selected person panel */}
        {selected && (
          <SelectedPanel
            person={selected}
            onClose={() => setSelected(null)}
            onCenter={() => centerHere(selected.attributes?.id)}
            onProfile={() => navigate(`/people/${selected.attributes?.id}`)}
          />
        )}
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SearchDropdown({ value, onChange, results, onSelect, placeholder, autoFocus, large }) {
  return (
    <div className="relative">
      <input
        autoFocus={autoFocus}
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full border border-gray-300 rounded-lg px-3 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 text-sm
          ${large ? 'py-3 text-base' : 'py-2'}`}
      />
      {results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
          {results.map(p => {
            const name = `${p.given_name || ''} ${p.surname || ''}`.trim();
            const yr   = p.birth_date?.match(/\d{4}/)?.[0];
            return (
              <button key={p.id} onClick={() => onSelect(p)}
                className="w-full text-left px-3 py-2.5 text-sm hover:bg-blue-50 flex items-center gap-2.5 border-b border-gray-50 last:border-0"
              >
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-semibold shrink-0"
                     style={{ backgroundColor: sexColor(p.sex) }}>
                  {initials(p.given_name, p.surname)}
                </div>
                <span className="font-medium text-gray-800 truncate">{name}</span>
                {yr && <span className="text-xs text-gray-400 ml-auto shrink-0">{yr}</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SelectedPanel({ person, onClose, onCenter, onProfile }) {
  const a     = person.attributes || {};
  const color = sexColor(a.sex);
  const given   = a.givenName ?? person.name ?? '';
  const surname = a.givenName != null ? (a.surname ?? '') : '';
  const inits   = initials(given, surname);
  const dates   = yearRange(a.birth, a.death);

  return (
    <div className="absolute top-4 right-16 w-64 bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden z-20">
      <div className="px-4 py-4 flex items-center gap-3" style={{ backgroundColor: color + '1a' }}>
        <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-semibold shrink-0"
             style={{ backgroundColor: color, fontSize: 16 }}>{inits}</div>
        <div className="min-w-0">
          <div className="font-semibold text-gray-900 text-sm leading-tight truncate">{given}</div>
          <div className="text-gray-500 text-sm leading-tight truncate">{surname}</div>
          {dates && <div className="text-xs text-gray-400 mt-0.5">{dates}</div>}
        </div>
        <button onClick={onClose} className="ml-auto text-gray-300 hover:text-gray-500 text-xl leading-none self-start shrink-0">×</button>
      </div>
      <div className="p-3 flex flex-col gap-2">
        <button onClick={onCenter}
          className="w-full text-sm font-medium py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors">
          🌳 Center Tree Here
        </button>
        <button onClick={onProfile}
          className="w-full text-sm font-medium py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white transition-colors">
          👤 View Full Profile
        </button>
      </div>
    </div>
  );
}
