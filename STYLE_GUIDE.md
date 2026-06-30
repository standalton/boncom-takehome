# Style Guide

Design system for this project, matched to Boncom's external brand
(boncom.com) for visual consistency. These tokens are the single source of
truth — components should consume them (via CSS variables / theme config),
not hardcode values.

Brand reference captured 2026-06-30 from boncom.com computed styles. See
`DECISIONS.md` for the rationale behind matching the brand.

## Brand character

Minimal, editorial, and purpose-driven. Generous whitespace, thin elegant
typography, a restrained navy-and-cyan palette on white, and photography or
imagery treated in a monochrome/understated way. Signature pattern: a dark
full-bleed image with a thin white headline, followed by clean white content.
Voice: warm, mission-first ("Good work for good causes"). Avoid loud,
high-saturation, or busy UI.

## Color tokens

| Token | Hex | Use |
| ----- | --- | --- |
| `--color-ink` | `#002042` | Primary. Headings, key text, dark UI. |
| `--color-text` | `#292A2C` | Body copy (warm near-black). |
| `--color-accent` | `#65C6D9` | Links, highlights, interactive accents (cyan). |
| `--color-accent-blue` | `#3860BE` | Secondary accent / emphasis. |
| `--color-surface` | `#FFFFFF` | Default background. |
| `--color-muted` | `#696969` | Secondary text, captions. |
| `--color-muted-light` | `#999999` | Tertiary text, disabled. |
| `--color-line` | `#BFCED9` | Borders, dividers (light blue-gray). |
| `--color-line-soft` | `#DFE8ED` | Subtle fills / hairlines. |
| `--color-black` | `#000000` | Pure black where needed. |

Optional energy accent (verify before heavy use): `#FC4F2C` (warm orange).
Use sparingly for a single call-to-action at most, if at all.

### Usage rules

- Default page: `--color-surface` background, `--color-text` body,
  `--color-ink` headings.
- Dark hero/feature sections: dark imagery or `--color-ink` background with
  white text and thin headings.
- Links/interactive: `--color-accent`; reserve `--color-accent-blue` for
  secondary emphasis.
- Keep saturation low elsewhere. Supporting imagery/logos lean monochrome.

## Typography

Font family: **Open Sans** (Google Fonts — free, matches Boncom exactly).
Fallback stack: `"Open Sans", Arial, sans-serif`.

| Token | Size | Weight | Tracking | Notes |
| ----- | ---- | ------ | -------- | ----- |
| `--font-display` | ~60px (clamp down on mobile) | 300 | -1.4px | Hero headline. Sentence/lowercase, not caps. |
| `--font-h2` | ~36px | 300-600 | -1px | Section heading. |
| `--font-h3` | ~28px | 700 | -1.1px | Sub-heading. |
| `--font-body` | 18px | 400 | normal | Body. Line-height ~1.67. |
| `--font-label` | 13px | 600 | +0.1em | Nav / eyebrow labels. UPPERCASE. |

### Type rules

- Big headings are **light weight (300)** with **negative letter-spacing** —
  this thin, tight look is core to the brand. Do not bold large display text.
- Body line-height is generous (~1.67) for an airy, readable feel.
- Labels and nav are uppercase and letter-spaced; headlines are not.

## Spacing and layout

- Generous whitespace is part of the brand — do not crowd elements.
- Use a consistent spacing scale (suggested rem steps): 4, 8, 12, 16, 24,
  32, 48, 64, 96 px. Define as tokens when scaffolding.
- Content sits in a centered max-width container with comfortable gutters.
- Prefer clean single-column or simple grid layouts over dense dashboards.

## Components

- **Buttons:** minimal. Square or very slightly rounded corners (Boncom uses
  `0px` radius). Clear text label, accent or ink fill, simple hover (subtle
  opacity/color shift). No heavy shadows or gradients.
- **Links:** cyan accent, no underline by default; underline or color shift
  on hover.
- **Cards/sections:** flat, hairline borders (`--color-line`) or whitespace
  separation rather than heavy shadows.
- **Imagery:** large, editorial, often dark; pair with thin white type.

## Implementation note

When the stack is chosen, encode these as CSS custom properties (or a Tailwind
theme) in one place and reference everywhere. Record the mapping in
`CONTEXT.md` so the link between tokens and code is discoverable.
