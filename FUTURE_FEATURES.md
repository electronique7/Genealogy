# Future Feature Requests

Add ideas below. When ready, ask Claude to implement them as a batch.

---

- [ ] **Split names into first / middle / last fields** — Add `first_name`, `middle_name`, and `suffix` columns to `individuals` alongside the existing `given_name` (kept intact as a fallback). Parser handles 8,131 records cleanly; 31 need manual review (suffixes Jr/Sr/II/III, honorifics, parenthetical alternate names, uncertain `?` entries). See [DATA_DICTIONARY.md](DATA_DICTIONARY.md) for full field reference. Analysis already done — ready to implement when approved.
