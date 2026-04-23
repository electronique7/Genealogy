# Reinsel Family Tree — Data Dictionary

*Generated 2026-04-22. Source: `genealogy.db` (SQLite), imported from `reinsel (6).ged` (GEDCOM 5.5).*

---

## Record Counts

| Table | Rows | Description |
|---|---:|---|
| individuals | 8,162 | One row per person |
| families | 2,645 | One row per family unit |
| family_members | 10,811 | Links people to families with a role |
| events | 12,071 | All life and family events |
| notes | 403 | Free-text notes attached to people or families |
| sources | 17 | Source documents referenced in the GEDCOM |
| source_citations | 1,902 | Links sources to individuals or events |
| users | *(app)* | App login accounts |
| activity_log | *(app)* | Audit trail of app actions |

---

## Genealogy Tables

### `individuals`
One row per person imported from the GEDCOM file.

| Column | Type | Nullable | Description |
|---|---|---|---|
| id | TEXT | No | Unique identifier, e.g. `I682`. Sourced directly from GEDCOM `@I682@` tag (@ stripped). Primary key. |
| given_name | TEXT | Yes | First and middle names as a single string, e.g. `"Joseph Henry"` |
| surname | TEXT | Yes | Family name, e.g. `"Reinsel"`. Extracted from GEDCOM `/Surname/` notation. |
| name_raw | TEXT | Yes | Full original GEDCOM name string, e.g. `"Joseph Henry /Reinsel/"` |
| sex | TEXT | Yes | `M` = Male, `F` = Female, `U` = Unknown |
| nickname | TEXT | Yes | Informal name or alias, e.g. `"Bud"`. Added manually via the app. |
| created_at | TEXT | No | ISO datetime when the record was created |
| updated_at | TEXT | No | ISO datetime of last modification |

---

### `events`
All life events for individuals and families. One individual can have many events.

| Column | Type | Nullable | Description |
|---|---|---|---|
| id | INTEGER | No | Auto-increment primary key |
| individual_id | TEXT | Yes | Links to `individuals.id`. Set for personal events (birth, death, etc.) |
| family_id | TEXT | Yes | Links to `families.id`. Set for family events (marriage, divorce). |
| event_type | TEXT | No | Standardized GEDCOM event code (see table below) |
| date_text | TEXT | Yes | Raw date string as it appears in the GEDCOM, e.g. `"Dec 08 1803"`, `"Abt 1870"` |
| date_sort | TEXT | Yes | Normalized ISO-style date for sorting, e.g. `"1803-12-08"`, `"1870-00-00"` |
| place | TEXT | Yes | Free-text location, e.g. `"Union Township, Jefferson Co., PA"` |
| note | TEXT | Yes | Event-level note text |

**Event type codes and counts:**

| Code | Meaning | Count |
|---|---|---:|
| BIRT | Birth | 8,162 |
| DEAT | Death | 2,959 |
| MARR | Marriage | 663 |
| BURI | Burial | 186 |
| DIV | Divorce | 34 |
| IMMI | Immigration | 31 |
| BAPM | Baptism | 24 |
| NATU | Naturalization | 6 |
| ADOP | Adoption | 3 |
| CONF | Confirmation | 2 |
| RESI | Residence | 1 |

**Coverage notes:**
- Every individual has a BIRT record (8,162), but only 938 have a birth *place*.
- 2,959 of 8,162 individuals (36%) have a death record.
- 186 have a burial record; place coverage is sparse.

---

### `families`
One row per family unit (a couple, with or without children).

| Column | Type | Nullable | Description |
|---|---|---|---|
| id | TEXT | No | Unique identifier, e.g. `F1`. Sourced from GEDCOM `@F1@` tag. Primary key. |
| husband_id | TEXT | Yes | Links to `individuals.id`. May be null if father is unknown. |
| wife_id | TEXT | Yes | Links to `individuals.id`. May be null if mother is unknown. |
| created_at | TEXT | No | ISO datetime when the record was created |
| updated_at | TEXT | No | ISO datetime of last modification |

---

### `family_members`
Junction table linking individuals to families with a role. A person can appear in multiple families (once as a child, once or more as a spouse).

| Column | Type | Nullable | Description |
|---|---|---|---|
| family_id | TEXT | No | Links to `families.id` |
| individual_id | TEXT | No | Links to `individuals.id` |
| role | TEXT | No | `HUSBAND`, `WIFE`, or `CHILD` |

**Role counts:**

| Role | Count |
|---|---:|
| CHILD | 5,650 |
| HUSBAND | 2,616 |
| WIFE | 2,545 |

Primary key is `(family_id, individual_id, role)`.

---

### `notes`
Free-text notes attached to a person or family, imported from GEDCOM NOTE records.

| Column | Type | Nullable | Description |
|---|---|---|---|
| id | INTEGER | No | Auto-increment primary key |
| individual_id | TEXT | Yes | Links to `individuals.id` if note belongs to a person |
| family_id | TEXT | Yes | Links to `families.id` if note belongs to a family |
| content | TEXT | No | Full note text. GEDCOM CONC lines are concatenated directly; CONT lines joined with `\n`. May contain HTML `<br>` tags. |

---

### `sources`
Reference documents cited in the GEDCOM file (census records, vital records, etc.).

| Column | Type | Nullable | Description |
|---|---|---|---|
| id | TEXT | No | Unique identifier, e.g. `S4275259`. Sourced from GEDCOM `@S...@` tag. Primary key. |
| title | TEXT | Yes | Title of the source document |
| author | TEXT | Yes | Author or repository name |
| publication | TEXT | Yes | Publication details |
| text | TEXT | Yes | Full source text or transcription |
| ref_number | TEXT | Yes | Reference or call number |
| type | TEXT | Yes | Source type classification |

17 sources total in the dataset.

---

### `source_citations`
Links a source document to an individual or event, with optional citation text.

| Column | Type | Nullable | Description |
|---|---|---|---|
| id | INTEGER | No | Auto-increment primary key |
| source_id | TEXT | Yes | Links to `sources.id` |
| individual_id | TEXT | Yes | Links to `individuals.id` |
| event_id | INTEGER | Yes | Links to `events.id` |
| citation_text | TEXT | Yes | Specific page, entry, or excerpt from the source |

1,902 citations total across 17 sources.

---

## App Infrastructure Tables

### `users`
Login accounts for the web application. Not from the GEDCOM file.

| Column | Type | Nullable | Description |
|---|---|---|---|
| id | INTEGER | No | Auto-increment primary key |
| username | TEXT | No | Unique login name |
| email | TEXT | Yes | Optional email address |
| password_hash | TEXT | No | bcrypt hash of the password (never stored in plain text) |
| role | TEXT | No | `admin`, `editor`, or `viewer`. Defaults to `viewer`. |
| active | INTEGER | No | `1` = active, `0` = disabled. Defaults to `1`. |
| created_at | TEXT | No | ISO datetime of account creation |
| updated_at | TEXT | No | ISO datetime of last modification |

---

### `activity_log`
Audit trail of all significant actions taken in the app.

| Column | Type | Nullable | Description |
|---|---|---|---|
| id | INTEGER | No | Auto-increment primary key |
| user_id | INTEGER | Yes | Links to `users.id` |
| username | TEXT | Yes | Snapshot of username at time of action |
| action | TEXT | No | Action type: `login`, `logout`, `register`, `create`, `update`, `delete`, `password_change`, `failed_login` |
| entity_type | TEXT | Yes | What was acted on: `person`, `family`, `event`, `note`, `user` |
| entity_id | TEXT | Yes | ID of the affected record |
| detail | TEXT | Yes | Human-readable description, e.g. `"Updated Joseph Reinsel"` |
| ip | TEXT | Yes | Client IP address |
| created_at | TEXT | No | ISO datetime of the action |

---

## Key Relationships

```
individuals ──< events           (one person → many events)
individuals ──< notes            (one person → many notes)
individuals ──< source_citations (one person → many citations)
sources     ──< source_citations (one source → many citations)
families    ──< family_members   (one family → many members)
individuals ──< family_members   (one person → many family roles)
families    ──< events           (one family → marriage/divorce events)
families    ──< notes            (one family → family notes)
```

All genealogy tables use `ON DELETE CASCADE` so deleting a person automatically removes their events, notes, family memberships, and citations.
