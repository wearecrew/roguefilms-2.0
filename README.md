# Rogue Films Website v2

The v2 rebuild of roguefilms.co.uk. Webflow-native, design-led, with a custom video layer that handles the company's flagship asset (their reels) properly across 700+ CMS items.

This README is the project's single source of truth. Update it as decisions are made. If something changes and isn't reflected here, future-us (or another Claude session, or another developer) will lose context. Treat it as a living document.

---

## Context

**Client:** Rogue Films, a London-based commercial production company representing directors across commercials, music videos, and long-form film and TV. The website is the primary shop window for the directors and the work, so the experience of watching their reels has to feel as considered as the films themselves.

**The job:** A v2 of the existing site that updates form and function without being a full rebuild. The existing Webflow project has been duplicated as `Roguefilms 2.0` (site ID `69dcac21fd295013e4344d52`) which is where v2 development happens. The live v1 site stays untouched until we cut over.

**Why we're doing this:** The current site works but the video layer is fragile (signed URLs that expire, no concurrency control, no adaptive quality), the CMS schema has accumulated cruft (four video fields per work item, a lot of editorial steps that are easy to get wrong), and the new designs introduce richer behaviour on the talent page that the current architecture won't carry.

**Stack constraints:** Webflow stays. Vimeo stays as the video host. Finsweet Attributes 2 stays as the standard for list loading, filtering, sorting, lightbox, and copy-to-clipboard. We extend in code only where Webflow can't deliver natively, and when we do we keep the extensions documented and accessible to a designer.

---

## Working principles

These are the rules of the road for every decision on this project. They're distilled from the brief and override personal preference where they conflict.

**Webflow first, code second.** Default to native Webflow functionality (Designer-built layout, CMS Collection Lists, IX2, native video components) before reaching for code. When code is necessary, it lives in the Designer's custom code panels rather than externally hosted, except where size genuinely requires otherwise.

**Designer-maintainable.** A designer should be able to maintain this site after we ship. That means: well-named classes, well-documented custom code, attribute-driven behaviour rather than scripted DOM manipulation where possible, and a CMS schema that doesn't punish editors for getting steps slightly wrong.

**Design fidelity is non-negotiable.** Figma is the canonical source of truth. We do not visually drift from the designs. If we encounter a constraint that forces a deviation, we flag it and reconcile with the designs before shipping.

**Performance as a feature, not an afterthought.** This is a video-heavy site for a film company. Slow or stuttering video is a credibility issue for them, not just a technical one. Lighthouse scores, network behaviour, and battery impact on mobile are all in scope.

**Non-destructive CMS changes.** With 700+ items in the Showreels collection, we do not delete or rename fields. We mark fields as deprecated in their help text and migrate over time. Existing data remains valid throughout.

**CMS is already populated.** The v2 site was duplicated from v1, which means all 700+ Showreels, Directors, News items and associated assets are already in place in the 2.0 CMS. New pages bind directly to these existing collections; we never re-import data. The only CMS changes we make are additive (e.g. a new `director-current` boolean) or cosmetic (deprecation labelling in help text).

**Pages are built fresh, alongside the old, then slug-swapped at launch.** Rather than modifying existing pages in place, we create brand-new pages with temporary slugs (e.g. `home-v2`, `talent-v2`, `music-video`, `film-tv`). This keeps the v1 pages in the Designer as living reference during the build. At launch, we swap slugs: old pages get a `_legacy_` prefix or get archived, new pages take over the canonical slugs (`/`, `/talent`, etc). This gives us side-by-side visual comparison throughout the build, safe rollback, and no risk of half-built work being exposed. Note: the `Work - wf native` draft from v1 suggests this pattern was already being informally used; we're formalising it.

**Video controller JS lives in the GitHub repo, served via CDN.** Initially this was to be embedded in the Webflow Designer's Custom Code panel. Now that a repo exists (`wearecrew/roguefilms-2.0`), the controller lives at `/code/video-controller.js` in version control and is served to the live site via jsDelivr's free CDN, which serves directly from GitHub. URL format: `https://cdn.jsdelivr.net/gh/wearecrew/roguefilms-2.0@main/code/video-controller.js`, or pinned to a version tag for production (`@v1.0` etc). Webflow's Site Settings > Custom Code > Footer carries a single `<script src="...">` tag pointing to this. Per-page init scripts (tiny, page-specific configs) can still live in the Designer's per-page custom code. This approach gives us version control, easy iteration, no Webflow size limits, and the script is still maintainable by a designer-led team because the embed point in Webflow remains a single line.

**Tokens, not magic numbers.** Move to a variable-driven design system for colours, spacing, sizing, and typography. Replace vw-based sizing with rem plus Finsweet's fluid responsive helpers. Adopt Finsweet Client First as the class naming convention.

**Mobile is a first-class context.** A mobile-optimised video strategy ships at the same time as desktop, not as a follow-up. Lower bitrates, reduced concurrency, in-viewport-only autoplay where appropriate.

**Documented extensions.** Any code we write is commented, attributed, and its purpose explained. A future maintainer should be able to read it and know what it's for and how to change it.

---

## Tech stack and tools

**Designer + CMS:** Webflow.

**Video host:** Vimeo. Currently using direct progressive MP4 links via Vimeo's API. Need to confirm whether Rogue's plan supports HLS manifests, which would unlock adaptive bitrate. Open question, see decisions log.

**List, filter, sort, lightbox, copy:** Finsweet Attributes 2. Already in use sitewide. We extend our usage to cover all new list views (Talent, Music Video, Film & TV, individual director work archives). Reference: https://finsweet.com/attributes and the GitHub source at https://github.com/finsweet/attributes.

**Sizing model:** rem-based with Finsweet Fluid Responsive (https://finsweet.com/client-first/docs/fluid-responsive). Class naming follows Finsweet Client First (https://finsweet.com/client-first/docs).

**Custom JS:** Plain ES6, no jQuery, no framework. Lives in Webflow's Custom Code panels (Site Settings > Custom Code for sitewide; per-page custom code for page-specific initialisations).

**Tests:** Playwright for browser-based video behaviour tests, a Node script to validate all 700+ CMS Vimeo URLs respond 200 (catches signature expiry), Lighthouse CI for performance regression. Detail in `/docs/testing.md` once written.

**MCPs in use:** Webflow MCP (connected via Claude desktop app, site ID above) for CMS schema reads, page content, scripts, and write operations. Figma MCP (active in Dan's Figma desktop app but not directly accessible from this chat interface) for design context.

---

## How to work on this project

**Claude session split.** Three useful sessions can run concurrently:

The chat session you're reading is for planning, architecture, Webflow MCP queries that need approval flow, and writing or editing project docs. It's the orchestrator.

A Claude Code session running locally is for writing and iterating on the video controller JS, the test suite, and any node scripts (CMS URL validation, Vimeo refresh script). Code session works in a local working copy of `/code/`.

Claude in Chrome is for visual QA, comparing the live build against Figma, and clicking through the Webflow Designer to make adjustments where the MCP can't reach.

When work happens in any of these sessions and produces a decision worth keeping, add it to `docs/decisions.md` so the next session has context.

**MCP usage rules.** If a tool isn't available in the current chat, don't proxy or fake it. Either prompt the user to run it from a session that has access, or note it as an open task. Specifically: this chat has Webflow MCP but not Figma MCP. Don't try to substitute screenshots for what the Figma MCP would return.

**Approval flow.** Webflow MCP write operations require approval each time. Batch them where possible into single tool calls with multiple actions to keep approvals to a minimum.

**Source of truth for designs.** Figma file: https://www.figma.com/design/BuVndAwQ1zQKACDJFswneK/Rogue-Website-2026-updates. Always cross-reference before implementation.

---

## Project structure

The project lives in a folder on Dan's machine. Within it:

```
/rogue-v2/
  README.md                      this file
  PROJECT_PLAN.md                phased plan, deliverables, dependencies
  /docs/
    decisions.md                 running log of choices and rationale
    cms-migration.md             field deprecation strategy, migration steps
    technical-architecture.md    video controller, JS modules, data flow
    design-system.md             tokens, classes, fluid responsive setup
    testing.md                   test strategy and how to run it
  /code/
    video-controller.js          the unified video controller module
    init/                        per-page init scripts
    tests/                       playwright + node validation scripts
  /skills/                       project-specific Claude skills
    webflow-rogue/
    video-controller/
  /reference/
    audit-v1/                    notes from the v1 audit
    figma-exports/               key screens exported for reference
```

Skills under `/skills/` are how we codify repeating patterns for future Claude sessions on this project. Started lean, grow as we identify recurring tasks (e.g. "always-do-this-when-touching-CMS", "Finsweet attribute conventions for this site").

---

## Status board

Update this section regularly. It's the first thing anyone reads when picking the project up.

**Current phase:** Phase 3 in flight — standalone page wired, lightbox attributes wired, Music Videos grid rendering, one embed-URL fix away from end-to-end.

## 🔜 Start here next session

**Where we left off:** Music Videos page has 75 tiles rendering in the 2+3 alternating grid. Lightbox overlay is on the page with all `data-rogue-lightbox-*` attributes. 75 tiles are bound as triggers. Sitewide embed is currently loading controller v0.5.1, which can't resolve the tile's trigger URL — v0.5.2 (pushed + tagged) has the href-fallback fix that makes Dan's setup work as wired.

**The single unblocker — change one character in the Webflow Site Footer script tag:**

```html
<!-- CURRENT (broken: resolves to v0.5.1, no href fallback) -->
<script src="https://cdn.jsdelivr.net/gh/wearecrew/roguefilms-2.0@v0.5/code/video-controller.js" defer></script>

<!-- SHOULD BE (no `v` prefix — semver range, picks latest v0.5.x) -->
<script src="https://cdn.jsdelivr.net/gh/wearecrew/roguefilms-2.0@0.5/code/video-controller.js" defer></script>
```

Then republish, hard refresh [`/music-videos`](https://roguefilms-bef8a340cdee840701aac49d674b.webflow.io/music-videos), click any tile → lightbox should fetch `/director-showreels/[slug]` content and open.

**If that works, next steps on the Music Videos page:**
1. Run Playwright lightbox tests (open, prev/next, close, copy-link, esc) against `/music-videos` — write a new suite at `code/tests/music-videos.spec.js`.
2. Wire conditional visibility on `.showreel_stills` + `.showreel_credits` (show only when CMS field is set) so empty blocks don't render.
3. Confirm Back pill inside the lightbox closes the overlay (delegates to `data-rogue-showreel-back`).
4. Check copy-link pill copies the canonical URL and flashes "Copied!".
5. Check anamorphic videos render with correct aspect ratio via `data-video-width` / `data-video-height` on `.showreel_video-frame`.
6. Convert the `.showreel_lightbox` element to a Webflow **Symbol / Component** so Homepage, Film & TV, Director pages can drop it in once without duplicating markup.

**After Music Videos is green, Phase 5 Film & TV** is essentially a clone of Music Videos — same grid, same lightbox wiring, different CMS filter (`work-type = Film and TV`). Should take <30min once Music Videos is validated.

**Phase 1 deliverables (2026-04-18):**
- Design system spec at [docs/design-system.md](docs/design-system.md) — two-tier (primitive + semantic) naming, consistent scale, responsive-patterns section.
- Machine-readable [docs/tokens.json](docs/tokens.json) in W3C DTCG format — imports cleanly via Crew Token Bridge after validating parser behaviour in `reference/crew-token-bridge/`.
- Webflow `Tokens` collection populated with **49 variables** across 3 modes (Mobile / Tablet / Desktop):
  - 13 colour (5 primitives + 8 semantics, aliased via `existing_variable_id`)
  - 2 font family, 3 weight, 3 line-height
  - 9 type-size with distinct per-mode values (Mobile/Tablet/Desktop)
  - 10 spacing (same values across modes; three-mode structure retained for consistency)
  - 1 radius, 5 breakpoints, 3 motion durations
- 3 motion easings defined in `docs/tokens.json` for Figma; in Webflow they drop into site-wide CSS custom properties in Phase 2.

**Done:**
- Site duplicated as Roguefilms 2.0 (CMS fully populated, 700+ showreels, directors, news inherited).
- v1 audit: pages, collections, video CMS fields, custom script location.
- Design walkthrough of six key Figma frames, architectural decisions locked.
- Vimeo plan confirmed (Pro, HLS available).
- Full Figma extraction: all 7 desktop frames (1728px canvas) + all 7 mobile frames (402px canvas).

**Phase 2 shipped:**
- [`code/video-controller.js`](code/video-controller.js) — sitewide module served via jsDelivr `@0.4`. Injects motion-easing CSS vars, active-state CSS, exposes `window.RogueFilms.initTalentPage()`.
- Background-swap controller: crossfade with canplay-gated fade-in, poster layer, auto-rotate, filters, reduced-motion, tab-visibility, race-safe rapid hover.
- Talent page live on [`/talent`](https://roguefilms-bef8a340cdee840701aac49d674b.webflow.io/talent) with 24 directors, 4 rebels, filter pills, Webflow CMS bindings.
- Build guide ([`docs/phase-2-talent-build.md`](docs/phase-2-talent-build.md)) + Playwright suite ([`code/tests/talent.spec.js`](code/tests/talent.spec.js)).

**Phase 3 in flight — progress so far:**

**Architecture decision (decisions.md has the detail)**: **fetch-and-inject** lightbox, not Finsweet Smart Lightbox. Standalone page at `/director-showreels/[slug]` is the canonical source; lightbox overlay is a sitewide shell; controller fetches the standalone HTML, extracts `[data-rogue-showreel-content]`, injects into `[data-rogue-lightbox-body]`.

**Shipped this session:**
- Controller v0.5.2 with `initLightbox()` — fetch-and-inject, prev/next, copy-link, esc/backdrop close, scroll lock, focus trap, cached fetches, race-safe rapid hover. `href`-fallback for the trigger URL so designers can just bind the Webflow Link Block to the collection page + add a presence-only attribute.
- CMS `credits` RichText field added to Showreels collection.
- Static HTML mockup at [`code/mockup/work-detail.html`](code/mockup/work-detail.html) — visually accurate reference.
- Reference build page "Film detail v2 reference" created via MCP with all classes + data-attributes.
- [`docs/phase-3-lightbox-build.md`](docs/phase-3-lightbox-build.md) — full attribute contract + step-by-step Designer instructions.
- Standalone `/director-showreels/[slug]` template rebuilt in v2 styling with CMS bindings. Live on staging (example: [`/director-showreels/welcome-to-my-bank-2`](https://roguefilms-bef8a340cdee840701aac49d674b.webflow.io/director-showreels/welcome-to-my-bank-2)).
- Sitewide `.showreel_lightbox` overlay wrapper placed on both the reference page and `/music-videos`, with `data-rogue-lightbox*` attributes, close button, inner `.showreel_layout` body.
- Music Videos page created with Collection List filtered to `work-type = Music Video`. 2+3 alternating grid CSS applied. 75 tiles rendering.
- Controller auto-inits on any page where a `[data-rogue-lightbox]` is present — no per-page init script needed for the lightbox.

**Tagged releases**: v0.5.0, v0.5.1, v0.5.2. jsDelivr `@0.5` semver range points to latest v0.5.x.

**Remaining loose ends:**
- Site Footer embed uses `@v0.5` — should be `@0.5` (see "Start here next session" above).
- Lightbox overlay is not yet a Webflow Symbol / Component — currently duplicated on each page where it's needed.
- Prev/next on the STANDALONE page are inert (deferred to Phase 6 for director-archive navigation).
- No Playwright tests for Music Videos / lightbox yet.
- Filter dropdown (director) + search input on Music Videos not yet built (Finsweet list-filter — optional polish).

**Resolved (Phase 0 walkthrough):**
- Vimeo plan: Pro. HLS streams are available on Pro accounts via the Player API. We can use HLS for the talent page background video and grid hover loops. Direct progressive MP4 also available as fallback.
- `is-a-rebel` stays as a CMS field, drives the ALL / ROGUE / REBEL filter on the Talent page and any Rebel-specific badging.
- Top-level `Work` page is dropped. The new IA is Talent / Film & TV / Music Video / About. The `work-type` reference field on Showreels stays as it's needed for filtering Showreels into the new category pages.
- News section on Homepage gets rebuilt as a Finsweet CMS Slider component, not just visual updates.
- Talent page architecture confirmed via Figma walkthrough: single background video swap pattern, NOT a grid of simultaneously playing tiles. This significantly simplifies the controller.

**Blockers / open questions remaining:**
- Confirmation that we can deprecate (not remove) the surplus video fields on the Showreel collection. Probably non-controversial but content team should sign off.
- Which CMS field drives Current vs Archive on the individual director page. Either repurpose `director-listing-order` (value present = current, null = archive) or add a new `director-current` boolean. Lean towards the latter for clarity.
- Figma MCP setup for inline use in chat sessions. Instructions sent separately, awaiting confirmation it's working.

---

## Key links

| What | Where |
|------|-------|
| Live v1 site | https://www.roguefilms.co.uk |
| Webflow project (v2) | Site ID `69dcac21fd295013e4344d52`, displayName `Roguefilms 2.0` |
| Figma | https://www.figma.com/design/BuVndAwQ1zQKACDJFswneK/Rogue-Website-2026-updates |
| Reference: Imperial.tv | https://www.imperial.tv (informs talent page interaction model) |
| Finsweet Attributes 2 | https://finsweet.com/attributes |
| Finsweet Client First | https://finsweet.com/client-first/docs |
| Finsweet Fluid Responsive | https://finsweet.com/client-first/docs/fluid-responsive |

---

## Glossary

**Showreel** in CMS terms means a piece of work (a commercial, a music video, a short film). The collection is called `Director showreels` and contains the 700+ items. The name is a quirk of the original schema; we're keeping it for non-destructive reasons.

**Hero showreel** is the single piece of work tied to a director that represents them on the talent listing. Driven by a reference field on the Directors rosters collection.

**Rollover video / loop video** is the short, low-bitrate, autoplaying preview that appears on hover in grid views. Stored as `video-url` on the Showreel collection.

**Full video / hero video** is the full-length playable version, used in lightbox and on detail pages. Stored as `hero-video`.

**Anamorphic** in this context means non-16:9 ratio. A switch field plus width/height fields on the Showreel collection captures this. Anamorphic versions are shown in lightbox and homepage hero where available; grid views always use 16:9.
