import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { getPerson, deletePerson } from '../api';
import PersonCard from '../components/PersonCard';

const EVENT_LABELS = {
  BIRT: 'Birth', DEAT: 'Death', BURI: 'Burial', BAPM: 'Baptism',
  IMMI: 'Immigration', NATU: 'Naturalization', ADOP: 'Adoption',
  CONF: 'Confirmation', RESI: 'Residence', MARR: 'Marriage', DIV: 'Divorce',
};

function Section({ title, children }) {
  return (
    <div className="bg-white border border-amber-200 rounded-xl p-5 shadow-sm">
      <h2 className="text-base font-semibold text-amber-900 border-b border-amber-100 pb-2 mb-4">{title}</h2>
      {children}
    </div>
  );
}

export default function PersonDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [person, setPerson] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getPerson(id).then(setPerson).finally(() => setLoading(false));
  }, [id]);

  async function handleDelete() {
    if (!confirm(`Delete ${person.given_name} ${person.surname}? This cannot be undone.`)) return;
    await deletePerson(id);
    navigate('/people');
  }

  if (loading) return <div className="p-12 text-center text-gray-400">Loading...</div>;
  if (!person) return <div className="p-12 text-center text-red-400">Person not found.</div>;

  const fullName = `${person.given_name || ''} ${person.surname || ''}`.trim() || 'Unknown';
  const birth = person.events.find(e => e.event_type === 'BIRT');
  const death = person.events.find(e => e.event_type === 'DEAT');

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Breadcrumb */}
      <div className="text-sm text-gray-500 mb-4">
        <Link to="/people" className="hover:text-amber-700">People</Link> / {fullName}
      </div>

      {/* Header */}
      <div className="bg-green-900 text-white rounded-xl p-6 mb-6 shadow-md">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">{fullName}</h1>
            {person.nickname && (
              <p className="text-green-300 text-base mt-0.5 italic">"{person.nickname}"</p>
            )}
            <div className="flex gap-3 mt-2 text-green-200 text-sm">
              <span>{person.sex === 'M' ? '♂ Male' : person.sex === 'F' ? '♀ Female' : '—'}</span>
              {birth?.date_text && <span>b. {birth.date_text}</span>}
              {death?.date_text && <span>d. {death.date_text}</span>}
              <span className="text-green-400 text-xs font-mono">{person.id}</span>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Link
              to={`/tree?focus=${person.id}`}
              className="bg-green-800 hover:bg-green-700 px-3 py-1.5 rounded-lg text-sm transition-colors"
            >
              🌳 View Tree
            </Link>
            <Link
              to={`/people/${person.id}/edit`}
              className="bg-green-700 hover:bg-green-600 px-3 py-1.5 rounded-lg text-sm transition-colors"
            >
              ✏️ Edit
            </Link>
            <button
              onClick={handleDelete}
              className="bg-red-700 hover:bg-red-600 px-3 py-1.5 rounded-lg text-sm transition-colors"
            >
              🗑 Delete
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Life Events */}
        <Section title="Life Events">
          {person.events.length === 0 ? (
            <p className="text-gray-400 text-sm">No events recorded.</p>
          ) : (
            <div className="space-y-3">
              {person.events.map(ev => (
                <div key={ev.id} className="flex gap-3">
                  <span className="inline-block bg-amber-100 text-amber-800 text-xs font-semibold px-2 py-0.5 rounded w-24 shrink-0 text-center">
                    {EVENT_LABELS[ev.event_type] || ev.event_type}
                  </span>
                  <div className="text-sm text-gray-700">
                    {ev.date_text && <span className="font-medium">{ev.date_text}</span>}
                    {ev.place && <span className="text-gray-500 ml-1">— {ev.place}</span>}
                    {ev.note && <div className="text-xs text-gray-400 mt-0.5">{ev.note}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Parents / Families as Child */}
        <Section title="Parents">
          {person.childFamilies.length === 0 ? (
            <p className="text-gray-400 text-sm">No parent family recorded.</p>
          ) : person.childFamilies.map(fam => (
            <div key={fam.id} className="space-y-2">
              <Link to={`/families/${fam.id}`} className="text-xs text-amber-600 hover:underline">{fam.id}</Link>
              {fam.husband && (
                <div className="flex gap-2 items-center">
                  <span className="text-xs text-gray-400 w-14">Father:</span>
                  <PersonCard person={{ ...fam.husband, birth_date: null }} compact />
                </div>
              )}
              {fam.wife && (
                <div className="flex gap-2 items-center">
                  <span className="text-xs text-gray-400 w-14">Mother:</span>
                  <PersonCard person={{ ...fam.wife, birth_date: null }} compact />
                </div>
              )}
            </div>
          ))}
        </Section>

        {/* Spouse Families */}
        <div className="lg:col-span-2">
          <Section title="Spouse & Children">
            {person.spouseFamilies.length === 0 ? (
              <p className="text-gray-400 text-sm">No spouse/children families recorded.</p>
            ) : (
              <div className="space-y-6">
                {person.spouseFamilies.map(fam => {
                  const spouse = fam.husband_id === person.id ? fam.wife : fam.husband;
                  return (
                    <div key={fam.id} className="border border-amber-100 rounded-lg p-4">
                      <div className="flex items-center gap-4 mb-3">
                        <Link to={`/families/${fam.id}`} className="text-xs text-amber-600 hover:underline font-mono">{fam.id}</Link>
                        {spouse ? (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">Spouse:</span>
                            <PersonCard person={spouse} compact />
                          </div>
                        ) : <span className="text-sm text-gray-400">No spouse recorded</span>}
                        {fam.marr_date && (
                          <span className="text-xs text-gray-400 ml-auto">m. {fam.marr_date}{fam.marr_place ? ` — ${fam.marr_place}` : ''}</span>
                        )}
                      </div>
                      {fam.children.length > 0 && (
                        <div>
                          <div className="text-xs font-semibold text-gray-500 mb-2">Children ({fam.children.length})</div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {fam.children.map(c => (
                              <PersonCard key={c.id} person={c} compact />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Section>
        </div>

        {/* Notes */}
        {person.notes.length > 0 && (
          <div className="lg:col-span-2">
            <Section title="Notes">
              {person.notes.map(n => (
                <div
                  key={n.id}
                  className="text-sm text-gray-700 leading-relaxed bg-amber-50 rounded-lg p-3"
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(n.content.replace(/\n/g, '<br>'), { ALLOWED_TAGS: ['br', 'b', 'i', 'p'] })
                  }}
                />
              ))}
            </Section>
          </div>
        )}

        {/* Sources */}
        {person.citations.length > 0 && (
          <div className="lg:col-span-2">
            <Section title="Sources">
              <div className="space-y-2">
                {person.citations.map(c => (
                  <div key={c.id} className="text-sm">
                    <span className="font-medium text-gray-700">{c.title || c.source_id}</span>
                    {c.author && <span className="text-gray-500"> — {c.author}</span>}
                    {c.citation_text && <div className="text-xs text-gray-400 mt-0.5">{c.citation_text}</div>}
                  </div>
                ))}
              </div>
            </Section>
          </div>
        )}
      </div>
    </div>
  );
}
