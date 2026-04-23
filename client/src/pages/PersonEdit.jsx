import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getPerson, updatePerson, createEvent, updateEvent, deleteEvent, createNote, updateNote, deleteNote } from '../api';
import EventForm from '../components/EventForm';

export default function PersonEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [person, setPerson] = useState(null);
  const [form, setForm] = useState({ given_name: '', surname: '', sex: 'U', nickname: '' });
  const [events, setEvents] = useState([]);
  const [notes, setNotes] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPerson(id).then(p => {
      setPerson(p);
      setForm({ given_name: p.given_name || '', surname: p.surname || '', sex: p.sex || 'U', nickname: p.nickname || '' });
      setEvents(p.events.map(e => ({ ...e })));
      setNotes(p.notes.map(n => ({ ...n })));
    }).finally(() => setLoading(false));
  }, [id]);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await updatePerson(id, { ...form, name_raw: `${form.given_name} /${form.surname}/`, nickname: form.nickname || null });

      // Sync events
      const originalIds = new Set(person.events.map(e => e.id));
      const currentIds = new Set(events.filter(e => e.id).map(e => e.id));

      for (const orig of person.events) {
        if (!currentIds.has(orig.id)) await deleteEvent(orig.id);
      }
      for (const ev of events) {
        if (!ev.id) {
          await createEvent({ individual_id: id, ...ev });
        } else if (originalIds.has(ev.id)) {
          await updateEvent(ev.id, ev);
        }
      }

      // Sync notes
      const origNoteIds = new Set(person.notes.map(n => n.id));
      const currentNoteIds = new Set(notes.filter(n => n.id).map(n => n.id));
      for (const orig of person.notes) {
        if (!currentNoteIds.has(orig.id)) await deleteNote(orig.id);
      }
      for (const note of notes) {
        if (!note.id) {
          if (note.content?.trim()) await createNote({ individual_id: id, content: note.content });
        } else {
          await updateNote(note.id, { content: note.content });
        }
      }

      navigate(`/people/${id}`);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-12 text-center text-gray-400">Loading...</div>;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="text-sm text-gray-500 mb-4">
        <Link to="/people" className="hover:text-amber-700">People</Link> /
        <Link to={`/people/${id}`} className="hover:text-amber-700 ml-1">
          {`${person.given_name || ''} ${person.surname || ''}`.trim()}
        </Link> / Edit
      </div>

      <h1 className="text-2xl font-bold text-gray-800 mb-6">Edit Person</h1>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white border border-amber-200 rounded-xl p-5 shadow-sm">
          <h2 className="text-base font-semibold text-amber-900 mb-4">Basic Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Given Name</label>
              <input
                type="text"
                value={form.given_name}
                onChange={e => setForm(f => ({ ...f, given_name: e.target.value }))}
                className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Surname</label>
              <input
                type="text"
                value={form.surname}
                onChange={e => setForm(f => ({ ...f, surname: e.target.value }))}
                className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sex</label>
              <select
                value={form.sex}
                onChange={e => setForm(f => ({ ...f, sex: e.target.value }))}
                className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="M">Male</option>
                <option value="F">Female</option>
                <option value="U">Unknown</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nickname <span className="text-gray-400 font-normal">(optional)</span></label>
              <input
                type="text"
                value={form.nickname}
                onChange={e => setForm(f => ({ ...f, nickname: e.target.value }))}
                placeholder='e.g. "Bud", "Skip"'
                className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Events */}
        <div className="bg-white border border-amber-200 rounded-xl p-5 shadow-sm">
          <h2 className="text-base font-semibold text-amber-900 mb-4">Life Events</h2>
          <EventForm events={events} onChange={setEvents} />
        </div>

        {/* Notes */}
        <div className="bg-white border border-amber-200 rounded-xl p-5 shadow-sm">
          <h2 className="text-base font-semibold text-amber-900 mb-4">Notes</h2>
          {notes.map((note, idx) => (
            <div key={note.id || `new-${idx}`} className="mb-3 flex gap-2">
              <textarea
                value={note.content}
                onChange={e => setNotes(ns => ns.map((n, i) => i === idx ? { ...n, content: e.target.value } : n))}
                rows={4}
                className="flex-1 border border-amber-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <button
                type="button"
                onClick={() => setNotes(ns => ns.filter((_, i) => i !== idx))}
                className="text-red-400 hover:text-red-600 self-start text-lg"
              >×</button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setNotes(ns => [...ns, { content: '', _new: true }])}
            className="text-sm text-amber-700 hover:text-amber-900 font-medium"
          >+ Add Note</button>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="bg-green-800 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <Link
            to={`/people/${id}`}
            className="bg-white border border-amber-300 text-amber-800 px-6 py-2 rounded-lg text-sm font-medium hover:bg-amber-50 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
