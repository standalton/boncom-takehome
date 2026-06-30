# Decisions Log

Short, dated entries recording meaningful choices made while building this
project — stack, libraries, architecture, and notable tradeoffs. The brief asks
specifically about *the decisions behind the build*; this is where they live.

Format: newest first.

---

## 2026-06-30 — Repository conventions established

- **Decision:** Adopt a modular, small-file architecture with per-file header
  comments, a separate rules file (`CLAUDE.md`) and project map (`CONTEXT.md`),
  and this decisions log.
- **Why:** Keep the codebase navigable and easy for a new developer to adopt;
  make the reasoning behind the build explicit for the interview panel.
