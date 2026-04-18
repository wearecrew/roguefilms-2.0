# Rogue v2 design system

**Status**: Draft v2 — Phase 1 reset (2026-04-18). Awaiting token-bridge test-import confirmation before Webflow population.

---

## Source of truth

Two files represent the design system:

1. **This document (`docs/design-system.md`)** — human-readable spec with rationale, decisions, and open questions. Authoritative for intent.
2. **`docs/tokens.json`** — machine-readable token set in [Crew Token Bridge](https://www.figma.com/community/plugin/) format. Imported into Figma via the plugin. Authoritative for values.

Before the full `tokens.json` is written, we validate the plugin parser with `docs/tokens-test.json` (3 tokens only) — an earlier run revealed the plugin can collapse a badly-shaped JSON into a single "groups" collection with numeric placeholders.

### Reference IDs

- **Figma file**: [Rogue Website 2026 updates](https://www.figma.com/design/BuVndAwQ1zQKACDJFswneK/Rogue-Website-2026-updates) (file key `BuVndAwQ1zQKACDJFswneK`)
- **Webflow Variables collection**: `Tokens` (collection ID `collection-d1ebecc4-8a57-3cd3-4515-853ab0874009`) on site `69dcac21fd295013e4344d52`. Currently empty following the 2026-04-18 reset.
- **Extraction date**: 2026-04-18
- **Desktop frames**: Canvas `0:1`, 1728px. Homepage (`0:2`), Talent list (`2:623`), Director (`2:1160`), Music Video (`2:1526`), Film & TV (`39:1718`), Film/poster detail (`2:1674`), Contact/About (`2:1262`), Navigation (`2:422`), Footer (`2:423`).
- **Mobile frames**: Canvas `162:3727`, 402px. Homepage (`162:3728`), Talent (`162:3948`), Director (`162:3800`), Music Video (`162:3838`), Film/poster detail (`162:3879`), Contact (`162:3912`), plus `Footer - Mobile` (`148:2938`).

---

## Approach and rationale

The token system is a **two-tier** model: **primitives** (raw values) and **semantics** (named by role or intent). No component-level tokens yet — with a palette this small and a Phase 1 scope limited to foundation, component tokens would be bureaucratic overhead that doesn't earn its keep. We can add them in later phases if a real use case emerges.

**References drawn on**:
- **Material 3** — three-tier model (primitives → alias → component); display/headline/title/body/label × lg/md/sm scale.
- **Shopify Polaris** — two-tier (primitive + semantic) naming; `heading-4xl` through `heading-sm`, `body-lg/md/sm`, `caption`.
- **Atlassian Design Tokens** — dot-separated / slash-separated paths grouping by role (`color.text.accent`, `color.background.subtle`, `color.border.emphasis`).
- **Mozilla Protocol** — numeric spacing scale.
- **Figma Variables** — modes as the native mechanism for per-context value sets (light/dark, mobile/tablet/desktop).

**What we're taking from each:**
- The three-tier idea, collapsed to two tiers for Rogue's scale.
- The `display` / `heading` / `body` typography scale naming.
- Slash-separated token paths (compatible with Webflow Variables and Figma Variables display).
- Figma-native modes for responsive values — rather than baking fluid `clamp()` formulas into variables that designers can't see through.

**What we're not taking:**
- Material's abbreviation-heavy naming (`md.sys.color.primary`).
- T-shirt sizing for spacing (Rogue's spacing values include non-grid 10 and 15, and naming them by t-shirt scale loses information).
- Component-level tokens — premature for Phase 1.

### Why three discrete modes instead of `clamp()`

A `clamp(3.5rem, 2.3rem + 4.8vw, 7.5rem)` is concise but opaque — a designer looking at the variable sees a formula, not a tablet value. You can't easily deviate per breakpoint if a specific case warrants it, and you can't survey the type scale at a glance across viewports.

Three discrete modes (Mobile / Tablet / Desktop) give every designer and developer exactly what they need: a per-breakpoint value they can see, override, or reference. Figma Variables and Webflow Variables both support modes natively; using them is the right abstraction.

---

## Naming conventions

### Structure

Slash-separated paths, hierarchical by role. Group prefix is determined by the token group (e.g. `color`, `space`, `radius`) and is implicit in the Figma collection name once the Token Bridge plugin imports — so in the JSON `path` field, we do NOT repeat the group name.

```
primitive/{name}         — raw values, tier 1
{role}/{variant}         — semantic aliases, tier 2
```

Examples in the `color` collection:

```
primitive/navy            → #00162c                  (tier 1)
surface/page              → primitive/navy           (tier 2)
text/primary              → primitive/cream          (tier 2)
text/accent               → primitive/pink           (tier 2)
```

Within the `type-size` collection:

```
display-xl                → 56/88/120 (per mode)
heading-lg                → 24/28/32
body-md                   → 14/15/16
```

### Primitive vs semantic rule

- **Primitives** live under a `primitive/` folder within their group. Never used directly in designs or components.
- **Semantics** live at the root of their group (no `primitive/` prefix). These are what designers and developers reference.

This keeps the two tiers visually separated in Figma's Variables panel and Webflow's Variables pane.

### Scale naming for typography

Nine font-size tokens mapping to Rogue's observed typography roles:

- **Display**: page hero / large statement type
  - `display-xl` — page H1s ("Talent", "Joe Connor", "Music Video", "Film & TV", "We are rogue")
  - `display-lg` — homepage pink statement, News section heading
- **Heading**: section-level hierarchy
  - `heading-xl` — major section headings (e.g. Contact "Offices")
  - `heading-lg` — subheadings (e.g. Contact city labels like "London")
  - `heading-md` — lead paragraphs (e.g. Contact intro copy)
- **Body**: reading-size text
  - `body-xl` — talent / director names (stable 20px across breakpoints)
  - `body-lg` — film thumbnail titles
  - `body-md` — default body copy, nav links, filter pills, footer lines
  - `body-sm` — small captions, footer copyright

### Spacing naming

Pixel-named: `space/8`, `space/10`, `space/15`, `space/16`, `space/20`, `space/24`, `space/32`, `space/40`, `space/80`, `space/120`.

Reasoning: Rogue's Figma uses a short, specific spacing set that doesn't map cleanly to a t-shirt scale. Naming by px value is honest, non-boxing (every value can be used for gap, padding, margin — not just one purpose), and maps 1:1 to what designers see in the Figma inspector.

The 10px and 15px values break the 8-point grid but are preserved from Figma. Flagged in token descriptions.

---

## Breakpoint strategy

Two explicit Figma canvases exist (Mobile 402px, Desktop 1728px). Tablet has no Figma representation, so tablet values are **linearly interpolated** from Mobile and Desktop and rounded to whole pixels.

Interpolation formula (where Fr = (Tablet_vw - Mobile_vw) / (Desktop_vw - Mobile_vw)):

```
Tablet_value = Mobile_value + (Desktop_value - Mobile_value) × Fr
```

Assuming Mobile viewport 402px, Tablet viewport 768px, Desktop viewport 1728px:

```
Fr = (768 - 402) / (1728 - 402) = 366 / 1326 ≈ 0.276
```

For display-xl (56 → 120):
```
56 + (120 - 56) × 0.276 = 56 + 17.66 ≈ 74 (rounded)
```

For cleaner readability, most tablet values are rounded to the nearest clean number (e.g. 74 → 72 for display-xl, since 72 is a value already used elsewhere in the scale).

Tokens flagged with tablet values below are labelled "interpolated — confirm in build".

### Breakpoint values

| Token | Value | Notes |
|---|---|---|
| `breakpoint/mobile` | 480px | Standard mobile threshold |
| `breakpoint/tablet` | 768px | Standard tablet threshold |
| `breakpoint/desktop` | 992px | Webflow default desktop start |
| `breakpoint/desktop-lg` | 1280px | Webflow default large-desktop start |
| `breakpoint/max` | 1728px | Figma's designed desktop canvas — fluid scaling upper bound |

---

## Token tree

### Color (single mode)

**Primitives (5)**

| Token | Value | Usage |
|---|---|---|
| `color/primitive/navy` | `#00162c` | Default page background on all non-Talent pages |
| `color/primitive/pink` | `#f25d78` | Brand accent, active states, highlights, pink statement block |
| `color/primitive/cream` | `#f1f2eb` | Default text colour on dark surfaces |
| `color/primitive/black` | `#000000` | Talent-list page base, text on pink surface |
| `color/primitive/white` | `#ffffff` | Single Figma use (film-poster caption) — retained for future use |

**Semantics (8)**

| Token | Aliases | Purpose |
|---|---|---|
| `color/surface/page` | `primitive/navy` | Default page background |
| `color/surface/overlay` | `primitive/pink` | Pink statement block on homepage |
| `color/text/primary` | `primitive/cream` | Default body and heading text on dark bg |
| `color/text/accent` | `primitive/pink` | Highlighted / active text, links, active nav items |
| `color/text/on-overlay` | `primitive/black` | Text placed on the pink overlay surface |
| `color/border/subtle` | `rgba(241,242,235,0.3)` | Pill / filter / search borders on navy surfaces |
| `color/interactive/default` | `primitive/pink` | Default link / interactive element colour |
| `color/interactive/hover` | `primitive/cream` | Link / interactive hover state |

`color/border/subtle` is stored as an `rgba` custom value — alpha on a referenced primitive isn't supported in Webflow Variables.

### Type family (single mode)

| Token | Value | Notes |
|---|---|---|
| `type-family/display` | `Galano Grotesque` | Used only for `display-xl` page H1s. Licensed and loaded in Webflow. |
| `type-family/body` | `Px Grotesk` | All other text. Regular (400) and Bold (700) weights used. Licensed and loaded in Webflow. |

### Type size (three modes: Mobile / Tablet / Desktop)

All values in px (Webflow will store in rem, converting ÷16 at import time; Figma stores the px number).

| Token | Mobile | Tablet | Desktop | Role |
|---|---|---|---|---|
| `type-size/display-xl` | 56 | 72 | 120 | Page H1s (Talent, Joe Connor, Music Video, Film & TV, We are rogue) |
| `type-size/display-lg` | 32 | 48 | 72 | Homepage pink statement, News section heading |
| `type-size/heading-xl` | 32 | 34 | 36 | Major section heading (Contact "Offices") |
| `type-size/heading-lg` | 24 | 28 | 32 | Subsection heading (Contact "London") |
| `type-size/heading-md` | 18 | 21 | 24 | Lead paragraph (Contact intro) |
| `type-size/body-xl` | 20 | 20 | 20 | Talent / director names — stable across breakpoints |
| `type-size/body-lg` | 16 | 18 | 20 | Film thumbnail titles |
| `type-size/body-md` | 14 | 15 | 16 | Default body copy, nav, filter pills, footer lines |
| `type-size/body-sm` | 12 | 13 | 14 | Footer copyright, news-grid titles, thumbnail director-name caption |

Mobile and Desktop values are **Figma-sourced**. Tablet values are **interpolated — confirm in build**.

### Type weight (single mode)

| Token | Value | Notes |
|---|---|---|
| `type-weight/regular` | 400 | Default Px Grotesk weight |
| `type-weight/bold` | 700 | Used on thumbnail titles, filter labels |
| `type-weight/extra-bold` | 800 | Galano Grotesque only (display-xl) |

### Type line-height (single mode)

| Token | Value | Use for |
|---|---|---|
| `type-line-height/tight` | 1.0 | Display sizes, page H1s, name-style lists |
| `type-line-height/normal` | 1.5 | Default body reading |
| `type-line-height/loose` | 2.0 | Pill labels, nav links, footer address blocks |

Unitless multipliers.

### Spacing (three modes: Mobile / Tablet / Desktop)

All values identical across modes — the spacing scale is invariant; it's components that choose different tokens at different breakpoints. Three modes are used for structural consistency with type-size, per team preference.

| Token | All modes | Typical usage |
|---|---|---|
| `space/8` | 8px | Tight gaps (filter-pill, title/director vertical) |
| `space/10` | 10px | News section internal gap — **non-8pt-grid, preserved from Figma** |
| `space/15` | 15px | News thumbnail-to-caption — **non-8pt-grid, preserved from Figma** |
| `space/16` | 16px | Pill padding, footer social gap, nav vertical padding |
| `space/20` | 20px | Film thumbnail internal padding, mobile page h-padding |
| `space/24` | 24px | News inter-block gap, Talent list per-column row gap |
| `space/32` | 32px | Footer outer gap, section inner gap |
| `space/40` | 40px | Default desktop page h-padding, filter section gap |
| `space/80` | 80px | Film-detail + Contact h-padding, homepage news bottom padding |
| `space/120` | 120px | Hero statement block padding |

### Radius (single mode)

| Token | Value | Usage |
|---|---|---|
| `radius/pill` | 100px | All pill-shaped elements: filter pills, search input, back button, copy-link, genre dropdown. Figma-sourced value. |

No other radii appear in Figma. Tile images have square corners.

### Motion (single mode)

Only durations are tokenised in Webflow. Easings live as CSS custom properties in site custom code (Webflow's Size variable type rejects `cubic-bezier()`).

| Token | Value | Usage |
|---|---|---|
| `motion/duration/fast` | 150 | Hover / focus micro-interactions |
| `motion/duration/normal` | 300 | Default transition, talent-page video crossfade |
| `motion/duration/slow` | 500 | Dramatic transitions |

Values in ms (unitless number variables; unit is implicit in the `transition-duration` CSS context).

### Motion easings — CSS custom properties (not Webflow Variables)

Defined in Site Settings → Custom Code → Head when Phase 2 lands:

```css
:root {
  --motion-easing-standard: cubic-bezier(0.4, 0, 0.2, 1);
  --motion-easing-in: cubic-bezier(0.4, 0, 1, 1);
  --motion-easing-out: cubic-bezier(0, 0, 0.2, 1);
}
```

Used in CSS as `transition-timing-function: var(--motion-easing-standard);`.

They also appear in `tokens.json` as STRING variables so Figma sees them for completeness — just not imported into Webflow.

---

## Semantic token mapping

Quick reference for the `existing_variable_id` chain when creating Webflow Variables:

```
color/surface/page          → color/primitive/navy
color/surface/overlay       → color/primitive/pink
color/text/primary          → color/primitive/cream
color/text/accent           → color/primitive/pink
color/text/on-overlay       → color/primitive/black
color/border/subtle         → rgba(241, 242, 235, 0.3)   (custom_value, no reference)
color/interactive/default   → color/primitive/pink
color/interactive/hover     → color/primitive/cream
```

---

## Responsive patterns (non-token, design-system-adjacent)

Captured for when we start building components in Phase 2+. Not token-level, but rules we want applied consistently.

### Grid collapse (Figma-sourced from mobile canvas)

| Context | Desktop | Mobile |
|---|---|---|
| Homepage news row | 5 columns | 2 columns (2+2+1 wrap) |
| Homepage latest-work | 1 full + 2 half repeating | 1 column stack, full-width tiles |
| Talent page director names | 3 columns | 1 column, letter groups stacked |
| Director page film grid | 3 columns | 1 column stack |
| Music Video / Film & TV grid | 2/3-col alternating | 1 column stack |
| Contact page | 2-column (about / offices) | 1 column stack (people row stays 2-col) |

### Navigation

- Desktop: inline text links + eye logo, flanking layout.
- Mobile: eye logo (52px) left + hamburger right (three 24×3px pills, 4px gap). Hamburger drawer UX not designed yet — Phase 2 decision.

### Transitional range (no Figma tablet frames)

Mobile layout holds up to 1024px; desktop layout from 1024px up. Type-sizes and spacing transition via the three-mode token system (Figma/Webflow mode-switching at breakpoints).

---

## Implementation plan

### Step A — Figma import

1. Dan imports `docs/tokens.json` via Crew Token Bridge plugin. With `separateCollections: true`, each group becomes its own Figma collection.
2. Groups without modes create single-mode Figma collections. Groups with `modes: [...]` create multi-mode collections.

Blockers: need to verify the parser handles the JSON shape correctly — see the `tokens-test.json` validation step.

### Step B — Webflow population (via MCP)

1. Add three modes to the Webflow `Tokens` collection: Mobile, Tablet, Desktop.
2. Create the primitive colour variables, font families, font weights, line-heights, radius, breakpoints, and motion durations. These variables will have the same value across all three modes.
3. Create the semantic colour variables with `existing_variable_id` referencing primitives.
4. Create `color/border/subtle` with `custom_value: rgba(241, 242, 235, 0.3)`.
5. Create the type-size variables with per-mode values (9 tokens × 3 modes).
6. Create the spacing variables (10 tokens × 3 modes, values identical across modes per team preference).
7. Motion easings are NOT added to Webflow Variables — they go into site custom code as CSS custom properties in Phase 2.

**Expected final count: 45 Webflow variables.**
- 13 colour (5 primitive + 8 semantic)
- 2 type-family
- 9 type-size
- 3 type-weight
- 3 type-line-height
- 10 spacing
- 1 radius
- 5 breakpoint
- 3 motion-duration

---

## Open questions

Flagged for Dan to resolve before Step B (Webflow population). Defaults shown where possible.

### Resolved (2026-04-18)

- ~~**Q1: Webflow mode propagation**~~ — Confirmed: Webflow propagates values across modes when not explicitly defined. Single default value on non-responsive tokens is sufficient.
- ~~**Q2: Is `color/text/inverse` needed?**~~ — No. Rogue is dark-themed with no dark-text-on-white use case; black-on-pink covered by `color/text/on-overlay`.
- ~~**Q4: Radius 9999px vs 100px?**~~ — 100px. Matches Figma source value.
- ~~**Q7: Tablet display-xl value?**~~ — 72px (current value in the spec).

### Still open

3. **Additional semantic surfaces (Talent page black).** Talent uses `primitive/black` distinct from the usual navy. Options: (a) inline `primitive/black`, (b) add `color/surface/inverse` → black. **Default: (a) inline.** Talent is one page; tokenising for a single use is premature.

5. **Talent page hero treatment at mobile.** Full-bleed hero block. No `surface/hero` token. **Default: inline; don't tokenise.**

6. **Line-height for `display-xl` at mobile.** Figma inconsistency — some pages use `leading-[0.9]`, Talent uses `leading-none` (1). **Default: use `type-line-height/tight` (1.0) across.** The 0.1 difference at 56px ≈ 5.6px, unlikely to be noticed.

8. **Mobile hamburger drawer UX.** Not designed. **Default: defer to Phase 2.**

---

## Change log

- **2026-04-18 (Phase 1 reset)**: Discarded first implementation. Rewrote spec with:
  - Three explicit modes on `type-size` and `spacing` (Mobile/Tablet/Desktop), no `clamp()` anywhere.
  - Consistent scale naming (`display-xl/lg`, `heading-xl/lg/md`, `body-xl/lg/md/sm`).
  - Two-tier primitive/semantic model (no component-level tokens).
  - Test import file (`docs/tokens-test.json`) to validate Crew Token Bridge parser before the full run.
  - Radius: single `radius/pill` at 9999px (was 100px).
