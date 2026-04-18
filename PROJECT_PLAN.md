# Rogue Films v2: Project Plan

This is the working plan. Phases run in sequence where dependent, in parallel where independent. Each phase has scope, deliverables, acceptance criteria, dependencies, and known risks. Open questions are flagged inline so they don't get lost.

For the why and how of this project, read the README first.

---

## Phase map at a glance

```
Phase 0  Planning, audit, decisions          (in flight)
Phase 1  Foundation: tokens, classes, FS     (can start once decisions locked)
Phase 2  Talent page                         (most complex, informs the rest)
Phase 3  Lightbox + work detail pattern      (shared component used by 4+ pages)
Phase 4  Homepage                            (depends on lightbox)
Phase 5  Music Video and Film & TV pages     (mirror each other, can parallelise)
Phase 6  Individual director page            (depends on homepage grid pattern)
Phase 7  Migration, performance, QA, launch
```

Phases 5 and 6 can run concurrently with each other. Phase 1 has streams that can run alongside Phase 2 once the foundation decisions are locked. Detail in the concurrency section at the end.

---

## Phase 0: Planning, audit, decisions locked

**Status:** In flight.

**Scope.** Everything that needs to happen before we touch the Designer or write any production code. The point is to remove ambiguity so the build phases are pure execution rather than mid-flight architecture decisions.

**Deliverables.**

A locked README and PROJECT_PLAN, both kept current as the project progresses.

A documented audit of the current build: page list, CMS schemas, where custom code lives, the existing video JS pattern. Already done via Webflow MCP, summarised in `/docs/audit-v1.md` (to be written).

A locked decision on the video architecture: HLS or progressive MP4, what the controller looks like, how it reads CMS data. Captured in `/docs/technical-architecture.md`.

A locked decision on the CMS deprecation strategy: which fields are deprecated, how they're labelled, what the new minimal schema looks like, and confirmation Rogue's content team can work with it. Captured in `/docs/cms-migration.md`.

A design walkthrough of the four key Figma frames (Homepage, Talent, Music Video, Lightbox/Work) with Dan, capturing any interaction details that aren't visible in the static frames.

**Acceptance criteria.**

No remaining open questions in the README's status board. Everything in `/docs/` is at v1. A second Claude session (or another developer) could pick up Phase 1 from these docs without asking us anything.

**Open questions to close.**

Vimeo plan tier and HLS availability. Resolution: Dan to check the Vimeo account dashboard or contact their account manager.

Figma MCP wire-up. Resolution: confirm whether it can be hit from within a Claude session that also has Webflow MCP, or whether we accept it lives only in the Claude desktop app and we work via design walkthroughs and screenshots when designs need consulting mid-build.

Whether the legacy `Work` route and category routes (`/work-type/commercials`, `/work-type/music-videos` etc.) remain alongside the new dedicated pages, or whether the new pages replace them entirely. Resolution: Dan to confirm IA decision.

Whether the Rogue/Rebel split fully collapses into a single Talent collection, or whether `is-a-rebel` (which already exists on the Directors collection) continues as a filter/badge.

---

## Phase 1: Foundation

**Goal.** Establish the design system, class conventions, and shared infrastructure that every subsequent page build depends on.

**Scope.**

**Variable system.** Audit current Webflow Variable Collections on the v2 site. Define a tokenised set covering: brand colour palette (with semantic names like `surface/primary`, `text/body`, not just hex names), spacing scale (8-step probably, rem-based), type scale (5-7 sizes, rem with fluid clamp), border radius scale, and breakpoint variables. The design system doc captures the token tree and how it maps to Figma styles.

**Fluid responsive setup.** Install Finsweet Fluid Responsive following the official setup guide. Replace existing vw-based sizing where it appears in the duplicated v2 site with rem and fluid clamp values driven by variables.

**Class system.** Adopt Finsweet Client First conventions across new and refactored components. Audit the duplicated site for legacy class names (heavy use of utility-style and Webflow auto-generated classes), produce a renaming map, and apply it where it doesn't risk breaking shared components. Anything legacy that's used widely and not being touched in this phase gets a `_legacy_` prefix and a deprecation note.

**Finsweet Attributes baseline.** Confirm Finsweet Attributes 2 is loaded via the recommended embed (versus mixed v1 and v2 instances which the live site appears to have). Document the standard attributes the project uses: list-load, list-filter, list-sort, smart-lightbox, copy-to-clipboard. Each gets a one-line note in the design system doc explaining when to use it on this site.

**Sitewide custom code skeleton.** Create the shell for the video controller in Site Settings > Custom Code (footer), with a clear header comment block, version, and module loader pattern. The actual controller comes in Phase 2 but the slot is ready.

**Deliverables.**

Updated Variable Collections in the Webflow Designer.

A `design-system.md` document covering tokens, classes, fluid responsive setup, and Finsweet attribute conventions for this project.

A class rename audit report (a CSV or table) showing legacy classes and their new equivalents, with status (renamed, deprecated, untouched).

The footer custom code shell registered and validated.

**Acceptance criteria.**

A new component built using only the design system tokens, Client First class conventions, and Fluid Responsive sizing, that visually matches a Figma reference at every breakpoint without any hard-coded pixel or vw values.

**Dependencies.** Phase 0 decisions locked.

**Risks.**

Class renames can silently break things across the site if shared classes are renamed without auditing every page that uses them. Mitigation: rename in additive mode (new class added alongside old), test each page, then remove old. Don't rename in place.

Finsweet Client First can require restructuring DOM nesting in places. Where this collides with Webflow component instances, it gets fiddly. Mitigation: this is part of the audit, flag any high-effort restructures and decide phase by phase.

---

## Phase 2: Talent page

**Goal.** Build the Talent page (replacing `/directors`) as the architectural reference for the single-video swap pattern. The video controller built here is reused (with a different mode) for grid pages.

**Key insight from design walkthrough.** This page is text-led, not a grid of video tiles. A single full-bleed background video plays behind the page. Director names are listed in three columns over the video. Hovering a name swaps the background video to that director's hero showreel. This is a clean adaptation of the Imperial.tv pattern Dan referenced, and it means we run one active video and one preloaded "next" video at any time. Not 24 simultaneously playing tiles.

**Scope.**

The new `/talent` route combining Rogues and Rebels into a single page. Page structure: TALENT title, filter pills (`ALL`, `ROGUE`, `REBEL`, `RESET`), then three columns of director names. Background video runs full-bleed behind the title and list area.

Filtering uses Finsweet list-filter on the `is-a-rebel` field. Filtering shows/hides director names from the list; the background video continues playing whichever director is currently active.

Hover behaviour: when a director name is hovered, that director's hero showreel becomes the background video. Active director name gets accent colour treatment per Figma. When no director is hovered, the controller cycles through directors automatically (Imperial.tv-style auto-rotate), or holds on the last hovered (TBC, confirm with Dan during walkthrough).

Click a name, navigate to that director's individual page (Phase 6).

**Mobile behaviour.** No hover on touch. Two options to validate: (a) auto-rotate through directors continuously with no manual control, names just navigate on tap; or (b) tapping a name first activates its background video, second tap navigates. Recommend (a) for simplicity unless Figma suggests otherwise. Confirm in walkthrough.

**Implementation approach.**

Webflow Designer holds the layout: a CMS Collection List bound to Directors (excluding `remove-from-director-list`), three-column text grid via the design system. A separate full-bleed background container holds two `<video>` elements (active and preload) that the controller swaps between with crossfade.

Each director name has a `data-director-id` attribute and a `data-video-url` attribute (read from the linked `hero-showreel`'s `video-url` field, which is the rollover loop, the right asset for this purpose).

The video controller takes over after page load. It maintains: an active video (visible, playing), a preload video (hidden, loaded with the next-likely director's reel), an auto-rotate timer (e.g. 6 seconds per director), and hover state. On hover, it swaps active and preload, kicks off loading the next preload. On rotate, same but driven by timer.

`prefers-reduced-motion` disables auto-rotate and crossfade entirely. A static poster of the first director shows, hover swaps without animation.

**Deliverables.**

The Talent page live in the Webflow Designer.

The video controller v1 module written in `/code/video-controller.js`, embedded in Site Settings > Custom Code > Footer. v1 includes the "background swap" mode used here.

A talent-page init script in the Talent page's per-page custom code, calling the controller in talent mode.

A Playwright test verifying load behaviour, hover swap, auto-rotate, error fallback, and reduced-motion compliance.

`docs/technical-architecture.md` updated with the controller architecture as built.

**Acceptance criteria.**

Visually matches Figma at all breakpoints. Hover swaps background video smoothly with crossfade. Auto-rotate cycles cleanly when no hover is active. Filter pills correctly show/hide directors and the background video continues playing. Network panel shows only one or two videos loading at any time, never the full set. Lighthouse Performance score above 85 mobile, 92 desktop. Page initial load under 1.5s on 4G simulation. No console errors. Reduced-motion users get a static poster and instant swap on hover, no autoplay.

**Dependencies.** Phase 1 foundation. Vimeo HLS confirmed available (Pro plan, confirmed).

**Risks.**

Vimeo signed URL expiry would break the page. Mitigation: the controller catches play errors and falls back to poster gracefully. Separately, a scheduled URL refresh job (Phase 7) keeps URLs fresh.

Auto-rotate timing can feel either rushed or sluggish; it's subjective. Mitigation: expose timing as a config constant at the top of the controller so we can iterate quickly with Dan's input.

Crossfade timing on slower devices may feel laggy. Mitigation: feature-detect and fall back to instant swap on devices below a CPU/memory threshold (or just accept it; the alternative is overengineering).

---

## Phase 3: Lightbox and work detail pattern

**Goal.** Build the shared video lightbox and the corresponding standalone work detail page. Both render the same component; the difference is one is overlaid, one is a full page. This pattern is used by every grid view across the site (Homepage, Music Video, Film & TV, Director page), so it must be solid before those pages are built.

**Scope.**

A lightbox component triggered from any grid tile that plays the full hero video, supports next/previous within the current list context, shows credits/metadata, and exposes a copy-link button (using Finsweet copy-to-clipboard) that copies a deep link to the standalone work detail page for sharing.

The standalone work detail page (`/director-showreels/[slug]`) which already exists in the v1 build. The same video player, same metadata layout, used as the canonical shareable URL. The lightbox link points here.

Anamorphic videos use the wider ratio in the lightbox; the grid tile that triggered them was 16:9.

Implementation uses Finsweet Smart Lightbox where it fits the brief. Smart Lightbox handles next/previous within a list context natively which is exactly what's needed. Where it doesn't fit (e.g. the standalone page deep link, the credits layout), we extend rather than replace.

**Deliverables.**

A lightbox component built in the Designer, configured with Smart Lightbox.

The standalone work detail page rebuilt to match the Figma layout.

The video controller updated to support a "lightbox" mode (full quality, audio enabled, full-length file).

Copy-to-clipboard button working with the correct deep link.

A test suite covering lightbox open, next/previous, escape to close, copy link, anamorphic ratio handling.

**Acceptance criteria.**

Visual match to Figma. Smooth lightbox transitions. Next/previous navigates correctly within the originating list (e.g. when opened from a director's work archive, navigates only within that director's archive; when opened from the homepage, navigates within the homepage list). Copy link copies the standalone URL. Standalone URL renders the same video and metadata as the lightbox.

**Dependencies.** Phase 2 (video controller exists). Confirmation that Smart Lightbox supports the next/previous-within-context pattern needed.

**Risks.**

Smart Lightbox may need extending via its API to support list context properly. If so, we use the Finsweet Attributes API (https://finsweet.com/attributes/attributes-api) but document it clearly so a designer can still understand what's happening.

The "next/previous goes to the next CMS item in this view" pattern across different list contexts is conceptually simple but easy to get wrong. Mitigation: write tests for each list context (homepage, director archive, music video, film & TV) before shipping.

---

## Phase 4: Homepage

**Goal.** Rebuild the homepage to the new Figma. Hero treatment with massive ROGUE wordmark over an anamorphic hero video, latest work grid in a "1 large, 2 small, repeating" pattern, and a news slider beneath.

**Scope.**

The hero block at top: huge ROGUE wordmark overlaid on the `homepage-hero` flagged Showreel, anamorphic ratio if available (using the `homepage-hero-16x9` field as a 16:9 fallback if needed), autoplay loop muted, with credit beneath ("INTACT • LEAVE YOUR MARK" style) and link to lightbox.

The latest work grid using `show-on-homepage` Showreels in `homepage-latest-order` order. Layout pattern per Figma: 1 full-width tile, then 2 half-width tiles, repeating. Each tile is 16:9.

Each tile is interactive: hover reveals video loop, click opens lightbox. Reuses the video controller in "grid" mode (introduced in this phase as the second controller mode after the talent page's "background swap" mode) and the lightbox component from Phase 3.

A pink full-bleed tagline section between the work grid and the news section ("ROGUE IS WHERE LONDON'S MOST DISTINCTIVE ENTERTAINMENT GETS MADE.").

The news section beneath, rebuilt as a Finsweet CMS Slider component bound to the News collection. Per Figma: horizontal scroll/slider with arrow controls. This replaces the v1 vertical news list.

**Implementation approach for the grid.**

Rather than scripting layout, use CSS Grid with a `:nth-child(3n+1)` rule to make every third item span the full row. The Webflow Designer holds a single Collection List with regular grid styling; the Client First class structure plus a small custom CSS rule in the page's custom code handles the alternating spans. Pure CSS, no JS layout work.

Alternative considered and rejected: multiple stacked Collection Lists with limit/offset to manually feed the layout. Rejected because it doesn't compose well with Finsweet load and would be brittle.

**Implementation approach for the news slider.**

Finsweet CMS Slider attribute applied to the News Collection List. Configure for the per-breakpoint slide count Figma indicates (likely 4 on desktop, 2 on tablet, 1 on mobile, confirm during build). Native arrows and dots styled per Figma.

**Deliverables.**

Homepage rebuilt in Designer to Figma spec. Hero with anamorphic video. Grid pattern working. Lightbox integration confirmed. News section rebuilt as Finsweet Slider. Pink tagline section. Page-specific init script wires the video controller in grid mode.

**Acceptance criteria.**

Visual match to Figma at all breakpoints. Hero loads instantly with priority hint and uses anamorphic where available. Grid pattern works correctly with any number of items (handles edge cases of total count not being a multiple of 3). News slider scrolls smoothly. Lighthouse Performance >85 mobile, >92 desktop. No layout shift.

**Dependencies.** Phase 1, Phase 2 (controller), Phase 3 (lightbox).

---

## Phase 5: Music Video and Film & TV pages

**Goal.** Two new category pages with identical functionality, distinguished by which `work-type` reference they filter on.

**Scope.**

Both pages: title (MUSIC VIDEO or FILM & TV) at top, director filter dropdown left, search field right, then a grid of Showreels filtered by work-type. Per Figma, the grid pattern here is `2 large, 3 small, alternating`, distinct from the homepage's `1 large, 2 small` pattern. Pagination or infinite-load via Finsweet list-load.

Filter by director (Finsweet list-filter dropdown bound to the Directors collection). Search input (Finsweet list-filter search) operates on title and brand fields.

**Implementation.** These pages can be built in parallel since they share an identical component pattern. Build one fully, duplicate the page, swap the `work-type` filter, ship both.

The 2+3 alternating grid uses the same approach as the homepage's 1+2 pattern but with a different `:nth-child` rule. CSS Grid with a 6-column track, where odd "rows" of items span 3 columns each (2 across) and even "rows" span 2 columns each (3 across). Encoded as a custom CSS rule in the page's custom code, driven by Client First class names.

Filtering and load behaviour is entirely Finsweet Attribute-driven. No custom JS needed beyond the video controller (already in place by this point, in grid mode).

**Deliverables.**

Both pages live, with director filter, search, and load-more wired up.

**Acceptance criteria.**

Visual match to Figma. Filter by director works (single-select dropdown). Search works on title and brand fields. Load-more or pagination behaves smoothly. Grid pattern alternates correctly across any number of items. Tile interactions inherit from the established grid pattern.

**Dependencies.** Phase 4 (grid mode established in controller, lightbox in place).

**Concurrency note.** These two pages can be built simultaneously by different sessions, since they share a pattern but don't depend on each other.

---

## Phase 6: Individual director page

**Goal.** Update the director detail page (`/directors-roster/[slug]`) with the new layout and a Current vs Archive filter.

**Scope.**

Director profile section at top: huge director name as page title (per Figma), profile image and bio elsewhere as required. Below the title, a `CURRENT / ARCHIVE` toggle (pill buttons, `CURRENT` active by default).

Work grid below, uniform 3-up layout (different from homepage 1+2 and category pages 2+3 patterns). Each tile is 16:9 with title and brand label below. Filtering uses Finsweet list-filter to switch between Current (curated subset) and Archive (everything by that director).

**Open question, needs locking before build.** Which CMS field drives Current vs Archive. Two options:

(a) Repurpose `director-listing-order` (Showreel collection) with the convention: numeric value present = current, null/empty = archive. Editorial advantage: the field already exists, no schema change. Editorial disadvantage: relies on a convention that's easy to forget.

(b) Add a new `director-current` boolean (Switch) field on Showreel. Editorial advantage: explicit, hard to misuse. Disadvantage: schema addition, though non-destructive.

Recommend (b). Cleaner for the editorial team, doesn't conflict with existing field semantics, and adding a Switch is the lowest-risk schema change.

**Deliverables.**

Director detail page rebuilt. Profile + Current/Archive filter working. Tile interactions inherit from the established grid pattern. New `director-current` Switch field added to Showreel collection if option (b) chosen.

**Acceptance criteria.**

Visual match to Figma. Filter toggle switches between Current and Archive cleanly. 3-up grid renders correctly at all breakpoints. Tile hover and lightbox behaviour inherited from grid mode controller.

**Dependencies.** Phase 4 (grid pattern, lightbox), Current vs Archive question resolved.

---

## Phase 7: Migration, performance, QA, launch

**Goal.** Get from "v2 is feature complete in the duplicate site" to "v2 is live and stable on roguefilms.co.uk".

**Scope.**

**CMS field deprecation.** Update the Showreel collection field help text and display names to mark deprecated fields clearly (e.g. prefix with `[DEPRECATED]`). Document in `cms-migration.md` which fields are gone and what replaced them, so editors know going forward. Per the principle: do not delete fields with 700+ items behind them.

**Vimeo URL refresh.** A one-off Node script that iterates every Showreel CMS item, calls the Vimeo API to get fresh signed URLs for the rollover and full-length renditions, and updates the CMS via Webflow API. This handles any URLs that have rotated since they were stored. Plus a scheduled job (probably a small serverless function on Heroku or a Vercel cron) that re-runs this monthly to keep things fresh.

**Performance pass.** Run Lighthouse on every key page, on both mobile and desktop simulations. Address any sub-target scores. Test on real devices via BrowserStack or similar. Pay special attention to the talent page and any page with multiple grid tiles autoplaying.

**Cross-browser QA.** Manual matrix across Chrome, Safari (especially iOS Safari for HLS), Firefox, Edge.

**Accessibility audit.** Run axe DevTools across every page. Address violations. Confirm keyboard navigation works in the lightbox, on the talent page, and across all filter inputs. Confirm screen readers can navigate the work grids meaningfully.

**Content migration validation.** Confirm all 700+ Showreel items render correctly, all director references resolve, no broken video URLs, no missing posters.

**Cutover plan.** Document the steps to switch DNS/Webflow custom domain from v1 to v2, including a rollback plan. Schedule with the client for a low-traffic window.

**Deliverables.**

A passing test suite. A clean Lighthouse report. An accessibility report. A live URL refresh script and scheduled job. A documented cutover plan executed without incident.

**Acceptance criteria.**

v2 is live on roguefilms.co.uk. v1 is archived (in case of need to roll back, kept as a published Webflow site for 30 days post-launch). All 700+ items render. Performance meets targets. No accessibility regressions vs v1.

---

## Concurrency map

What can run in parallel, with which session.

```
Phase 0 (now)                    chat (this session)
Phase 1 stream A: variables      chat
Phase 1 stream B: classes        Claude in Chrome (visual audit)
Phase 1 stream C: FS attributes  chat (MCP-driven audit)

Phase 2 talent page              chat for Webflow + Claude Code for JS
Phase 3 lightbox                 chat for Webflow + Claude Code for JS
Phase 4 homepage                 chat for Webflow

Phase 5 music video page         chat session A
Phase 5 film & TV page           chat session B          (genuinely parallel)
Phase 6 director page            chat session C

Phase 7 streams:
  CMS deprecation labels         chat (MCP writes)
  URL refresh script             Claude Code
  Performance pass               Claude in Chrome
  A11y audit                     Claude in Chrome
```

The two genuine concurrency wins are: (1) Phase 5 pages built in parallel since they're near-clones, (2) Phase 7 having multiple independent streams that can all run at once close to launch.

---

## Risks register

**Vimeo plan limits HLS.** If the plan doesn't include HLS, we lose adaptive bitrate and have to do quality selection client-side based on `navigator.connection`. Workable but less elegant. Probability: medium. Impact: medium.

**Signed URL expiry causes silent breakage post-launch.** Mitigated by the refresh script and graceful poster fallback in the controller. Probability of breakage without mitigation: high. With mitigation: low.

**Class rename audit takes longer than scoped.** v1 has accumulated a lot of utility classes and inline styles. Mitigation: budget Phase 1 generously, accept that some legacy classes survive into v2 with `_legacy_` prefixes for later cleanup. Probability: high that some bleed-through happens. Impact: low if scoped properly.

**Finsweet Attributes don't cover the lightbox next/previous-within-context need.** Mitigation: Finsweet API extension documented well, fall back if needed. Probability: low (Smart Lightbox should handle this). Impact: medium if it doesn't, requires custom controller.

**Designer-maintainability drifts as we add more JS.** Mitigation: every JS module gets a comment block at the top explaining what it's for, what it expects in the DOM (data attributes etc.), and how to disable it. Probability: medium. Impact: medium.

**Editorial team not ready for any CMS changes, even non-destructive ones.** Mitigation: walkthrough with them before any field labelling changes. Probability: low. Impact: low (we can defer cosmetic changes).

---

## Open questions parking lot

Anything not closed in Phase 0 lands here so it doesn't get lost. Address before the relevant phase needs it.

**Resolved:**
- ~~Vimeo plan tier and HLS support~~ Resolved: Pro plan, HLS available.
- ~~Whether legacy `/work-type/` routes survive~~ Resolved: dropped from IA, but `work-type` reference field stays for filtering Showreels into category pages.
- ~~Whether `is-a-rebel` survives as a filter~~ Resolved: yes, drives Talent page filter and any Rebel badging.
- ~~Whether news section gets visual changes~~ Resolved: rebuilt as Finsweet CMS Slider.
- ~~Talent page interaction model~~ Resolved via design walkthrough: text-led, single background video swap pattern.

**Still open:**
- Confirm CMS deprecation approach with content team. **Needed by Phase 7.** Specifically that `video-url`, `hero-video`, `homepage-hero-16x9`, and `video-2` field labels can be updated to mark deprecated/canonical without disrupting current editorial workflow.
- Lock decision on `director-current` boolean vs repurposing `director-listing-order` for Current/Archive on director page. **Needed by Phase 6.** Recommendation: add new boolean.
- Confirm Talent page mobile interaction: continuous auto-rotate with no manual control vs tap-to-activate-then-tap-to-navigate. **Needed by Phase 2.** Recommendation: continuous auto-rotate.
- Confirm Talent page desktop fallback when no director is hovered: continuous auto-rotate, or hold on last hovered. **Needed by Phase 2.** Recommendation: continuous auto-rotate, matches Imperial.tv reference.
- Figma MCP wire-up for inline session use. **Nice to have, not blocking.** Setup instructions provided to Dan separately.
