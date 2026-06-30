# Project Instructions

Conventions for working in this repository. These apply to AI agents and human
developers alike. The goal is a codebase a new developer can pick up and
understand quickly.

For *what lives where*, read `CONTEXT.md` (the project map). This file is the
*rules*; that file is the *map*. For visual/design tokens, read `STYLE_GUIDE.md`.

## Core principles

- **Modular and reusable.** Build small, single-purpose components and
  functions that can be composed and reused. Before writing new code, check
  whether something reusable already exists (`CONTEXT.md` lists shared utilities
  and components).
- **Reusable, not speculative.** Abstract from *real* repetition — extract a
  shared piece once there are 2-3 genuine uses, not in anticipation of uses that
  may never come. Premature abstraction is as costly as duplication.
- **Small files.** No file should exceed **300 lines** without a good reason and
  explicit approval from the project owner. If a file is growing past this,
  it usually wants to be split along a clear seam.
- **Straightforward comments. No emojis.** Comments explain *why*, not *what*
  the code already says plainly. Keep them current — a wrong comment is worse
  than none.
- **No silent failures.** Handle errors and surface them. Do not swallow
  exceptions or return silent fallbacks that hide problems. If something can
  fail, the caller should be able to tell.

## File header block

Every source file begins with a header comment so a reader knows its role
without tracing imports. Keep it concise. Use the comment syntax of the file's
language; the fields are:

```
/**
 * <FileName> — <one-line purpose>
 *
 * What:        What this file does.
 * Where used:  Who imports / calls this (routes, components, callers).
 * Notes:       Invariants, gotchas, related files. Omit if none.
 */
```

## Folder taxonomy

Files are grouped into clearly named folders by responsibility. Names are
descriptive and lowercase. The concrete structure is recorded and kept current
in `CONTEXT.md` — consult it before adding a file so things land in the right
place.

When you add, move, or remove a file, **update `CONTEXT.md` in the same change.**
The map is only useful if it is never stale.

## Styling

If the project has a UI, follow `STYLE_GUIDE.md`, which matches Boncom's brand
(boncom.com). Consume the design tokens defined there — do not hardcode colors,
fonts, or spacing. Keep the look minimal and editorial per the guide.

## Naming

- Be consistent and descriptive. Favor clarity over brevity.
- Functions are verbs (`formatDate`, `fetchUser`); booleans read as questions
  (`isLoading`, `hasAccess`); components are nouns in PascalCase.
- Match the naming style already established in the surrounding code.

## Types and safety

(Applies once a typed language is chosen — likely TypeScript.)

- Prefer explicit, accurate types. Avoid `any`; if unavoidable, isolate and
  comment why.
- Make illegal states unrepresentable where practical — types should express
  the invariants the code relies on.

## Secrets

- Never commit secrets. Real values go in `.env` (git-ignored).
- Document every required variable in `.env.example` with a placeholder value.

## Decisions log

Record meaningful choices in `DECISIONS.md` — stack picks, library choices,
notable tradeoffs — as short dated entries. This keeps the reasoning behind the
build visible and makes the project's history easy to follow.

## Commits

- Small, logical commits with clear messages describing the change and its
  intent.
- End commit messages with the configured co-author trailer.
