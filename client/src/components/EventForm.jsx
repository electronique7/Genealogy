import { useState } from 'react';

const EVENT_TYPES = ['BIRT','DEAT','BURI','BAPM','IMMI','NATU','ADOP','CONF','RESI','OTHER'];
const EVENT_LABELS = {
  BIRT:'Birth', DEAT:'Death', BURI:'Burial', BAPM:'Baptism',
  IMMI:'Immigration', NATU:'Naturalization', ADOP:'Adoption',
  CONF:'Confirmation', RESI:'Residence', OTHER:'Other',
};

export default function EventForm({ events, onChange }) {
  function update(idx, field, val) {
    const next = events.map((e, i) => i === idx ? { ...e, [field]: val } : e);
    onChange(next);
  }
  function add() {
    onChange([...events, { event_type: 'BIRT', date_text: '', place: '', note: '', _new: true }]);
  }
  function remove(idx) {
    onChange(events.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-3">
      {events.map((ev, idx) => (
        <div key={ev.id || `new-${idx}`} className="grid grid-cols-12 gap-2 items-start bg-amber-50 rounded-lg p-3">
          <div className="col-span-3">
            <select
              value={ev.event_type}
              onChange={e => update(idx, 'event_type', e.target.value)}
              className="w-full border border-amber-300 rounded px-2 py-1.5 text-sm bg-white"
            >
              {EVENT_TYPES.map(t => <option key={t} value={t}>{EVENT_LABELS[t]}</option>)}
            </select>
          </div>
          <div className="col-span-3">
            <input
              type="text"
              value={ev.date_text || ''}
              onChange={e => update(idx, 'date_text', e.target.value)}
              placeholder="Date (e.g. Mar 15 1890)"
              className="w-full border border-amber-300 rounded px-2 py-1.5 text-sm"
            />
          </div>
          <div className="col-span-5">
            <input
              type="text"
              value={ev.place || ''}
              onChange={e => update(idx, 'place', e.target.value)}
              placeholder="Place"
              className="w-full border border-amber-300 rounded px-2 py-1.5 text-sm"
            />
          </div>
          <div className="col-span-1 flex justify-end">
            <button
              onClick={() => remove(idx)}
              type="button"
              className="text-red-400 hover:text-red-600 text-lg leading-none"
              title="Remove event"
            >×</button>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="text-sm text-amber-700 hover:text-amber-900 font-medium"
      >
        + Add Event
      </button>
    </div>
  );
}
