import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getFamily, updateFamily, addChild, removeChild, createEvent, deleteEvent } from '../api';
import PersonCard from '../components/PersonCard';
import PersonPicker from '../components/PersonPicker';

export default function FamilyDetail() {
  const { id } = useParams();
  const [fam, setFam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [husband, setHusband] = useState(null);
  const [wife, setWife] = useState(null);
  const [marrDate, setMarrDate] = useState('');
  const [marrPlace, setMarrPlace] = useState('');
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    getFamily(id).then(f => {
      setFam(f);
      setHusband(f.husband || null);
      setWife(f.wife || null);
      const marr = f.events.find(e => e.event_type === 'MARR');
      setMarrDate(marr?.date_text || '');
      setMarrPlace(marr?.place || '');
    }).finally(() => setLoading(false));
  }

  useEffect(load, [id]);

  async function saveEdit() {
    setSaving(true);
    try {
      await updateFamily(id, { husband_id: husband?.id || null, wife_id: wife?.id || null });
      const marr = fam.events.find(e => e.event_type === 'MARR');
      if (marr) {
        await deleteEvent(marr.id);
      }
      if (marrDate || marrPlace) {
        await createEvent({ family_id: id, event_type: 'MARR', date_text: marrDate, place: marrPlace });
      }
      setEditMode(false);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function handleAddChild(childId) {
    if (!childId) return;
    await addChild(id, childId);
    load();
  }

  async function handleRemoveChild(personId) {
    if (!confirm('Remove this child from the family?')) return;
    await removeChild(id, personId);
    load();
  }

  if (loading) return <div className="p-12 text-center text-gray-400">Loading...</div>;
  if (!fam) return <div className="p-12 text-center text-red-400">Family not found.</div>;

  const marr = fam.events.find(e => e.event_type === 'MARR');

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="text-sm text-gray-500 mb-4">
        <Link to="/people" className="hover:text-amber-700">People</Link> / Family {fam.id}
      </div>

      <div className="bg-amber-800 text-white rounded-xl p-5 mb-6 shadow-md flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold mb-1">Family {fam.id}</h1>
          {marr && <div className="text-amber-200 text-sm">Married: {marr.date_text}{marr.place ? ` — ${marr.place}` : ''}</div>}
        </div>
        <button
          onClick={() => setEditMode(!editMode)}
          className="bg-amber-700 hover:bg-amber-600 px-3 py-1.5 rounded-lg text-sm transition-colors"
        >
          {editMode ? 'Cancel Edit' : '✏️ Edit'}
        </button>
      </div>

      {/* Parents */}
      <div className="bg-white border border-amber-200 rounded-xl p-5 mb-6 shadow-sm">
        <h2 className="text-base font-semibold text-amber-900 border-b border-amber-100 pb-2 mb-4">Parents</h2>
        {editMode ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Husband / Father</label>
              <PersonPicker value={husband} onChange={(id, p) => setHusband(p)} placeholder="Search..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Wife / Mother</label>
              <PersonPicker value={wife} onChange={(id, p) => setWife(p)} placeholder="Search..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Marriage Date</label>
                <input type="text" value={marrDate} onChange={e => setMarrDate(e.target.value)} placeholder="e.g. Jun 15 1920" className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Marriage Place</label>
                <input type="text" value={marrPlace} onChange={e => setMarrPlace(e.target.value)} placeholder="City, State" className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <button
              onClick={saveEdit}
              disabled={saving}
              className="bg-amber-800 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-gray-500 mb-1">Husband / Father</div>
              {fam.husband ? <PersonCard person={fam.husband} compact /> : <span className="text-gray-400 text-sm">—</span>}
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Wife / Mother</div>
              {fam.wife ? <PersonCard person={fam.wife} compact /> : <span className="text-gray-400 text-sm">—</span>}
            </div>
          </div>
        )}
      </div>

      {/* Children */}
      <div className="bg-white border border-amber-200 rounded-xl p-5 shadow-sm">
        <h2 className="text-base font-semibold text-amber-900 border-b border-amber-100 pb-2 mb-4">
          Children ({fam.children.length})
        </h2>
        {fam.children.length === 0 ? (
          <p className="text-gray-400 text-sm mb-4">No children recorded.</p>
        ) : (
          <div className="space-y-2 mb-4">
            {fam.children.map(c => (
              <div key={c.id} className="flex items-center justify-between gap-2">
                <PersonCard person={c} compact />
                <button
                  onClick={() => handleRemoveChild(c.id)}
                  className="text-xs text-red-400 hover:text-red-600"
                >Remove</button>
              </div>
            ))}
          </div>
        )}
        <div className="border-t border-amber-100 pt-4">
          <div className="text-xs font-medium text-gray-600 mb-2">Add Child</div>
          <PersonPicker value={null} onChange={(childId) => handleAddChild(childId)} placeholder="Search to add child..." />
        </div>
      </div>
    </div>
  );
}
