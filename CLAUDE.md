# Project Instructions

Conventions for working in this repository. These apply to AI agents and human
developers alike. The goal is a codebase a new developer can pick up and
understand quickly.

For *what lives where*, read `docs/CONTEXT.md` (the project map). This file is
the *rules*; that file is the *map*. For visual/design tokens, read
`docs/STYLE_GUIDE.md`.

## Core principles

- **Modular and reusable.** Build small, single-purpose components and
  functions that can be composed and reused. Before writing new code, check
  whether something reusable already exists (`docs/CONTEXT.md` lists shared
  utilities and components).
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
in `docs/CONTEXT.md` — consult it before adding a file so things land in the
right place.

When you add, move, or remove a file, **update `docs/CONTEXT.md` in the same
change.** The map is only useful if it is never stale.

## Styling

If the project has a UI, follow `docs/STYLE_GUIDE.md`, which matches Boncom's brand
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

## Testing

Tests are written alongside features, not bolted on afterward. The suite spans
several layers, each scaled to what the project actually needs:

- **Unit** — business logic, utilities, and edge cases in isolation.
- **Integration** — modules, components, and API contracts working together.
- **End-to-end (E2E)** — critical user flows through the running app.
- **Type checking** — the compiler is the first test; no type errors ship.
- **Accessibility (a11y)** — automated checks (e.g. axe) on key views; an
  agency brand should ship inclusive UX.
- **Performance** — Lighthouse / Core Web Vitals on key pages where it matters.

Prefer writing the test for a behavior before or together with its
implementation. A feature is not done until its tests pass (see Definition of
done). Concrete frameworks are chosen with the stack (recorded in
`docs/DECISIONS.md`); the test layout is recorded in `docs/CONTEXT.md`.

## Security testing

Security is verified, not assumed. This is defensive testing of our own
application (authorized by definition). Scale the depth to the attack surface —
at minimum the first three below, more as the surface grows:

- **Dependency / vulnerability scanning** — `npm audit` (or stack equivalent)
  and automated alerts (e.g. Dependabot) for known-vulnerable packages.
- **Secret scanning** — no keys or credentials in git history (e.g. gitleaks);
  `.gitignore` is the first line of defense.
- **Static analysis (SAST)** — security-aware linting on every change.
- **Per-feature OWASP review** — check each feature against the OWASP Top 10:
  injection, XSS, broken auth and access control (IDOR), CSRF, SSRF, security
  misconfiguration, insecure deserialization.
- **Penetration-style testing** of sensitive flows — auth, input handling, file
  upload, and anything accepting untrusted input — for higher-risk features.

See "Security and edge cases" for the matching coding practices.

## Security and edge cases

Security is a first-class concern, considered as each feature is built.

- **Validate and sanitize all input** at trust boundaries. Never trust data from
  the client, the URL, or third parties.
- **Never expose secrets.** Keys live in environment variables — never in code,
  logs, or the client bundle.
- **Authorize protected actions server-side.** Do not rely on the UI hiding
  them.
- Use parameterized queries and safe APIs — never assemble queries by string
  concatenation.
- **Handle edge cases explicitly:** empty, missing, malformed, boundary, and
  failure inputs. Loading, empty, and error states are part of every feature,
  not extras.
- Fail safe and surface errors (see "No silent failures").

## Definition of done

A feature is complete only when all of the following hold:

1. It meets the requirement and handles its edge cases.
2. Its unit and/or E2E tests are written and passing.
3. It has passed a **code review** — run the code-reviewer (agent or
   `/code-review`) after the feature is built and address the findings before
   considering it finished. This step is not optional.
4. `docs/CONTEXT.md` is updated (and `docs/DECISIONS.md` if a decision was made).

## Secrets

- Never commit secrets. Real values go in `.env` (git-ignored).
- Document every required variable in `.env.example` with a placeholder value.

## Decisions log

Record meaningful choices in `docs/DECISIONS.md` — stack picks, library choices,
notable tradeoffs — as short dated entries. This keeps the reasoning behind the
build visible and makes the project's history easy to follow.

## Commits

- Small, logical commits with clear messages describing the change and its
  intent.
- End commit messages with the configured co-author trailer.
