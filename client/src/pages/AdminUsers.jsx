import { useState, useEffect } from 'react';
import { getUsers, createUser, updateUser, deleteUser } from '../api';
import { useAuth } from '../context/AuthContext';

const ROLES = ['viewer', 'editor', 'admin'];
const ROLE_BADGE = {
  admin:  'bg-red-100 text-red-700',
  editor: 'bg-blue-100 text-blue-700',
  viewer: 'bg-gray-100 text-gray-600',
};

function Badge({ role }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${ROLE_BADGE[role] || ROLE_BADGE.viewer}`}>
      {role}
    </span>
  );
}

export default function AdminUsers() {
  const { user: me } = useAuth();
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  // New user form
  const [showNew,   setShowNew]   = useState(false);
  const [newForm,   setNewForm]   = useState({ username: '', email: '', password: '', role: 'viewer' });
  const [newError,  setNewError]  = useState('');
  const [newSaving, setNewSaving] = useState(false);

  // Edit modal
  const [editing,    setEditing]    = useState(null);
  const [editForm,   setEditForm]   = useState({});
  const [editError,  setEditError]  = useState('');
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    load();
  }, []);

  function load() {
    setLoading(true);
    getUsers().then(setUsers).catch(() => setError('Failed to load users')).finally(() => setLoading(false));
  }

  async function handleCreate(e) {
    e.preventDefault();
    setNewError('');
    setNewSaving(true);
    try {
      await createUser(newForm);
      setShowNew(false);
      setNewForm({ username: '', email: '', password: '', role: 'viewer' });
      load();
    } catch (err) {
      setNewError(err.response?.data?.error || 'Failed to create user');
    } finally {
      setNewSaving(false);
    }
  }

  function openEdit(u) {
    setEditing(u);
    setEditForm({ email: u.email || '', role: u.role, active: u.active, password: '' });
    setEditError('');
  }

  async function handleEdit(e) {
    e.preventDefault();
    setEditError('');
    setEditSaving(true);
    try {
      await updateUser(editing.id, {
        email:    editForm.email,
        role:     editForm.role,
        active:   editForm.active,
        password: editForm.password || undefined,
      });
      setEditing(null);
      load();
    } catch (err) {
      setEditError(err.response?.data?.error || 'Failed to update user');
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDelete(u) {
    if (!window.confirm(`Delete user "${u.username}"? This cannot be undone.`)) return;
    try {
      await deleteUser(u.id);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete user');
    }
  }

  if (loading) return <div className="p-12 text-center text-gray-400">Loading…</div>;
  if (error)   return <div className="p-12 text-center text-red-400">{error}</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">User Management</h1>
          <p className="text-sm text-gray-500">{users.length} account{users.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowNew(v => !v)}
          className="bg-amber-800 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + Add User
        </button>
      </div>

      {/* Role legend */}
      <div className="bg-white rounded-xl border border-amber-200 shadow-sm p-4 mb-5 grid grid-cols-3 gap-3 text-sm">
        {[
          { role: 'admin',  desc: 'Full access — edit data, manage users' },
          { role: 'editor', desc: 'Add and edit people, families, events' },
          { role: 'viewer', desc: 'Read-only — browse and view the tree' },
        ].map(({ role, desc }) => (
          <div key={role} className="flex items-start gap-2">
            <Badge role={role} />
            <span className="text-gray-500 text-xs leading-tight">{desc}</span>
          </div>
        ))}
      </div>

      {/* New user form */}
      {showNew && (
        <form onSubmit={handleCreate} className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-5 space-y-3">
          <h2 className="font-semibold text-gray-700 mb-1">New User</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Username</label>
              <input required value={newForm.username} onChange={e => setNewForm(f => ({ ...f, username: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Email (optional)</label>
              <input value={newForm.email} onChange={e => setNewForm(f => ({ ...f, email: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Password</label>
              <input required type="password" value={newForm.password} onChange={e => setNewForm(f => ({ ...f, password: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Role</label>
              <select value={newForm.role} onChange={e => setNewForm(f => ({ ...f, role: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400">
                {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
              </select>
            </div>
          </div>
          {newError && <p className="text-sm text-red-600">{newError}</p>}
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={newSaving}
              className="bg-amber-800 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
              {newSaving ? 'Creating…' : 'Create User'}
            </button>
            <button type="button" onClick={() => setShowNew(false)}
              className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
          </div>
        </form>
      )}

      {/* Users table */}
      <div className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-amber-100 text-amber-900">
            <tr>
              <th className="text-left px-4 py-3 font-semibold">Username</th>
              <th className="text-left px-4 py-3 font-semibold">Email</th>
              <th className="text-left px-4 py-3 font-semibold">Role</th>
              <th className="text-left px-4 py-3 font-semibold">Status</th>
              <th className="text-left px-4 py-3 font-semibold">Created</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-amber-50">
            {users.map(u => (
              <tr key={u.id} className={`hover:bg-amber-50 transition-colors ${!u.active ? 'opacity-50' : ''}`}>
                <td className="px-4 py-3 font-medium text-gray-800">
                  {u.username}
                  {u.id === me?.id && <span className="ml-2 text-[10px] text-amber-600 font-semibold uppercase tracking-wide">you</span>}
                </td>
                <td className="px-4 py-3 text-gray-500">{u.email || '—'}</td>
                <td className="px-4 py-3"><Badge role={u.role} /></td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-semibold ${u.active ? 'text-green-600' : 'text-gray-400'}`}>
                    {u.active ? 'Active' : 'Disabled'}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">{u.created_at?.slice(0, 10)}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => openEdit(u)}
                    className="text-xs text-amber-700 hover:underline mr-3">Edit</button>
                  {u.id !== me?.id && (
                    <button onClick={() => handleDelete(u)}
                      className="text-xs text-red-400 hover:underline">Delete</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleEdit} className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h2 className="font-bold text-gray-800 text-lg">Edit — {editing.username}</h2>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Email</label>
              <input value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Role</label>
              <select value={editForm.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400">
                {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Status</label>
              <select value={editForm.active} onChange={e => setEditForm(f => ({ ...f, active: Number(e.target.value) }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400">
                <option value={1}>Active</option>
                <option value={0}>Disabled</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">New Password <span className="normal-case font-normal text-gray-400">(leave blank to keep current)</span></label>
              <input type="password" value={editForm.password} onChange={e => setEditForm(f => ({ ...f, password: e.target.value }))}
                placeholder="••••••••"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
            {editError && <p className="text-sm text-red-600">{editError}</p>}
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={editSaving}
                className="flex-1 bg-amber-800 hover:bg-amber-700 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                {editSaving ? 'Saving…' : 'Save Changes'}
              </button>
              <button type="button" onClick={() => setEditing(null)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg text-sm font-medium">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
