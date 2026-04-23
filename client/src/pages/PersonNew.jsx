import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createPerson, createEvent, createNote, createFamily, addChild } from '../api';
import EventForm from '../components/EventForm';
import PersonPicker from '../components/PersonPicker';

export default function PersonNew() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ given_name: '', surname: '', sex: 'U', nickname: '' });
  const [events, setEvents] = useState([{ event_type: 'BIRT', date_text: '', place: '' }]);
  const [notes, setNotes] = useState([]);
  const [father, setFather] = useState(null);
  const [mother, setMother] = useState(null);
  const [saving, setSaving] = useState(false);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const person = await createPerson({ ...form, name_raw: `${form.given_name} /${form.surname}/`, nickname: form.nickname || null });
      for (const ev of events) {
        if (ev.date_text || ev.place) await createEvent({ individual_id: person.id, ...ev });
      }
      for (const note of notes) {
        if (note.content?.trim()) await createNote({ individual_id: person.id, content: note.content });
      }
      // Link to parent family if provided
      if (father || mother) {
        const fam = await createFamily({ husband_id: father?.id || null, wife_id: mother?.id || null });
        await addChild(fam.id, person.id);
      }
      navigate(`/people/${person.id}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="text-sm text-gray-500 mb-4">
        <Link to="/people" className="hover:text-amber-700">People</Link> / New Person
      </div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Add New Person</h1>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-white border border-amber-200 rounded-xl p-5 shadow-sm">
          <h2 className="text-base font-semibold text-amber-900 mb-4">Basic Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Given Name</label>
              <input
                type="text"
                value={form.given_name}
                onChange={e => setForm(f => ({ ...f, given_name: e.target.value }))}
                required
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

        <div className="bg-white border border-amber-200 rounded-xl p-5 shadow-sm">
          <h2 className="text-base font-semibold text-amber-900 mb-4">Life Events</h2>
          <EventForm events={events} onChange={setEvents} />
        </div>

        <div className="bg-white border border-amber-200 rounded-xl p-5 shadow-sm">
          <h2 className="text-base font-semibold text-amber-900 mb-1">Parents <span className="text-xs font-normal text-gray-400">(optional)</span></h2>
          <p className="text-xs text-gray-500 mb-4">Link to an existing father or mother. A new family record will be created automatically.</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Father</label>
              <PersonPicker value={father} onChange={(id, p) => setFather(p)} placeholder="Search father..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mother</label>
              <PersonPicker value={mother} onChange={(id, p) => setMother(p)} placeholder="Search mother..." />
            </div>
          </div>
        </div>

        <div className="bg-white border border-amber-200 rounded-xl p-5 shadow-sm">
          <h2 className="text-base font-semibold text-amber-900 mb-4">Notes</h2>
          {notes.map((note, idx) => (
            <div key={idx} className="mb-3 flex gap-2">
              <textarea
                value={note.content}
                onChange={e => setNotes(ns => ns.map((n, i) => i === idx ? { ...n, content: e.target.value } : n))}
                rows={3}
                className="flex-1 border border-amber-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <button type="button" onClick={() => setNotes(ns => ns.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600 self-start text-lg">×</button>
            </div>
          ))}
          <button type="button" onClick={() => setNotes(ns => [...ns, { content: '' }])} className="text-sm text-amber-700 hover:text-amber-900 font-medium">+ Add Note</button>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="bg-green-800 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : 'Create Person'}
          </button>
          <Link to="/people" className="bg-white border border-amber-300 text-amber-800 px-6 py-2 rounded-lg text-sm font-medium hover:bg-amber-50 transition-colors">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
