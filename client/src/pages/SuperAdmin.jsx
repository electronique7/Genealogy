import { useState, useEffect } from 'react';
import { getActivitySummary, getActivityUsers, getActivityLog } from '../api';

const ACTION_LABEL = {
  login:           { label: 'Login',           color: 'bg-green-100 text-green-700' },
  login_failed:    { label: 'Failed Login',     color: 'bg-red-100 text-red-600' },
  logout:          { label: 'Logout',           color: 'bg-gray-100 text-gray-500' },
  register:        { label: 'Registered',       color: 'bg-blue-100 text-blue-700' },
  create:          { label: 'Created',          color: 'bg-emerald-100 text-emerald-700' },
  update:          { label: 'Updated',          color: 'bg-amber-100 text-amber-700' },
  delete:          { label: 'Deleted',          color: 'bg-red-100 text-red-700' },
  password_change: { label: 'Password Changed', color: 'bg-purple-100 text-purple-700' },
};

const ENTITY_ICON = { person: '👤', family: '👨‍👩‍👧', event: '📅', note: '📝', user: '🔐', '': '—' };

function ActionBadge({ action }) {
  const a = ACTION_LABEL[action] || { label: action, color: 'bg-gray-100 text-gray-500' };
  return <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${a.color}`}>{a.label}</span>;
}

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-white rounded-xl border border-amber-200 shadow-sm p-5">
      <div className="text-2xl font-bold text-gray-800">{value ?? '—'}</div>
      <div className="text-sm font-medium text-gray-600 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  );
}

function fmt(ts) {
  if (!ts) return '—';
  return new Date(ts + 'Z').toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function SuperAdmin() {
  const [tab, setTab] = useState('overview');

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Activity Dashboard</h1>
        <p className="text-sm text-gray-400 mt-0.5">Logins, account activity, and data changes</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1 w-fit">
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'users',    label: 'Per User' },
          { key: 'log',      label: 'Activity Log' },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${tab === key ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'overview' && <Overview />}
      {tab === 'users'    && <UserBreakdown fmt={fmt} />}
      {tab === 'log'      && <ActivityLog fmt={fmt} />}
    </div>
  );
}

function Overview() {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    getActivitySummary().then(setSummary).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="Logins today"         value={summary?.loginsToday}   sub="unique sessions" />
        <StatCard label="Logins this week"     value={summary?.loginsWeek}    sub="last 7 days" />
        <StatCard label="Active users (7 days)"value={summary?.activeUsers}   sub={`of ${summary?.totalUsers ?? '?'} total`} />
        <StatCard label="Registrations"        value={summary?.registrations} sub="all time" />
        <StatCard label="Data edits this week" value={summary?.editsWeek}     sub="create / update / delete" />
        <StatCard label="Total accounts"       value={summary?.totalUsers}    sub="active" />
      </div>
    </div>
  );
}

function UserBreakdown({ fmt }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getActivityUsers().then(setUsers).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center text-gray-400 py-12">Loading…</div>;

  return (
    <div className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-amber-100 text-amber-900">
          <tr>
            <th className="text-left px-4 py-3 font-semibold">Username</th>
            <th className="text-left px-4 py-3 font-semibold">Role</th>
            <th className="text-left px-4 py-3 font-semibold">Status</th>
            <th className="text-right px-4 py-3 font-semibold">Logins</th>
            <th className="text-right px-4 py-3 font-semibold">Edits</th>
            <th className="text-left px-4 py-3 font-semibold">Last Login</th>
            <th className="text-left px-4 py-3 font-semibold">Registered</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-amber-50">
          {users.map(u => (
            <tr key={u.id} className={`hover:bg-amber-50 transition-colors ${!u.active ? 'opacity-40' : ''}`}>
              <td className="px-4 py-3 font-medium text-gray-800">{u.username}</td>
              <td className="px-4 py-3 capitalize text-gray-600">{u.role}</td>
              <td className="px-4 py-3">
                <span className={`text-xs font-semibold ${u.active ? 'text-green-600' : 'text-gray-400'}`}>
                  {u.active ? 'Active' : 'Disabled'}
                </span>
              </td>
              <td className="px-4 py-3 text-right text-gray-600">{u.login_count}</td>
              <td className="px-4 py-3 text-right text-gray-600">{u.edit_count}</td>
              <td className="px-4 py-3 text-gray-500 text-xs">{fmt(u.last_login)}</td>
              <td className="px-4 py-3 text-gray-400 text-xs">{u.registered_at?.slice(0, 10)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const ACTIONS = ['', 'login', 'login_failed', 'logout', 'register', 'create', 'update', 'delete', 'password_change'];
const ENTITIES = ['', 'person', 'family', 'event', 'note', 'user'];

function ActivityLog({ fmt }) {
  const [data,    setData]    = useState({ total: 0, data: [] });
  const [loading, setLoading] = useState(true);
  const [page,    setPage]    = useState(1);
  const [filters, setFilters] = useState({ user: '', action: '', entity: '', from: '', to: '' });
  const limit = 50;

  useEffect(() => {
    setLoading(true);
    getActivityLog({ page, limit, ...filters })
      .then(setData)
      .finally(() => setLoading(false));
  }, [page, filters]);

  function setFilter(k, v) {
    setFilters(f => ({ ...f, [k]: v }));
    setPage(1);
  }

  const totalPages = Math.ceil(data.total / limit);

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4 bg-white p-3 rounded-xl border border-amber-200 shadow-sm">
        <input value={filters.user} onChange={e => setFilter('user', e.target.value)}
          placeholder="Filter by username…"
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 w-44" />
        <select value={filters.action} onChange={e => setFilter('action', e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400">
          {ACTIONS.map(a => <option key={a} value={a}>{a || 'All actions'}</option>)}
        </select>
        <select value={filters.entity} onChange={e => setFilter('entity', e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400">
          {ENTITIES.map(e => <option key={e} value={e}>{e || 'All types'}</option>)}
        </select>
        <input type="date" value={filters.from} onChange={e => setFilter('from', e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
        <input type="date" value={filters.to} onChange={e => setFilter('to', e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
        {Object.values(filters).some(Boolean) && (
          <button onClick={() => { setFilters({ user: '', action: '', entity: '', from: '', to: '' }); setPage(1); }}
            className="text-sm text-amber-700 hover:underline px-2">Clear</button>
        )}
        <span className="ml-auto text-xs text-gray-400 self-center">{data.total.toLocaleString()} entries</span>
      </div>

      <div className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-gray-400">Loading…</div>
        ) : data.data.length === 0 ? (
          <div className="py-12 text-center text-gray-400">No entries found</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-amber-100 text-amber-900">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Time</th>
                <th className="text-left px-4 py-3 font-semibold">User</th>
                <th className="text-left px-4 py-3 font-semibold">Action</th>
                <th className="text-left px-4 py-3 font-semibold">Type</th>
                <th className="text-left px-4 py-3 font-semibold">Detail</th>
                <th className="text-left px-4 py-3 font-semibold">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-amber-50">
              {data.data.map(row => (
                <tr key={row.id} className="hover:bg-amber-50 transition-colors">
                  <td className="px-4 py-2.5 text-gray-400 text-xs whitespace-nowrap">{fmt(row.created_at)}</td>
                  <td className="px-4 py-2.5 font-medium text-gray-700">{row.username || <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-2.5"><ActionBadge action={row.action} /></td>
                  <td className="px-4 py-2.5 text-gray-500 text-xs">
                    {ENTITY_ICON[row.entity_type] || ''} {row.entity_type || '—'}
                  </td>
                  <td className="px-4 py-2.5 text-gray-600 text-xs max-w-xs truncate">{row.detail || '—'}</td>
                  <td className="px-4 py-2.5 text-gray-400 text-xs font-mono">{row.ip || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
              className="px-3 py-1 rounded border border-amber-300 disabled:opacity-40 hover:bg-amber-100">← Prev</button>
            <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
              className="px-3 py-1 rounded border border-amber-300 disabled:opacity-40 hover:bg-amber-100">Next →</button>
          </div>
        </div>
      )}
    </div>
  );
}
