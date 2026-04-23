# Reinsel Family Tree — Feature List

*Living document. Review and annotate before next session.*

---

## 1. Data Foundation

- **GEDCOM 5.5 import** — one-time script parses `reinsel (6).ged` into SQLite
  - 8,162 individuals, 2,645 families, 17 sources, 12,071 events, 403 notes
  - Handles name splitting (`/Surname/`), CONC/CONT lines, date normalization, backtick apostrophes
  - Single transaction import (~30 seconds)
- **SQLite database** via Node.js built-in `node:sqlite` (no native compilation required)
- **WAL mode** for concurrent read performance

---

## 2. People (CRM)

### List View (`/people`)
- Paginated table, 50 records per page
- **Search by name** — prefix match on first name only (middle names not required); contains match on surname
- **Surname filter** — dropdown of all distinct surnames
- **Sex filter** — Male / Female / All
- **Column sorting** — click any column header to sort ascending/descending (▲/▼ indicator)
  - Sortable: Name, Sex, Birth year, Death year, Birthplace, Family count
- **Per-column "Hide blanks"** — Excel-style dropdown on each column header with Sort A→Z, Sort Z→A, and "Hide blank rows" checkbox; filter icon highlights amber when active
- Clear filters button resets all active filters

### Person Detail (`/people/:id`)
- Name, sex, ID badge
- **Nickname** — displayed in italic amber text below the full name when present
- Life events listed chronologically (birth, death, baptism, immigration, etc.)
- Families as spouse — marriage date/place, list of children with birth years
- Families as child — father and mother links
- Notes rendered with preserved line breaks
- Source citations
- Edit and View in Tree buttons

### Add / Edit Person (`/people/new`, `/people/:id/edit`)
- Given name, surname, sex, **nickname** fields
- Inline event editor — type, date, place; add/remove rows
- Notes textarea
- Family assignment

---

## 3. Family Detail (`/families/:id`)

- Husband and wife (linked to profiles)
- Marriage date and place
- Children list ordered by birth year
- Add / remove child via person search

---

## 4. Family Tree Visualization (`/tree`)

### Navigation
- **Search** to focus tree on any person (sidebar search with avatar dropdown)
- **Mode toggle** — Ancestors (left→right pedigree) or Descendants (top→down)
- **Generations slider** — 2 to 15 generations
- Click any card → side panel with name, dates, "Center Tree Here" and "View Full Profile" buttons
- **Breadcrumb trail** — when centering the tree on a new person, prior root person is added to a History list in the sidebar; click any history entry to navigate back and trim the trail

### Canvas
- **Pan** — drag empty canvas space
- **Zoom** — scroll wheel, + / − floating buttons, zoom slider in sidebar (8%–200%)
- **Reset view** button — recenters and restores default zoom
- Dot-grid background for spatial reference

### Cards (HTML-rendered for crisp text)
- Colored left accent strip and avatar circle by sex (blue = male, rose = female, gray = unknown)
- Given name (semibold), surname (regular weight), birth–death years
- Focused/root person highlighted with amber border
- **Per-node drag and drop** — grab any card and reposition it independently to clarify crowded areas
- **Reset card positions** button appears once any card has been moved

---

## 5. Authentication & Sessions

- **Self-registration** at `/register` — username, optional email, password + confirm
  - New accounts default to **Viewer** role
  - First account ever registered automatically becomes Admin
- **Login** at `/login` — elm tree SVG hero image on left panel; always redirects to People list after sign-in
- **Logout** — session destroyed server-side
- **Sessions** stored in SQLite, persist across server restarts, expire after 7 days
- All API routes protected; unauthenticated requests receive 401
- `withCredentials` on all API calls; Vite proxy forwards cookies in development

---

## 6. Role-Based Access Control

| Capability | Viewer | Editor | Admin |
|---|:---:|:---:|:---:|
| Browse people, families, tree | ✓ | ✓ | ✓ |
| Add / edit people and events | — | ✓ | ✓ |
| Delete records | — | ✓ | ✓ |
| Manage user accounts | — | — | ✓ |
| View activity dashboard | — | — | ✓ |

- Role badge displayed in navbar (color-coded: red = admin, blue = editor, gray = viewer)
- Edit/Add/Delete buttons hidden in UI for Viewer accounts
- Write API routes return 403 for insufficient role

---

## 7. User Management (`/admin/users`)

- List all accounts with username, email, role, active status, created date
- **Create user** — admin sets username, email, password, role directly
- **Edit user** — change role, email, active/disabled status, reset password via modal
- **Delete user** — with confirmation; cannot delete your own account
- Role legend explains each level's permissions

---

## 8. Activity Dashboard (`/admin/activity`)

### Overview Tab
- Summary cards: logins today, logins this week, active users (7-day), total registrations, data edits this week, total active accounts

### Per User Tab
- Table: username, role, status, total login count, total edit count, last login datetime, registration date

### Activity Log Tab
- Full paginated log of all tracked events (50 per page)
- **Filters**: username (partial match), action type, entity type, date range (from/to)
- Tracked actions: login, failed login, logout, register, create, update, delete, password change
- Each entry shows: timestamp, username, action badge, entity type + icon, human-readable detail, IP address

---

## 9. Infrastructure

- **Stack**: Node.js + Express (port 3001) · SQLite (`node:sqlite`) · React + Vite (port 5173) · Tailwind CSS · react-d3-tree
- **Auth packages**: `bcryptjs` (pure JS, no native deps) · `express-session`
- `concurrently` + `nodemon` for dev (single `npm start` command)
- Vite proxy forwards `/api` → Express with cookie passthrough
- Schema auto-migrates on server start; default admin seeded if no users exist

---

## Potential Future Features *(not yet built — review and prioritize)*

- [ ] Photo / document attachments per person
- [ ] DNA / relationship calculator
- [ ] Print / export to PDF (pedigree chart or family group sheet)
- [ ] GEDCOM export (round-trip back to file)
- [ ] Advanced search — birth place, death place, date ranges
- [ ] Merge duplicate individuals
- [ ] Timeline view — horizontal life events across generations
- [ ] Map view — birthplaces and migration paths plotted geographically
- [ ] Email notifications when someone edits a record
- [ ] Mobile-responsive layout improvements
- [ ] Password reset via email
- [ ] Public shareable read-only link (no login required for specific view)
- [ ] Bulk import new people via CSV
- [ ] Change history / version tracking per person record
