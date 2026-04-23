import { Link } from 'react-router-dom';

function yearFrom(dateText) {
  if (!dateText) return null;
  const m = dateText.match(/\d{4}/);
  return m ? m[0] : null;
}

export default function PersonCard({ person, compact = false }) {
  if (!person) return null;
  const name = `${person.given_name || ''} ${person.surname || ''}`.trim() || 'Unknown';
  const birth = yearFrom(person.birth_date);
  const death = yearFrom(person.death_date);
  const years = birth || death ? `${birth || '?'} – ${death || ''}` : null;
  const sexLabel = person.sex === 'M' ? '♂' : person.sex === 'F' ? '♀' : '';

  if (compact) {
    return (
      <Link to={`/people/${person.id}`} className="text-amber-800 hover:underline font-medium">
        {name} {years && <span className="text-gray-400 text-xs font-normal">({years})</span>}
      </Link>
    );
  }

  return (
    <Link
      to={`/people/${person.id}`}
      className="block bg-white border border-amber-200 rounded-lg p-3 hover:border-amber-400 hover:shadow-sm transition-all"
    >
      <div className="font-semibold text-gray-800">{name} <span className="text-gray-400 text-sm">{sexLabel}</span></div>
      {years && <div className="text-xs text-gray-500 mt-0.5">{years}</div>}
    </Link>
  );
}
