const fs = require('fs');

const MONTHS = {
  JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
  JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12'
};

function stripId(str) {
  return str ? str.replace(/@/g, '') : str;
}

function parseName(raw) {
  if (!raw) return { given_name: '', surname: '' };
  const parts = raw.split('/');
  const given = (parts[0] || '').trim();
  const surname = parts.length >= 2 ? (parts[1] || '').trim() : '';
  return { given_name: given, surname };
}

function parseDateSort(dateText) {
  if (!dateText) return null;
  const clean = dateText.replace(/^(ABT|BEF|AFT|EST|CAL|BET)\s+/i, '').trim();
  const parts = clean.split(/\s+/);
  if (parts.length === 3) {
    const [day, mon, year] = parts;
    const month = MONTHS[mon.toUpperCase()] || '00';
    const d = day.padStart(2, '0');
    return `${year}-${month}-${d}`;
  }
  if (parts.length === 2) {
    const [mon, year] = parts;
    const month = MONTHS[mon.toUpperCase()];
    if (month) return `${year}-${month}-00`;
    return `${parts[0]}-00-00`;
  }
  if (parts.length === 1 && /^\d{3,4}$/.test(parts[0])) {
    return `${parts[0]}-00-00`;
  }
  return null;
}

function normPlace(str) {
  if (!str) return str;
  return str.replace(/`/g, "'");
}

function parseGedcom(filePath) {
  const records = { individuals: [], families: [], sources: [] };

  const fileContent = fs.readFileSync(filePath, 'utf8');
  const lines = fileContent.split(/\r?\n/);

  let currentType = null;  // 'INDI' | 'FAM' | 'SOUR'
  let current = null;
  let currentEvent = null;
  let currentNote = null;
  let currentCitation = null;
  let inNoteContext = false;

  function saveCurrentEvent() {
    if (!currentEvent || !current) return;
    if (currentEvent.owner === 'individual') {
      current.events.push(currentEvent.data);
    } else if (currentEvent.owner === 'family') {
      current.events.push(currentEvent.data);
    }
    currentEvent = null;
  }

  function saveCurrentNote() {
    if (!currentNote || !current) return;
    current.notes.push(currentNote);
    currentNote = null;
    inNoteContext = false;
  }

  function saveCurrentCitation() {
    if (!currentCitation || !current) return;
    current.citations.push(currentCitation);
    currentCitation = null;
  }

  function saveCurrent() {
    if (!current || !currentType) return;
    saveCurrentEvent();
    saveCurrentNote();
    saveCurrentCitation();
    if (currentType === 'INDI') records.individuals.push(current);
    else if (currentType === 'FAM') records.families.push(current);
    else if (currentType === 'SOUR') records.sources.push(current);
    current = null;
    currentType = null;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    // Parse: level tag [value]
    const m = line.match(/^(\d+)\s+(\S+)(?:\s+(.*))?$/);
    if (!m) continue;
    const level = parseInt(m[1]);
    const tag = m[2].toUpperCase();
    const value = (m[3] || '').trim();

    // Level 0: new record
    if (level === 0) {
      saveCurrent();
      currentEvent = null;
      currentNote = null;
      currentCitation = null;
      inNoteContext = false;

      if (tag.startsWith('@I') || (value === 'INDI')) {
        // 0 @ID@ INDI
        const id = value === 'INDI' ? stripId(tag) : null;
        if (id) {
          currentType = 'INDI';
          current = { id, given_name: '', surname: '', name_raw: '', sex: 'U', events: [], notes: [], citations: [] };
        }
      } else if (tag.startsWith('@F') && value === 'FAM') {
        currentType = 'FAM';
        current = { id: stripId(tag), husband_id: null, wife_id: null, children: [], events: [], notes: [], citations: [] };
      } else if (tag.startsWith('@S') && value === 'SOUR') {
        currentType = 'SOUR';
        current = { id: stripId(tag), title: null, author: null, publication: null, text: null, ref_number: null, type: null };
      }
      continue;
    }

    if (!current) continue;

    // INDI record tags
    if (currentType === 'INDI') {
      if (level === 1) {
        saveCurrentEvent();
        saveCurrentNote();
        saveCurrentCitation();
        inNoteContext = false;

        if (tag === 'NAME') {
          current.name_raw = value;
          const { given_name, surname } = parseName(value);
          current.given_name = given_name;
          current.surname = surname;
        } else if (tag === 'SEX') {
          current.sex = value === 'M' ? 'M' : value === 'F' ? 'F' : 'U';
        } else if (['BIRT', 'DEAT', 'BURI', 'BAPM', 'IMMI', 'NATU', 'ADOP', 'CONF', 'RESI'].includes(tag)) {
          currentEvent = { owner: 'individual', data: { event_type: tag, date_text: null, date_sort: null, place: null, note: null, citations: [] } };
        } else if (tag === 'NOTE') {
          currentNote = value.replace(/<br>/gi, '\n').replace(/`/g, "'");
          inNoteContext = true;
        } else if (tag === 'SOUR') {
          const srcId = stripId(value);
          if (srcId && srcId.startsWith('S')) {
            currentCitation = { source_id: srcId, citation_text: null };
          }
        } else if (tag === 'FAMS' || tag === 'FAMC') {
          // handled by family records
        }
      } else if (level === 2) {
        if (inNoteContext && (tag === 'CONC')) {
          currentNote += value.replace(/<br>/gi, '\n').replace(/`/g, "'");
        } else if (inNoteContext && (tag === 'CONT')) {
          currentNote += '\n' + value.replace(/<br>/gi, '\n').replace(/`/g, "'");
        } else if (currentEvent) {
          if (tag === 'DATE') {
            currentEvent.data.date_text = value;
            currentEvent.data.date_sort = parseDateSort(value);
          } else if (tag === 'PLAC' || tag === 'PLACE') {
            currentEvent.data.place = normPlace(value);
          } else if (tag === 'NOTE') {
            currentEvent.data.note = value.replace(/<br>/gi, '\n').replace(/`/g, "'");
          } else if (tag === 'SOUR') {
            const srcId = stripId(value);
            if (srcId && srcId.startsWith('S')) {
              currentCitation = { source_id: srcId, citation_text: null };
            }
          }
        }
      } else if (level === 3 && currentCitation) {
        // DATA under SOUR citation — nothing to grab here
      } else if (level === 4 && currentCitation && tag === 'TEXT') {
        currentCitation.citation_text = value;
      }
    }

    // FAM record tags
    else if (currentType === 'FAM') {
      if (level === 1) {
        saveCurrentEvent();
        saveCurrentNote();
        saveCurrentCitation();

        if (tag === 'HUSB') {
          current.husband_id = stripId(value);
        } else if (tag === 'WIFE') {
          current.wife_id = stripId(value);
        } else if (tag === 'CHIL') {
          current.children.push(stripId(value));
        } else if (tag === 'MARR') {
          currentEvent = { owner: 'family', data: { event_type: 'MARR', date_text: null, date_sort: null, place: null, note: null } };
        } else if (tag === 'DIV') {
          currentEvent = { owner: 'family', data: { event_type: 'DIV', date_text: null, date_sort: null, place: null, note: null } };
        } else if (tag === 'NOTE') {
          currentNote = value.replace(/<br>/gi, '\n').replace(/`/g, "'");
          inNoteContext = true;
        }
      } else if (level === 2) {
        if (inNoteContext && tag === 'CONC') {
          currentNote += value.replace(/<br>/gi, '\n').replace(/`/g, "'");
        } else if (inNoteContext && tag === 'CONT') {
          currentNote += '\n' + value.replace(/<br>/gi, '\n').replace(/`/g, "'");
        } else if (currentEvent) {
          if (tag === 'DATE') {
            currentEvent.data.date_text = value;
            currentEvent.data.date_sort = parseDateSort(value);
          } else if (tag === 'PLAC' || tag === 'PLACE') {
            currentEvent.data.place = normPlace(value);
          }
        }
      }
    }

    // SOUR record tags
    else if (currentType === 'SOUR') {
      if (level === 1) {
        if (tag === 'TITL') current.title = value;
        else if (tag === 'AUTH') current.author = value;
        else if (tag === 'PUBL') current.publication = value;
        else if (tag === 'TEXT') current.text = value;
        else if (tag === 'REFN') current.ref_number = value;
      } else if (level === 2) {
        if (tag === 'TYPE') current.type = value;
        else if (tag === 'CONT' && current.text !== null) current.text += '\n' + value;
        else if (tag === 'CONC' && current.text !== null) current.text += value;
      }
    }
  }

  saveCurrent();
  return records;
}

module.exports = { parseGedcom };
