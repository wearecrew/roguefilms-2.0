# Le Cure — Project README
**Crew Studio for Le Cure** · Started March 2026

---

## Firing Up the Project

```bash
cd ~/Projects/lecure
claude
```

Always `cd` into the project folder first so Claude Code has full context of all files.

---

## Folder Structure

```
~/Projects/lecure/
├── prototypes/          HTML prototype files (12 pages complete)
├── design-system/       Design tokens and component library
│   └── tokens.json
├── assets/              Imagery, fonts, logos
│   └── images/
├── content/             Scraped / migrated content (JSON)
│   ├── climbs.json
│   ├── stages.json
│   └── curistas.json
└── docs/                IA, specs, planning documents
    ├── lecure-ia-v1.html
    └── lecure-engineering-spec-v1.1.docx   Engineering specification (v1.1, March 2026)
```

---

## Multiple Claude Code Sessions

Open multiple terminal tabs/windows. Each is an independent session.

- **iTerm2 vertical split:** `Cmd + D`
- **iTerm2 horizontal split:** `Cmd + Shift + D`
- **New tab:** `Cmd + T`

Each session should `cd ~/Projects/lecure` before launching `claude`.

---

## Design Evolution — Homepage v6

Active working file: `prototypes/lecure-homepage-v6.html`

### Typography

| Role | Font | Source | Notes |
|---|---|---|---|
| Display | Domaine Display (Klim) | Local woff2 | Black (900) + Regular Italic (400) weight contrast is the primary typographic move |
| Body | Söhne (Klim) | Local woff2 | Buch (400) body copy, Kraftig (500) nav links, Halbfett (600) UI/buttons |
| Mono | Söhne Mono (Klim) | Local woff2 | Buch (400) labels/metadata, Dreiviertelfett (800) column headings |

Font files: `assets/fonts/` — all `test-domaine-display-*.woff2`, `test-soehne-*.woff2`, `test-soehne-mono-*.woff2`

Inter and DM Mono kept as CSS fallbacks only — no Google Fonts import.

### CSS tokens (v6)

```css
--font-display: 'Domaine Display', serif;
--font-body:    'Söhne', 'Inter', sans-serif;
--font-mono:    'Söhne Mono', 'DM Mono', monospace;
--color-charcoal: #1C1917;   /* warm deep charcoal — France section */
--color-grey-bg:  #F9F6F2;   /* warm off-white — Curistas, Story sections */
```

Full token set unchanged from `design-system/tokens.json`.

### Layout direction

- **Asymmetric scrapbook** — rotated photo elements (`rotate(-2deg)`, `rotate(2.5deg)`), overlapping z-index layering, no symmetric grids
- **Mountain altitude bands** — three stacked full-width sections with diagonal `clip-path` separators: Pinnacle (black) → Climbs (charcoal) → Foothills (off-white)
- Hero: dark background (`#0A0A0A`), photo cluster offset right

### Headline system

Primary hero headline:
```
Ordinary people.     ← Domaine Display Black (900), white
Extraordinary        ← Domaine Display Regular Italic (400), pink-light (#F5699A)
mountains.           ← Domaine Display Black (900), white
```

Alternative (commented in HTML for easy switching):
```
Your Mountain.       ← Black
Their Cure.          ← Regular Italic, pink
```

Weight contrast rule applied to all section headings: primary word/phrase at Extrabold (800), `<em>` wraps at Regular Italic (400).

### Type scale

| Element | Size |
|---|---|
| Hero headline | `clamp(72px, 9vw, 130px)` · line-height 0.92 |
| H2 section headings | `clamp(48px, 5vw, 72px)` |
| France section heading | `clamp(52px, 5.5vw, 80px)` |
| Tiers section heading | `clamp(48px, 5.5vw, 78px)` |
| Impact numbers | `clamp(48px, 5vw, 80px)` |
| Body copy | 17px / line-height 1.72–1.82 (bumped from 16px for Söhne rendering) |

### Hierarchy language

"The Ride" renamed **"The Pinnacle"** in section framing and eyebrows. Three tiers:
- `01 — Le Cure De France` / badge "The Pinnacle"
- `02 — The Ascent` / The Climbs
- `03 — The Base Camp` / The Foothills

### Photography

- Location: `assets/images/` (local) — Unsplash cycling shots, plus Le Cure real event photos
- Pink vest cycling shots prioritised for hero and tier cards
- Treatment applied across all photos: `filter: contrast(1.10) saturate(1.15)` via `--photo-filter` CSS var
- Scrapbook treatment: `rotate(-2deg)` primary, `rotate(2.5deg)` secondary, `border: 5px solid white` on secondary overlap

### Next immediate task

Replace placeholder Unsplash URLs in `lecure-homepage-v6.html` with local images from `assets/images/`. Read the images directory, match appropriate photos to each section — prioritise pink vest cycling shots for hero and tier cards.

---

## Prototype Sprint

### v1 Originals (`~/Projects/lecure/prototypes/`) — Archived / Superseded

| File | Page | Status |
|------|------|--------|
| `lecure-homepage-v7.html` | Homepage (v7, current design reference) | Archived |
| `lecure-de-france-v1.html` | Le Cure De France (The Ride) | Archived |
| `lecure-curista-profile-v1.html` | Public Curista Profile | Archived |
| `lecure-curistas-v1.html` | Curistas Community Directory | Archived |
| `lecure-stage-detail-v1.html` | Stage Detail | Archived |
| `lecure-col-detail-v1.html` | Col Detail (Climbs Encyclopaedia) | Archived |
| `lecure-climbs-listing-v1.html` | The Climbs Event Listing | Archived |
| `lecure-climbs-detail-v1.html` | The Climbs Event Detail | Archived |
| `lecure-foothills-listing-v1.html` | The Foothills Activity Listing | Archived |
| `lecure-foothills-detail-v1.html` | The Foothills Activity Detail | Archived |
| `lecure-account-edit-v1.html` | Curista Account / Edit Profile | Archived |
| `lecure-register-v1.html` | Register / Sign In | Archived |
| `lecure-about-v1.html` | About Le Cure | Archived |
| `lecure-charity-v1.html` | The Charity | Archived |
| `lecure-marianne-v1.html` | Marianne's Message | Archived |
| `lecure-research-v1.html` | Research | Archived |
| `lecure-design-system.html` | Design System Reference | Not carried forward |

### v8 Active Set (`~/Projects/lecure/prototypes/v8/`) — Current Working Prototype

| # | File | Page | Status |
|---|------|------|--------|
| 1 | `lecure-homepage-v8.html` | Homepage | ✓ Done |
| 2 | `lecure-de-france-v2.html` | Le Cure De France (The Ride) | ✓ Done |
| 3 | `lecure-curista-profile-v2.html` | Public Curista Profile | ✓ Done |
| 4 | `lecure-curistas-v2.html` | Curistas Community Directory | ✓ Done |
| 5 | `lecure-stage-detail-v2.html` | Stage Detail | ✓ Done |
| 6 | `lecure-col-detail-v2.html` | Col Detail (Climbs Encyclopaedia) | ✓ Done |
| 7 | `lecure-climbs-listing-v2.html` | The Climbs Event Listing | ✓ Done |
| 8 | `lecure-climbs-detail-v2.html` | The Climbs Event Detail | ✓ Done |
| 9 | `lecure-foothills-listing-v2.html` | The Foothills Activity Listing | ✓ Done |
| 10 | `lecure-foothills-detail-v2.html` | The Foothills Activity Detail | ✓ Done |
| 11 | `lecure-account-edit-v2.html` | Curista Account / Edit Profile | ✓ Done |
| 12 | `lecure-register-v2.html` | Register / Sign In | ✓ Done |
| 13 | `lecure-about-v2.html` | About Le Cure | ✓ Done |
| 14 | `lecure-charity-v2.html` | The Charity | ✓ Done |
| 15 | `lecure-marianne-v2.html` | Marianne's Message | ✓ Done |
| 16 | `lecure-research-v2.html` | Research | ✓ Done |
| 17 | `lecure-cols-listing-v2.html` | Cols Encyclopaedia listing | ✓ Done |

---

## CSS Architecture (v8 prototype)

All v8 prototype pages load CSS in this order:

```
tokens.css       — all CSS custom properties, single source of truth
base.css         — reset, typography base, utilities, entrance animations (.fade-up / .fade-in)
nav.css          — navigation component, scroll behaviour, themes (pink / default / scrolled)
components.css   — shared components: buttons, cards, tier thread, tier bands, curista cards, footer
pages/[page].css — page-specific styles, one file per page
```

Cascade principle: page-level override blocks are appended at the end of each `pages/*.css` file to apply tier colour families without `!important`. The pattern: structural rules first, colour overrides last.

Token naming: `--space-xs` (8px) → `--space-sm` (16px) → `--space-md` (32px) → `--space-lg` (64px) → `--space-xl` (120px). No 2xl/3xl — these were removed in a refactor pass (March 2026).

**Note:** all spacing and type sizes are in `px` throughout the prototype. Conversion to `rem` is pending for the production build.

---

## Shared Nav — nav.js

All 17 v8 pages use a shared nav injected via `nav.js`. Pattern in every HTML file:

```html
<div id="nav-root"></div>
<!-- rest of page -->
<script src="nav.js"></script>
```

Nav links: Logo → homepage, The Ride → de-france, The Climbs → climbs-listing,
The Foothills → foothills-listing, Curistas → curistas, Donate → sportsgiving.co.uk

**Note:** `nav.js` generates a flat nav — no dropdowns. The Cols Encyclopaedia (`lecure-cols-listing-v2.html`) is accessible via "View all cols →" link on the De France page and via individual col cards. It is not surfaced in the top-level nav. If a dropdown nav is added later, "The Cols" should appear under "The Ride".

Nav has two states:
- **Logged out** (default): Sign In text link + Donate button
- **Logged in** (account page): User avatar/initials "DG" with dropdown

---

## Outstanding Tasks (do these next in Claude Code)

### Task 1 — Full cross-linking pass + nav update
Run this prompt from `~/Projects/lecure/prototypes/v8/`:

```
Update nav.js and all 16 HTML prototype files for full cross-linking.

nav.js changes:
- Logo → lecure-homepage-v8.html
- The Ride → lecure-de-france-v2.html
- The Climbs → lecure-climbs-listing-v2.html
- The Foothills → lecure-foothills-listing-v2.html
- Curistas → lecure-curistas-v2.html
- Add "Sign In" text link → lecure-register-v2.html (before Donate)
- Donate keeps sportsgiving.co.uk href
- Logged-in state on lecure-account-edit-v2.html: replace Sign In + Donate
  with initials avatar "DG" dropdown (View Profile, Edit Profile, Log Out)

Cross-links across all files:
- "Edit Profile" / "My Account" / "Edit Your Profile" → lecure-account-edit-v2.html
- "Create account" / "Join" / "Sign up" → lecure-register-v2.html
- "Sign in" / "Log in" → lecure-register-v2.html
- "View your public profile" (from account) → lecure-curista-profile-v2.html
- "View Profile" on Curista cards → lecure-curista-profile-v2.html
- "View Event" (Climbs listing) → lecure-climbs-detail-v2.html
- "Do This for Le Cure" → lecure-foothills-detail-v2.html
- "Browse all activities" → lecure-foothills-listing-v2.html
- Stage detail links → lecure-stage-detail-v2.html
- Col detail links → lecure-col-detail-v2.html
- "All Curistas" / "Meet All Curistas" → lecure-curistas-v2.html

Add contextual auth CTAs:
- lecure-curistas-v2.html: add "New to Le Cure? Create a free Curista account →"
  to the join CTA strip, linking to lecure-register-v2.html
- lecure-de-france-v2.html: below Apply via Race Nation button, add
  "Already registered? Create your Le Cure profile →" → lecure-register-v2.html
- lecure-climbs-detail-v2.html: in How Registration Works, add
  "Create a free Le Cure account to activate your public Curista profile." → register
- lecure-foothills-detail-v2.html: in starter pack section, add
  "Create a free Le Cure account to appear on the Curistas page →" → register

Read each file before editing. Only change hrefs and the small text additions above.
Confirm what changed in each file when done.
```

### Task 2 — Prototype state toggles
After Task 1, run this prompt:

```
Add prototype state toggle bars to two files in ~/Projects/lecure/prototypes/v8/

In lecure-account-edit-v2.html:
Add a thin 32px strip at the very top of the page, above the nav.
Dark grey (#2A2A2A) background, white monospaced 11px text.
Label: "PROTOTYPE STATE:" then two clickable pills:
- "Race Nation Not Connected" (default active, pink background)
- "Race Nation Connected" (inactive, outlined)
Clicking each pill shows/hides the relevant sections via JavaScript.
Not connected: show the prominent connect card.
Connected: show the green success/connected card.
Style it clearly as a prototype tool, not part of the UI design.

In lecure-register-v2.html:
Same toggle bar with pills:
- "Registration Form" (default active)
- "Post-Registration Success"
Clicking toggles between the form view and the full-page success state.

Do not change any other design or content.
```

---

## Key Design Tokens

```css
/* Core */
--color-pink:       #E8357A
--color-pink-light: #F5699A
--color-pink-pale:  #FDE8F0
--color-black:      #0A0A0A
--color-white:      #FFFFFF
--color-charcoal:   #1C1917   /* warm deep charcoal — France section */
--color-grey-dark:  #1A1A1A
--color-grey-mid:   #555555
--color-grey-light: #E0E0E0
--color-grey-bg:    #F9F6F2   /* warm off-white */

/* Tier — The Ride (Pinnacle) */
--color-pinnacle-bg:     #F2F0FF
--color-pinnacle-accent: #5B4FCF
--color-pinnacle-dark:   #2D2666

/* Tier — The Climbs */
--color-climbs-bg:     #FFF0F5
--color-climbs-accent: #E8357A
--color-climbs-dark:   #7A0A35

/* Tier — The Foothills (forest green — updated from mauve March 2026) */
--color-foothills-bg:     #EEF7F1   /* pale sage */
--color-foothills-accent: #2D8A52   /* forest green */
--color-foothills-dark:   #1A5C35   /* deep forest */

/* Typography */
--font-display: 'Domaine Display', serif
--font-body:    'Söhne', 'Inter', sans-serif
--font-mono:    'Söhne Mono', 'DM Mono', monospace
```

All fonts loaded from local woff2 files in `assets/fonts/`. No Google Fonts dependency.

Source of truth: `design-system/tokens.json`

### Token change history

| Date | Change |
|---|---|
| March 2026 | Foothills tier colour changed from mauve (#9B2EA8 / #F8F0F8 / #5A1A5A) to forest green (#2D8A52 / #EEF7F1 / #1A5C35). Reflects actual activity content (running, walking, outdoor challenges). Updated in: prototype tokens.css, production tokens.css, design-system/tokens.json, lecure-design-system-v2.html. |
| March 2026 | Foothills tier colour changed from amber/brown to mauve. (Superseded — see above.) |

---

## Key Decisions Log

| Decision | Detail |
|---|---|
| JustGiving | Out of scope. Race Nation / SportsGiving only. |
| Curista profiles | Public by default, opt-in on account creation (GDPR — explicit consent) |
| Race Nation linking | OAuth bearer token flow, not manual entry ID |
| Device priority | Desktop-first (1440px). Mobile pass later. |
| Registration | Race Nation handles everything. Le Cure deep-links out. |
| Events API | Still awaited from Race Nation. Climbs pages use dummy data until received. |
| Curistas directory | Public community wall confirmed — exists on current site |
| Nav auth state | Sign In text link (logged out) / Avatar dropdown (logged in) |
| "Create Account" CTA | Contextual on key pages, not permanently in nav |
| v7 design system applied to all pages | Fluid type scale (clamp values), dark nav on scroll, three-tier colour families (indigo/lavender, pink, amber/warm), pink thread climbing metaphor, elevation SVG in hero, tall Curista hero cards |
| Photography | 30-image Unsplash library added to assets/images/. Mapped and applied to 12 pages. Account, Register, Curista Profile have no photography (functional pages). |
| Tonal reduction | Pending — inner pages to reduce dominance of black/dark grey in non-photographic sections during Figma design pass |
| Hero background | Changed from #0A0A0A to brand pink #E8357A. Nav inverts to white text/white Donate button on pink, reverts to dark on scroll. |
| Stats bar (.impact) | Dark #0A0A0A background to separate from pink hero and provide visual full stop before tier sections. |
| Foothills tier colour | Amber/brown replaced with mauve family (#9B2EA8 / #F8F0F8 / #5A1A5A). Keeps palette within pink-red-blue family. |
| Tier colour usage principle | Bold contrast blocks — accent and dark colours used as full-width section backgrounds and CTA strips, not just labels. |
| Tier carousel | GSAP ScrollTrigger scroll-driven animation. Cards stack from below (Foothills first, Pinnacle last). Scroll container height = sticky height + (1.5vh × 2 transitions) + 0.75vh buffer. Scrub 0.3. |
| Map & elevation production | Leaflet.js + Mapbox Outdoors for route maps. Chart.js filled area for elevation profiles. Data scraped from current WordPress site (WP-GPX-Maps inline arrays). gpxpy for future GPX uploads. svg_path_simple pre-computed for homepage cards. |

---

## Integration Partners

| Platform | Purpose | Status |
|---|---|---|
| Race Nation | Event registration (deep-link out) | Awaiting API keys + Events API schema |
| SportsGiving | Fundraising data API (read-only, no auth needed) | Schema received, in `/project/api-fundraising.md` |
| Race Nation OAuth | Curista account linking (bearer token flow) | Flow confirmed with Race Nation |

**Race Nation Fundraising API base:** `/api/v1` · 60 req/min · Totals cached 60s · All amounts GBP

Key endpoints in use:
- `GET /api/v1/races/{race}` — event total (homepage, impact, event pages)
- `GET /api/v1/races/{race}/leaderboard/entries` — Curistas directory
- `GET /api/v1/pages/entry/{id}` — individual Curista profile (race entrant)
- `GET /api/v1/pages/fundraiser/{identifier}/participant` — Foothills Curista profile
- `GET /api/v1/activities/{activity}` — Foothills aggregate total

---

## Site Map Summary

```
lecure.org/
├── /                           Homepage
├── /about                      About Le Cure
├── /impact                     Fundraising impact
├── /the-ride                   Le Cure De France landing
│   ├── /the-ride/the-route     Current year stages
│   │   └── /the-ride/the-route/{year}  Year archive
│   ├── /the-ride/the-climbs    Col encyclopaedia
│   │   └── /the-ride/the-climbs/{col-slug}  Col detail
│   ├── /the-ride/why-you-should
│   └── /the-ride/how-it-works
├── /the-climbs                 UK events listing
│   └── /the-climbs/{event-slug}  Event detail
├── /the-foothills              Activities listing
│   └── /the-foothills/{activity-slug}  Activity detail
├── /curistas                   Community directory
│   └── /curistas/{slug}        Public profile
├── /account                    Authenticated account
├── /account/login              Sign in / Register
└── /stories                    Editorial (post-launch)
```

Full IA document: open `docs/lecure-ia-v1.html` in browser.

---

## Wagtail Data Models — Key Notes

### Le Cure De France (relational)
```
Edition (year) → Stage (one-to-many) → StageCol (through) → Col
```
- Col appearances on stages auto-derived from relational data
- No manual maintenance of "Le Cure climbed this in X" lists
- StageCol through table includes: direction of ascent, order in stage

### Climbs Event Types — Discipline-Specific Fields
Base `ClimbsEventPage` + StreamField for type-specific blocks:

| Field | All | Cycling | Running | Duathlon | Swimming |
|---|---|---|---|---|---|
| Name, date, location, fee, places | ✓ | ✓ | ✓ | ✓ | ✓ |
| Distance options, GPX, elevation, feed stations | | ✓ | | | |
| Single distance, surface type, course map | | | ✓ | | |
| Segments (run/bike/run), transitions | | | | ✓ | |
| Water temp, wetsuit, safety info | | | | | ✓ |

Implementation: `CyclingRouteBlock`, `RunningCourseBlock`, `DuathlonSegmentsBlock`, `SwimmingDetailsBlock` in a StreamField called `event_details`.

### Curista Account Model
- `user` (Django User FK)
- `race_nation_access_token` (encrypted)
- `race_nation_entry_id` (derived post-OAuth)
- `display_name`, `tagline`, `story`, `profile_image`
- `is_public` (bool, default True)
- `cycling_experience`, `biggest_fear`, `reason_for_riding` (debutant fields)
- `status` (debutant / curista / veteran — derived from event history)

---

## Curista Status Tiers (from current site)
- **Débutant** — first Le Cure event
- **Curista** — returning participant
- **Veteran** — 5+ years (proposed, confirm with client)

---

## Content Migration Plan (post-IA sign-off)

Python scraper to extract from current WordPress site into JSON
matching Wagtail import format. Target content:

1. All Curista profiles (names, photos, bios, event history)
2. Stage data per year 2014-2026 (dates, distances, verticals, GPX)
3. Full Climbs encyclopaedia (col data, history, Le Cure appearances)
4. Editorial content (Why You Should, How It Works, About, Marianne's message)

Current site images: `lecure.org/wp-content/uploads/` (profile photos at 360x360)
Hero video: `lecure.org/wp-content/themes/lecure/library/video/DJI_0410_1.mp4`
Photography: `photos.lecure.org` (rich alpine event photography archive)

---

## 2026 Stage Data (verified from current site)

| Stage | Date | Route | Distance | Vertical | Cols |
|---|---|---|---|---|---|
| 1 | 26 Aug | Valberg → Barcelonette | 114km | 2705m | Cime de la Bonette |
| 2 | 27 Aug | Barcelonette → Briançon | 100km | 2533m | Col de Vars, Col d'Izoard |
| 3 | 28 Aug | Briançon → Lanslebourg | 111km | 2620m | Col du Lauteret, Col du Galibier |
| 4 | 29 Aug | Lanslebourg → Tignes | 72km | 2201m | Col de l'Iseran |
| **Total** | | | **397km** | **10,059m** | |

---

## Next Phase After Prototype Review

Once prototype is reviewed and client has seen it:

1. **Figma design system** — translate tokens into Figma variables (Lukas Oppermann plugin), build component library from prototype patterns
2. **Django/Wagtail scaffolding** — project setup, data models, Wagtail page types
3. **Race Nation API integration** — implement OAuth connect flow + fundraising data endpoints
4. **Content migration** — scraper script, data import to Wagtail
5. **Frontend build** — template implementation against Wagtail backend

---

## Useful URLs

| Resource | URL |
|---|---|
| Current site | https://lecure.org |
| Current stages | https://lecure.org/stages/ |
| Current climbs | https://lecure.org/climbs/ |
| Current Curistas | https://lecure.org/curistas/ |
| Dan's public profile | https://lecure.org/profile/dan_griffiths/ |
| SportsGiving donate | https://sportsgiving.co.uk/sponsorship/event/5457 |
| Race Nation support | https://support.race-nation.com/ |

---

## Resuming in a New Claude Session

Start message:
```
Continuing the Le Cure website project for Crew Studio.
Please read ~/Projects/lecure/README.md to get up to speed.
```

The README is the single source of truth for project state.
Update it whenever a significant decision is made or phase completes.

---

*Last updated: March 2026 — Cols Encyclopaedia listing page added (page 17); Foothills tier colour updated from mauve to forest green across all token files and design system doc; CSS architecture documented; rem conversion pending.*
