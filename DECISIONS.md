# Decisions Log

Short, dated entries recording meaningful choices made while building this
project — stack, libraries, architecture, and notable tradeoffs. The brief asks
specifically about *the decisions behind the build*; this is where they live.

Format: newest first.

---

## 2026-06-30 — Match Boncom brand for the UI

- **Decision:** Adopt Boncom's external brand (boncom.com) as the project's
  visual language — navy `#002042` + cyan `#65C6D9` on white, Open Sans
  typography, minimal/editorial aesthetic. Captured as tokens in
  `STYLE_GUIDE.md`.
- **Why:** Boncom is a branding/communications agency; building the demo in
  their visual language demonstrates brand-consistency thinking, which is core
  to the AI Solutions Manager role.
- **Note:** Boncom uses Open Sans, a free Google Font, so the typography can be
  matched exactly with no licensing concern.

## 2026-06-30 — Repository conventions established

- **Decision:** Adopt a modular, small-file architecture with per-file header
  comments, a separate rules file (`CLAUDE.md`) and project map (`CONTEXT.md`),
  and this decisions log.
- **Why:** Keep the codebase navigable and easy for a new developer to adopt;
  make the reasoning behind the build explicit for the interview panel.
