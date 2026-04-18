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

Proposed hierarchical naming, compatible with Webflow Designer's slash-folder convention:

```
color/raw/{name}         — raw palette values (hex)
color/surface/{role}     — background surface semantic tokens
color/text/{role}        — text colour semantic tokens
color/interactive/{role} — interactive state semantic tokens
color/border/{role}      — border / divider semantic tokens
type/family/{role}       — font family tokens
type/size/{role}         — font-size tokens (with fluid clamps where applicable)
type/line-height/{role}  — line-height tokens (unitless)
spacing/{size}           — spacing scale (rem)
radius/{size}            — border radius scale (px for pill, rem otherwise)
breakpoint/{name}        — breakpoint reference values (px)
```

Semantic tokens reference raw tokens wherever possible, so that a raw colour change propagates through the system.

---

## Token tree (proposed)

### Colors — raw

| Token | Value | Notes |
|---|---|---|
| `color/raw/navy` | `#00162c` | Seeded. Primary page background on all non-Talent pages. |
| `color/raw/pink` | `#f25d78` | Seeded. Brand accent, active states, highlight colour. |
| `color/raw/cream` | `#f1f2eb` | Seeded. Primary text colour on dark surfaces. |
| `color/raw/black` | `#000000` | Seeded. Talent list page background base; text on pink. |
| `color/raw/white` | `#ffffff` | Seeded. See open question on single-use. |
| `color/raw/grey-500` | `#9b9b9b` | NEW. Used for footer copyright line only. |
| `color/raw/grey-800` | `#323232` | NEW. Used as divider colour under Contact hero. |

### Colors — semantic

| Token | Resolves to | Purpose |
|---|---|---|
| `color/surface/primary` | `color/raw/navy` | Default page background. (Already seeded.) |
| `color/surface/inverse` | `color/raw/black` | Talent-list page base surface. |
| `color/surface/accent` | `color/raw/pink` | Pink statement block on homepage. |
| `color/text/body` | `color/raw/cream` | Default body + headings on dark bg. (Already seeded.) |
| `color/text/accent` | `color/raw/pink` | Active nav, active filter labels, highlighted names. |
| `color/text/on-accent` | `color/raw/black` | Text placed on pink surface. |
| `color/text/muted` | `color/raw/grey-500` | De-emphasised footnote/copyright. |
| `color/brand/accent` | `color/raw/pink` | Logo + accent visuals. (Already seeded, kept for compatibility.) |
| `color/interactive/default` | `color/raw/pink` | Default link colour. (Already seeded.) |
| `color/interactive/hover` | `color/raw/cream` | Hover link colour. (Already seeded.) |
| `color/interactive/primary` | `color/raw/pink` | Active/selected state (filter pill, nav). |
| `color/border/subtle` | `rgba(241,242,235,0.3)` | Default pill/filter/search border on navy. |
| `color/border/divider` | `color/raw/grey-800` | Horizontal divider under Contact hero. |

Semantic tokens should reference the raw tokens via Webflow's variable-references so palette shifts cascade. The border rgba values can't reference raws directly in Webflow Variables (alpha on a reference isn't supported in the current Variables API); we'll store the final rgba string as a custom_value. If this becomes annoying, we can revisit once Webflow supports alpha on variable references.

### Typography — families

| Token | Value | Weights available | Notes |
|---|---|---|---|
| `type/family/display` | `"Galano Grotesque", sans-serif` | ExtraBold (800) | Only used for the huge page H1s (120px). Commercial font — licensing check required. |
| `type/family/body` | `"Px Grotesk", sans-serif` | Regular (400), Bold (700) | Used for everything else. Commercial font — licensing check required. |

Fallback stacks to be defined once we confirm licensing. Suggested interim fallback: `"Px Grotesk", "Helvetica Neue", Arial, sans-serif` and `"Galano Grotesque", "Helvetica Neue", Arial, sans-serif`.

### Typography — sizes

The `font-size` group in `tokens.json` carries three modes (Mobile / Tablet / Desktop). Mobile values are Figma-sourced from the 402px canvas; Desktop values from the 1728px canvas; Tablet values are interpolated (midpoint, rounded to clean numbers) since no tablet canvas exists.

| Token | Mobile | Tablet | Desktop | Usage |
|---|---|---|---|---|
| `type/size/display-1` | 56px | 88px | 120px | Page H1s: "Talent", "Joe Connor", "Music Video", "Film & TV", "We are rogue" |
| `type/size/display-2` | 32px | 48px | 72px | Homepage pink statement block, "News" section heading |
| `type/size/heading-1` | 32px | 34px | 36px | Section heading (e.g. Contact "Offices") |
| `type/size/heading-2` | 24px | 28px | 32px | Subsection heading (e.g. Contact city labels like "London") |
| `type/size/heading-3` | 18px | 21px | 24px | Sub-subsection / lead paragraph (e.g. Contact intro) |
| `type/size/title` | 20px | 20px | 20px | Stable name/label role (talent names, director names on detail page). Unchanged across breakpoints. |
| `type/size/thumb-title` | 16px | 18px | 20px | Film thumbnail titles within grid overlays. New token — diverges from `title` at mobile. |
| `type/size/body` | 14px | 15px | 16px | Default body copy, nav links, filter pill labels, thumbnail director names, footer lines |
| `type/size/caption` | 12px | 13px | 14px | Footer copyright, news-grid titles, thumbnail director-name caption |

#### Webflow clamp formulas

Webflow doesn't have Figma's mode system — fluid behaviour in a single size variable is expressed via `clamp()`. All sizes that vary by breakpoint get a clamp; stable sizes use a single static value. Clamps interpolate between the mobile value at 402px viewport width and the desktop value at 1728px.

| Token | Webflow value |
|---|---|
| `type/size/display-1` | `custom_value: clamp(3.5rem, 2.3rem + 4.8vw, 7.5rem)` — 56px→120px |
| `type/size/display-2` | `custom_value: clamp(2rem, 1.25rem + 3vw, 4.5rem)` — 32px→72px |
| `type/size/heading-1` | `custom_value: clamp(2rem, 1.93rem + 0.3vw, 2.25rem)` — 32px→36px |
| `type/size/heading-2` | `custom_value: clamp(1.5rem, 1.35rem + 0.6vw, 2rem)` — 24px→32px |
| `type/size/heading-3` | `custom_value: clamp(1.125rem, 1rem + 0.45vw, 1.5rem)` — 18px→24px |
| `type/size/title` | `static_value: { value: 1.25, unit: "rem" }` — stable 20px |
| `type/size/thumb-title` | `custom_value: clamp(1rem, 0.92rem + 0.3vw, 1.25rem)` — 16px→20px |
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
| `type/line-height/default` | 1.5 | Default body copy and standard reading contexts |
| `type/line-height/relaxed` | 2.0 | Pill labels, nav links, footer address blocks — where Figma uses 32–42px on 16–20px text for visual breathing room |

This consolidation changes the Figma's inline values to a single per-role scale. A side-by-side visual check against Figma before shipping Phase 2 will confirm nothing regresses.

### Spacing

Figma does not follow a clean 8-point grid. Proposing to preserve exact observed values rather than normalise, so we don't visually drift from the designs:

| Token | Value | Primary usage |
|---|---|---|
| `spacing/2xs` | 0.5rem (8px) | Filter-pill gap, thumbnail title/director vertical gap |
| `spacing/xs` | 0.625rem (10px) | Homepage news section internal gap |
| `spacing/sm` | 0.9375rem (15px) | News thumbnail-to-caption gap (Figma uses 15, not 16) |
| `spacing/md` | 1rem (16px) | Pill padding, footer social gap, nav vertical padding |
| `spacing/md-plus` | 1.25rem (20px) | Film thumbnail internal padding, film-detail section gap |
| `spacing/lg` | 1.5rem (24px) | Homepage news inter-block gap, Talent list per-column row gap |
| `spacing/xl` | 2rem (32px) | Footer outer gap, Contact office address block internal gap |
| `spacing/2xl` | 2.5rem (40px) | Page horizontal padding (all pages), filter section gap |
| `spacing/3xl` | 5rem (80px) | Film detail horizontal padding, Contact horizontal padding, homepage news bottom padding |
| `spacing/4xl` | 7.5rem (120px) | Contact "offices" section horizontal gap, pink hero statement block padding |

Notes:
- `spacing/xs` (10px) and `spacing/sm` (15px) break the 8-point grid but are present in Figma. Open question: preserve exact or normalise to 8/16? Preserving preserves fidelity; normalising is cleaner.
- The homepage hero wrapper has a one-off 290px top-padding that isn't worth tokenising.

### Radii

| Token | Value | Usage |
|---|---|---|
| `radius/pill` | 100px (effectively fully rounded) | All pill-shaped elements: filter pills, search input, back button, copy-link button, genre dropdown |

Only one radius is used across the entire design. Images/thumbnails have square corners. We won't create sm/md/lg radius tokens until a design need emerges.

### Breakpoints

Figma only defines one canvas size (1728px). These breakpoint values are **proposed** based on Webflow defaults plus Finsweet Fluid Responsive conventions, not derived from Figma:

| Token | Value | Notes |
|---|---|---|
| `breakpoint/mobile` | 480px | Standard mobile threshold |
| `breakpoint/tablet` | 768px | Standard tablet threshold |
| `breakpoint/desktop` | 992px | Webflow default desktop |
| `breakpoint/desktop-large` | 1280px | Webflow default large desktop |
| `breakpoint/designed` | 1728px | The only width Figma defines — reference for fluid scaling upper bound |

### Letter-spacing

Figma shows no explicit letter-spacing values. Reserved slot:

| Token | Value |
|---|---|
| `letter-spacing/default` | 0 |

### Motion

Figma provides no motion data. Seeded defaults, all **proposed**:

| Token | Value | Notes |
|---|---|---|
| `motion/duration/fast` | 150ms | Hover/focus micro-interactions |
| `motion/duration/default` | 300ms | Talent-page video crossfade, default transition |
| `motion/duration/slow` | 500ms | Dramatic transitions |
| `motion/easing/default` | `cubic-bezier(0.4, 0, 0.2, 1)` | Standard ease |
| `motion/easing/in` | `cubic-bezier(0.4, 0, 1, 1)` | Elements leaving view |
| `motion/easing/out` | `cubic-bezier(0, 0, 0.2, 1)` | Elements entering view |

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

Once the Designer MCP is live, I populate the `Tokens` variable collection. The current state is 5 raw + 5 semantic colour variables already in place. Create/update in this order:

1. **Raw colours**: add `grey-500`, `grey-800`. Keep existing 5 raws as-is.
2. **Semantic colours**: `surface/inverse`, `surface/accent`, `text/accent`, `text/on-accent`, `text/muted`, `interactive/primary`, `border/subtle` (custom_value `rgba(241,242,235,0.3)`), `border/divider`. Use `existing_variable_id` to chain to raws where applicable — Webflow supports this natively, so we get a real alias chain here.
3. **Font families**: `type/family/display`, `type/family/body`.
4. **Font weights**: `type/weight/regular`, `type/weight/bold`, `type/weight/extra-bold` as number variables.
5. **Type sizes**: 8 sizes. For `display-1` and `display-2`, use `custom_value` with the clamp formulas above. For the rest, use `static_value: { value: ..., unit: "rem" }`.
6. **Line-heights**: `tight`, `default`, `relaxed` as number variables (unitless).
7. **Letter-spacing**: `default` as a number variable (0).
8. **Spacing scale**: 10 size variables in rem.
9. **Radius**: single `radius/pill` as a size variable in px.
10. **Breakpoints**: 5 size variables in px.
11. **Motion durations**: number variables (ms, no unit).
12. **Motion easings**: created as custom_value strings on size variables — Webflow doesn't have a native string type, so we'll use `custom_value` on a size variable which accepts arbitrary CSS.

Each variable creation is validated against `tokens.json`. If Dan answers the open questions, both this doc and `tokens.json` get updated first, then variables get created/updated to match.

---

## Change log

- **2026-04-18 (afternoon)**: Initial draft from desktop-only Figma extraction. Flagged that Figma has no native Variables/Styles, so everything is inferred from observed inline values. 12 open questions recorded. Added `docs/tokens.json` in Crew Token Bridge format as the machine-readable companion.
- **2026-04-18 (late afternoon)**: Dan pointed to the mobile canvas (`162:3727`, 402px wide, 7 mobile frames). Re-extracted and rewrote the font-size table with real Figma mobile values, added new `type/size/thumb-title` token (diverges from `title` at mobile), revised Webflow clamp formulas for all fluid sizes. Added "Responsive patterns" section for grid/nav/padding rules across breakpoints. Updated open questions — 3 items resolved by mobile designs, 2 new items added (hamburger drawer UX, tablet transitional range).
