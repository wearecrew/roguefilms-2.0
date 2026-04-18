# Rogue v2 design system

This document is the single source of truth for the tokenised design system that backs the Rogue v2 rebuild. It's the bridge between the Figma designs and the Webflow `Tokens` variable collection.

**Status**: Draft. Populated from Figma extraction 2026-04-18. Several items are flagged as open questions for Dan; once resolved, the token tree here and the Webflow `Tokens` variable collection should stay in lockstep.

---

## Source of truth

There are two files that represent this design system:

1. **This document (`docs/design-system.md`)** — human-readable spec with rationale, open questions, and design decisions. Authoritative for intent.
2. **`docs/tokens.json`** — machine-readable token set in [Crew Token Bridge](https://www.figma.com/community/plugin/) plugin format. Authoritative for values. Imported into Figma via the Token Bridge plugin; translated into Webflow variables via Webflow MCP.

The two files must stay in sync. If a value changes, update `tokens.json` first (so both Figma and Webflow can re-ingest) and then reflect the change in this doc.

### Reference IDs

- **Figma file**: [Rogue Website 2026 updates](https://www.figma.com/design/BuVndAwQ1zQKACDJFswneK/Rogue-Website-2026-updates) (file key `BuVndAwQ1zQKACDJFswneK`)
- **Webflow Variables collection**: `Tokens` (collection ID `collection-d1ebecc4-8a57-3cd3-4515-853ab0874009`) on site `69dcac21fd295013e4344d52`
- **Extraction date**: 2026-04-18
- **Desktop frames inspected**: Homepage (`0:2`), Talent list (`2:623`), Director (`2:1160`), Music Video (`2:1526`), Film & TV (`39:1718`), Film/poster detail (`2:1674`), Contact/About (`2:1262`), Navigation (`2:422`), Footer (`2:423`)
- **Mobile frames inspected**: Canvas `162:3727`, 402px wide (iPhone 16/17 Pro). Homepage (`162:3728`), Talent (`162:3948`), Director (`162:3800`), Music Video (`162:3838`), Film/poster detail (`162:3879`), Contact (`162:3912`), plus shared `Footer - Mobile` (`148:2938`). No Film & TV mobile frame — Music Video pattern covers it.
- **No tablet canvas exists.** Tablet token values are linearly interpolated between mobile and desktop.

### Important context about the Figma file

**Figma defines no Variables and no Styles.** Every colour, font-size, line-height, spacing value, border, and radius in the file is an inline hardcoded value. There are no design tokens in the Figma to pull from. Tokenisation below is therefore **inferred from observed raw usage**, not mirrored from Figma.

Implication: this is a greenfield tokenisation exercise. Where the Figma shows inconsistencies (e.g. 5 different line-heights for 16px body text), we propose a consolidated token set and flag the inconsistency as an open question.

Because the Figma isn't tokenised, the proposed token tree below should be treated as a **proposal** until Dan signs off. Several conventions (naming, clamp ranges, line-height roles) need confirming.

---

## Naming conventions

Usage-explicit naming. Path structure in Webflow Variables:

```
color/{name}              — brand colours at root (navy, pink, cream, black, white)
color/background/{role}   — background surface semantic tokens
color/text/{role}         — text colour semantic tokens
color/border/{role}       — border semantic tokens
type/family/{role}        — font family tokens
type/weight/{role}        — font weight tokens
type/size/{role}          — font-size tokens (with fluid clamps where applicable)
type/line-height/{role}   — line-height tokens (unitless)
spacing/{px value}        — spacing scale (named by px value, used for gap/padding/margin)
radius/{name}             — border radius tokens
breakpoint/{name}         — breakpoint reference values (px)
motion/duration/{name}    — motion duration (ms, as number variables)
motion/easing/{name}      — easing curves (Figma STRING variables; CSS custom properties in Webflow)
```

Semantic tokens (background, text, border) reference the flat brand colours so palette shifts cascade. Spacing tokens are named by their px value (not t-shirt sizes or use-case names) to stay generic — `spacing/20` is "20px of spacing" and can be used for any purpose.

---

## Token tree

### Colors — brand (5)

| Token | Value | Notes |
|---|---|---|
| `color/navy` | `#00162c` | Primary page background on all non-Talent pages. |
| `color/pink` | `#f25d78` | Brand accent, active states, highlight colour. |
| `color/cream` | `#f1f2eb` | Primary text colour on dark surfaces. |
| `color/black` | `#000000` | Talent list page background base; text on pink. |
| `color/white` | `#ffffff` | Reserved. Single Figma usage (film-poster caption). |

### Colors — semantic (4)

| Token | Resolves to | Purpose |
|---|---|---|
| `color/background/page` | `color/navy` | Default page background. |
| `color/text/default` | `color/cream` | Default body + headings on dark bg. |
| `color/text/highlight` | `color/pink` | Highlighted / active text, active nav, active filter pill label, link colour. |
| `color/border/subtle` | `rgba(241,242,235,0.3)` | Subtle pill/filter/search borders on navy. Stored as rgba (alpha-on-reference isn't supported in Webflow Variables). |

Semantic tokens reference the brand colours via Webflow's `existing_variable_id` so palette shifts cascade. `border/subtle` is the one exception: it stores the rgba directly as a `custom_value`.

### Colours used inline (not tokenised)

These colours appear in Figma but only in one place each. Rather than creating a token, components use the raw hex value directly:

- `#9b9b9b` — footer copyright only. Inline.
- `#323232` — Contact page divider only. Inline.

### Typography — families

| Token | Value | Weights available | Notes |
|---|---|---|---|
| `type/family/headline` | `"Galano Grotesque", sans-serif` | ExtraBold (800) | Only used for the huge page H1s (page-title role). |
| `type/family/body` | `"Px Grotesk", sans-serif` | Regular (400), Bold (700) | Used for everything else. |

Fonts are licensed and available in Webflow (confirmed 2026-04-18).

### Typography — sizes

The `font-size` group in `tokens.json` carries three modes (Mobile / Tablet / Desktop). Mobile values are Figma-sourced from the 402px canvas; Desktop values from the 1728px canvas; Tablet values are interpolated (midpoint, rounded to clean numbers) since no tablet canvas exists.

| Token | Mobile | Tablet | Desktop | Usage |
|---|---|---|---|---|
| `type/size/page-title` | 56px | 88px | 120px | Page H1s: "Talent", "Joe Connor", "Music Video", "Film & TV", "We are rogue" |
| `type/size/section-statement` | 32px | 48px | 72px | Homepage pink statement block, "News" section heading |
| `type/size/section-heading` | 32px | 34px | 36px | Section heading (e.g. Contact "Offices") |
| `type/size/subheading` | 24px | 28px | 32px | Subsection heading (e.g. Contact city labels like "London") |
| `type/size/lead-paragraph` | 18px | 21px | 24px | Lead paragraph / sub-subsection (e.g. Contact intro) |
| `type/size/name` | 20px | 20px | 20px | Stable name/label role (talent names, director names on detail page). Unchanged across breakpoints. |
| `type/size/thumbnail-title` | 16px | 18px | 20px | Film thumbnail titles within grid overlays. Diverges from `name` at mobile. |
| `type/size/body` | 14px | 15px | 16px | Default body copy, nav links, filter pill labels, thumbnail director names, footer lines |
| `type/size/caption` | 12px | 13px | 14px | Footer copyright, news-grid titles, thumbnail director-name caption |

#### Webflow clamp formulas

Webflow doesn't have Figma's mode system — fluid behaviour in a single size variable is expressed via `clamp()`. All sizes that vary by breakpoint get a clamp; `name` is a single static value. Clamps interpolate between the mobile value at 402px viewport width and the desktop value at 1728px.

| Token | Webflow value |
|---|---|
| `type/size/page-title` | `custom_value: clamp(3.5rem, 2.3rem + 4.8vw, 7.5rem)` — 56px→120px |
| `type/size/section-statement` | `custom_value: clamp(2rem, 1.25rem + 3vw, 4.5rem)` — 32px→72px |
| `type/size/section-heading` | `custom_value: clamp(2rem, 1.93rem + 0.3vw, 2.25rem)` — 32px→36px |
| `type/size/subheading` | `custom_value: clamp(1.5rem, 1.35rem + 0.6vw, 2rem)` — 24px→32px |
| `type/size/lead-paragraph` | `custom_value: clamp(1.125rem, 1rem + 0.45vw, 1.5rem)` — 18px→24px |
| `type/size/name` | `static_value: { value: 1.25, unit: "rem" }` — stable 20px |
| `type/size/thumbnail-title` | `custom_value: clamp(1rem, 0.92rem + 0.3vw, 1.25rem)` — 16px→20px |
| `type/size/body` | `custom_value: clamp(0.875rem, 0.84rem + 0.15vw, 1rem)` — 14px→16px |
| `type/size/caption` | `custom_value: clamp(0.75rem, 0.72rem + 0.15vw, 0.875rem)` — 12px→14px |

### Typography — weights

| Token | Value |
|---|---|
| `type/weight/regular` | 400 |
| `type/weight/bold` | 700 |
| `type/weight/extra-bold` | 800 |

### Typography — line-heights

Figma shows inconsistent line-height pairings for the same font-size across pages. Proposed consolidation into three roles:

| Token | Unitless value | Use for |
|---|---|---|
| `type/line-height/tight` | 1.0 | Display sizes, page H1s, title-as-name use-cases (talent list director names, director-page film titles) |
| `type/line-height/normal` | 1.5 | Default body copy and standard reading contexts |
| `type/line-height/loose` | 2.0 | Pill labels, nav links, footer address blocks — where Figma uses 32–42px on 16–20px text for visual breathing room |

This consolidation changes the Figma's inline values to a single per-role scale. A side-by-side visual check against Figma before shipping Phase 2 will confirm nothing regresses.

### Spacing

Spacing tokens are named by their px value — generic, not boxed into specific uses. Each value can be used for gap, padding, margin, or any spacing need.

| Token | Value | Typical usage (not exclusive) |
|---|---|---|
| `spacing/8` | 0.5rem (8px) | Tight gaps (filter-pill, title/director vertical) |
| `spacing/10` | 0.625rem (10px) | News section internal gap (breaks 8-pt grid but present in Figma) |
| `spacing/15` | 0.9375rem (15px) | News thumbnail-to-caption gap (breaks 8-pt grid but present in Figma) |
| `spacing/16` | 1rem (16px) | Pill padding, footer social gap, nav vertical padding |
| `spacing/20` | 1.25rem (20px) | Film thumbnail internal padding, mobile page h-padding |
| `spacing/24` | 1.5rem (24px) | News inter-block gap, Talent list per-column row gap |
| `spacing/32` | 2rem (32px) | Footer outer gap, section inner gap |
| `spacing/40` | 2.5rem (40px) | Default desktop page h-padding, filter section gap |
| `spacing/80` | 5rem (80px) | Film-detail + Contact page h-padding, homepage news bottom padding |
| `spacing/120` | 7.5rem (120px) | Hero statement block padding |

Notes:
- `spacing/10` and `spacing/15` break the 8-point grid but are preserved for Figma fidelity.
- The homepage hero wrapper has a one-off 290px top-padding that isn't worth tokenising.

### Radii

| Token | Value | Usage |
|---|---|---|
| `radius/pill` | 100px (effectively fully rounded) | All pill-shaped elements: filter pills, search input, back button, copy-link button, genre dropdown |

Only one radius is used across the entire design. Images/thumbnails have square corners. We won't create sm/md/lg radius tokens until a design need emerges.

### Breakpoints

Figma only defines the 1728px desktop canvas and the 402px mobile canvas. Intermediate breakpoint values are **proposed** based on Webflow defaults plus Finsweet Fluid Responsive conventions:

| Token | Value | Notes |
|---|---|---|
| `breakpoint/mobile` | 480px | Standard mobile threshold |
| `breakpoint/tablet` | 768px | Standard tablet threshold |
| `breakpoint/desktop` | 992px | Webflow default desktop |
| `breakpoint/desktop-large` | 1280px | Webflow default large desktop |
| `breakpoint/max` | 1728px | Figma's designed desktop canvas — fluid scaling upper bound |

### Motion

Figma provides no motion data. Seeded defaults, all **proposed**:

| Token | Value | Notes |
|---|---|---|
| `motion/duration/fast` | 150 | Hover/focus micro-interactions. Value in ms (number variable). |
| `motion/duration/normal` | 300 | Talent-page video crossfade, default transition. Value in ms. |
| `motion/duration/slow` | 500 | Dramatic transitions. Value in ms. |
| `motion/easing/standard` | `cubic-bezier(0.4, 0, 0.2, 1)` | Standard ease. CSS `:root` var — see below. |
| `motion/easing/in` | `cubic-bezier(0.4, 0, 1, 1)` | Elements leaving view. CSS `:root` var. |
| `motion/easing/out` | `cubic-bezier(0, 0, 0.2, 1)` | Elements entering view. CSS `:root` var. |

**Motion easings — architectural note.** Webflow's Size variable type rejects `cubic-bezier()` values (valid CSS but not a dimension). The three easings are therefore:
- Present in `docs/tokens.json` as Figma `STRING` variables (Figma supports string types natively).
- **Not** in the Webflow Tokens collection.
- Defined in Webflow's sitewide custom code as CSS custom properties:

```css
:root {
  --motion-easing-standard: cubic-bezier(0.4, 0, 0.2, 1);
  --motion-easing-in: cubic-bezier(0.4, 0, 1, 1);
  --motion-easing-out: cubic-bezier(0, 0, 0.2, 1);
}
```

This block belongs in Site Settings → Custom Code → Head, added in Phase 2 when the custom code shell lands (we're already planning to drop in the video controller script tag there). Components use `transition-timing-function: var(--motion-easing-standard);` directly.

---

## Responsive patterns (non-token, but design-system-adjacent)

The mobile canvas (402px) and desktop canvas (1728px) are both designed. Between them, behaviour is inferred. This section captures the cross-breakpoint rules so they're consistent when every page is built.

### Layout breakpoint behaviour (proposed)

Since no tablet canvas exists, we need a rule for when layouts switch from mobile → desktop. Proposal:

- **Mobile layout** applies below `min-width: 768px` (covering phones and smaller tablets).
- **Transitional range** (768–1024px): keep mobile-stacked layouts but let type-sizes interpolate via clamp. Add a 2-column pattern for News and Homepage latest-work where it helps.
- **Desktop layout** applies from `min-width: 1024px` (or `1280px` — TBC). Full multi-column grids engage.

This is a proposal — we'll lock the exact breakpoints before Phase 4 (homepage grid build).

### Grid collapse rules (Figma-sourced from mobile canvas)

| Context | Desktop pattern | Mobile pattern |
|---|---|---|
| Homepage news row | 5 columns | 2 columns (2+2+1 wrap) |
| Homepage latest-work | 1 full + 2 half repeating | 1 column stack, all tiles full-width |
| Talent page director names | 3 columns | 1 column (letter groups stacked vertically) |
| Director page film grid | 3 columns | 1 column stack |
| Music Video / Film & TV grids | Mixed 2-col + 3-col | 1 column stack |
| Contact page | 2-column (about | offices) | 1 column stack, except inline people-credits row stays 2-col |

### Page horizontal padding

- Desktop: `spacing/2xl` (40px) as the standard page gutter; `spacing/3xl` (80px) or `spacing/4xl` (120px) on pages with wider breathing room (film-detail, Contact).
- Mobile: `spacing/md-plus` (20px) across all pages.
- Filter-pill rows on mobile: retain `spacing/2xl` (40px) for centred framing of the pill row.

### Navigation pattern

- Desktop: inline text links (Work / Directors / News / Contact) + eye logo, flanking layout, `px-[40px] py-[16px]`.
- Mobile: eye logo (52px) left + **hamburger icon** right. Hamburger is three 24×3px pills, 4px vertical gap. Drawer UX is not designed — to be specified in Phase 2+ when built.

### Section vertical rhythm

- Homepage pink statement block: `py-[120px]` desktop → `py-[60px]` mobile.
- Film-detail section gap: `gap-[80px]` desktop → `gap-[40px]` mobile.
- Contact office block gap: `gap-[60px]` mobile, larger on desktop.

Captured here so grid/padding choices are consistent across pages; individual components will reference spacing tokens but choose which token based on breakpoint.

---

## Open questions

These need Dan's sign-off before the Webflow variables are created or before Phase 2 kicks off. Ordered by blocking impact:

### Blocking (must resolve before token creation)

1. **Font licensing.** Px Grotesk and Galano Grotesque are commercial fonts — not Google Fonts. Are webfont licences in place? If not, we need fallback families that preserve the brand feel, or a substitution (e.g. a Google-hosted alternative for Galano). This affects the `type/family/*` tokens directly.

### Non-blocking (we can proceed with defaults below; reconcile later)

2. **Grey tokens.** Two new greys needed: `#9b9b9b` and `#323232`. Default: add both as `color/raw/grey-500` and `color/raw/grey-800`. Alternative: collapse the copyright grey to cream @ 50% and drop the divider. Recommend adding both.

3. **Single-use white** (`#ffffff` on the "Film poster" caption on the film-detail frame). Default: keep `color/raw/white` in the palette for future utility but don't add a semantic token for it — treat the caption as a placeholder to reconcile when the real film-detail layout is built.

4. **Director-page filter pill border** uses black @ 30% while every other filter pill across the site uses cream @ 30% (desktop only; mobile uses black @ 30% consistently on the Current/Archive toggle per mobile designs). Default: treat desktop as the Figma inconsistency and harmonise desktop director page to cream @ 30%.

5. **Talent list page background** is `#000000` (not navy like the rest). Default: treat as a page-specific surface, keep `color/surface/inverse` → black, don't change other pages.

6. **Nav font-weight**: Homepage, Music Video, Film & TV, Contact use Px Grotesk Regular. Director page uses Px Grotesk Bold. Default: treat as Figma inconsistency and harmonise to Regular across the site. (Mobile nav is hamburger — doesn't have a font-weight.)

7. **20px title line-heights** vary across pages. Default: apply `type/line-height/tight` (1.0) for name-style lists (talent names, director-page film titles), `type/line-height/relaxed` (2.0) for thumbnail titles, `type/line-height/default` (1.5) for body-lead paragraphs.

8. **16px body line-heights** vary across pages. Default: same three-role mapping above, assigned per use-case at build time.

9. **Spacing 10px and 15px** break the 8-point grid. Default: preserve exact values for Figma fidelity. If Dan prefers cleanliness, normalise to 0.5rem and 1rem respectively (visual impact will be minor).

10. **Mobile hamburger drawer UX** is not designed. Default: propose a full-screen overlay with nav links stacked + close button. Ship in Phase 4 unless Dan provides a design sooner.

11. **Tablet transitional range**: no Figma tablet frames exist. Default: mobile layout holds up to 1024px, desktop layout from 1024px up. Tokens scale fluidly via clamp between 402px and 1728px viewports so type-sizes don't jump at the break.

12. **Display-1 mobile line-height inconsistency**: Director/Music-Video/Film&TV/About use `leading-[0.9]`, Talent uses `leading-none` (1.0). Default: adopt 1.0 (`type/line-height/tight`) across — the 0.1 difference at 56px is 5.6px, likely not noticeable.

13. **Homepage hero 290px top-pad** (desktop): one-off value. Default: don't tokenise; apply inline in Phase 4.

### Resolved by mobile design extraction (2026-04-18)

- ~~Display-1 fluid clamp (floor value)~~ — Figma mobile shows 56px. Clamp updated accordingly.
- ~~News row responsive behaviour~~ — Figma mobile shows 2-column wrap.
- ~~Mobile viewport width assumption~~ — 402px (iPhone 16/17 Pro).

---

## Implementation plan

The token set fans out into two target systems from the shared source (`tokens.json` + this doc):

### Figma (via Crew Token Bridge plugin)

Dan runs the plugin and imports `docs/tokens.json`. Because `options.separateCollections: true` is set, each group (`color`, `font-family`, etc.) becomes its own Figma Variable collection. The three-mode `font-size` collection gets Mobile / Tablet / Desktop modes automatically.

Semantic tokens import as static values (the plugin doesn't support aliasing on import). Dan can manually rewire them to reference raws inside Figma if he wants the alias chain mirrored there — but that's polish, not a blocker.

### Webflow (via Webflow MCP)

**Populated 2026-04-18.** Final state of the `Tokens` collection: **45 variables**.

| Group | Count | Notes |
|---|---|---|
| Colour | 9 | 5 brand colours (flat) + 3 semantic (background, text×2) + 1 rgba border |
| Font family | 2 | headline (Galano), body (Px Grotesk) |
| Font weight | 3 | regular, bold, extra-bold |
| Font size | 9 | 8 with clamp() fluid formulas, 1 static (`name` at 1.25rem) |
| Line height | 3 | tight, normal, loose |
| Spacing | 10 | Named by px value (8, 10, 15, 16, 20, 24, 32, 40, 80, 120) |
| Radius | 1 | pill (100px) |
| Breakpoint | 5 | mobile, tablet, desktop, desktop-large, max |
| Motion duration | 3 | fast (150), normal (300), slow (500) — ms |

Motion easings (3) are **not** in Webflow Variables — see Motion section above for the CSS custom property approach.

---

## Change log

- **2026-04-18 (afternoon)**: Initial draft from desktop-only Figma extraction. Flagged that Figma has no native Variables/Styles, so everything is inferred from observed inline values. 12 open questions recorded. Added `docs/tokens.json` in Crew Token Bridge format as the machine-readable companion.
- **2026-04-18 (late afternoon)**: Dan pointed to the mobile canvas (`162:3727`, 402px wide, 7 mobile frames). Re-extracted and rewrote the font-size table with real Figma mobile values, added new `type/size/thumb-title` token (diverges from `title` at mobile), revised Webflow clamp formulas for all fluid sizes. Added "Responsive patterns" section for grid/nav/padding rules across breakpoints. Updated open questions — 3 items resolved by mobile designs, 2 new items added (hamburger drawer UX, tablet transitional range).
- **2026-04-18 (evening)**: Dan pushed back on over-specified colour palette. Trimmed colours from 7 raw + 13 semantic (20 total) to 5 raw + 4 semantic (9 total). Dropped `grey-500`, `grey-800`, `surface/inverse`, `surface/accent`, `text/on-accent`, `text/muted`, `interactive/default`, `interactive/hover`, `interactive/primary`, `border/divider` — one-off usages inlined. Also dropped `letter-spacing` group (single token at value 0, not worth formalising). Font licensing confirmed (Px Grotesk + Galano Grotesque available in Webflow).
- **2026-04-18 (late evening)**: Dan flagged that the system-jargon naming wasn't accessible in Figma. Renamed ~30 tokens to usage-explicit names: `raw/navy` → `navy` (flat), `surface/primary` → `background/page`, `text/accent` → `text/highlight`, `display-1` → `page-title`, `display-2` → `section-statement`, `thumb-title` → `thumbnail-title`, `title` → `name`, `default` line-height → `normal`, `relaxed` → `loose`, spacing `2xs`/`xs`/... → `8`/`10`/... (px-named), `designed` breakpoint → `max`, `motion duration/default` → `normal`, `motion easing/default` → `standard`. Populated Webflow Tokens collection with 45 variables. Motion easings (3) not added to Webflow (size variable type rejects cubic-bezier); defined as CSS custom properties in site custom code instead.
