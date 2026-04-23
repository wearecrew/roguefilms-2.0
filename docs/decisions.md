# Decisions log

Running record of architectural and project decisions, with rationale. Append new entries to the top. Each entry is short: the decision, the date, why we made it, and any alternatives considered.

---

## 2026-04-23 · Mobile refinements shipped (v0.14.0), staging to client

**Decision.** Three mobile-only changes, landing as v0.14.0 + page-level CSS:

1. **Homepage work grid collapses to one column at ≤767px.** CSS-only, in Homepage page-level Custom Code. Desktop 1+2 pattern stays; landscape phone (480–767) treated as phone not tablet.
2. **Talent page becomes a 100svh "app frame" on mobile.** Section is `display:flex; flex-direction:column; height:100svh; overflow:hidden`. `TALENT` title + filter pills pinned at the top (flex: 0 0 auto). `.talent_list-wrap` flexes to fill remaining space with `overflow-y:auto`, so the directors list scrolls internally while the page body stays still. `100svh` not `100vh` to avoid iOS Safari URL-bar clipping. Bottom `mask-image` fade makes the list visually merge into the background video. Footer accessible by scrolling past the 100svh section.
3. **Hero video on mobile stops autoplaying — poster + tap-to-open-lightbox instead.** `HeroVideoController` early-branches at `matchMedia('(max-width: 767px)')`: sets `preload='none'`, removes `autoplay`, pauses, hides the mute toggle, binds a capture-phase click on `.hero_media` that reads a new hero-scoped `data-rogue-hero-showreel-url` attribute on the `<video>` and opens the lightbox. Desktop path unchanged.

**Why.**
- Homepage at 393px was a 2-col grid of tiny tiles — hard to see and inconsistent with how Music Videos / Film & TV already collapsed to one column.
- Talent page on mobile had the video at natural height (short) then the directors list below, then an unwanted navy slab filling the remaining viewport before the footer. The 100svh treatment keeps the video dominant while letting the list scroll inside a bounded area.
- Hero mute toggle on mobile was the old `hero_controls` link-block with `href="#"` — the v0.12 cursor-follow pattern can't replicate on touch, so the button was effectively dead. Reverting to the same tap-to-lightbox pattern the grid tiles use gave a consistent mobile UX and unlocked audio (lightbox video plays full-length with audio on).

**One trap we walked into and fixed.** First implementation put `data-rogue-showreel-url` on the hero `<video>`. The sitewide lightbox listener picks up anything with that attribute, so desktop clicks double-fired (mute toggle + lightbox open). Renamed to `data-rogue-hero-showreel-url` — hero-scoped, invisible to the sitewide listener, read only by `HeroVideoController.bindMobileLightboxTrigger()`. Lesson: generic trigger attributes are for generic triggers; specialised controllers get specialised attribute names.

**Webflow Designer constraint worth remembering.** The hero section, `.hero_media`, and the Collection List's non-item wrappers all sit OUTSIDE the CMS iteration scope, so none of them can bind CMS fields natively. The only elements inside the loop are the tile content — video + director link. That's why the hero-showreel-url attribute had to live on the `<video>` (inside the Collection Item, inside an HTML Embed with `{{wf}}` token substitution), not on any outer wrapper.

**Separate deliverables alongside the code:**
- [`docs/qa-pass-2026-04-23.md`](qa-pass-2026-04-23.md) — pre-client-send QA report.
- [`docs/cms-audit-2026-04-23.md`](cms-audit-2026-04-23.md) — 9-collection field audit with deprecation candidates.
- [`code/tests/qa-pass.spec.js`](../code/tests/qa-pass.spec.js) — regenerable QA data-gathering spec.

**Staging now on** `https://roguefilms-staging.webflow.io/` (replaced the longer `roguefilms-bef8a340cdee840701aac49d674b.webflow.io` subdomain). Old URL is a 404.

---

## 2026-04-19 · Phase 3 in flight — lightbox + work-detail architecture

**Decision.** Fetch-and-inject lightbox pattern (not Finsweet Smart Lightbox, not a custom crewjs-modal clone). Standalone `/director-showreels/[slug]` template page is the canonical source. A sitewide `.showreel_lightbox` overlay (with `data-rogue-lightbox*` attributes) sits hidden on every grid page. On tile click, the controller fetches the standalone HTML, extracts `[data-rogue-showreel-content]`, replaces `[data-rogue-lightbox-body]` innerHTML, opens the overlay. In-memory cache per URL.

**Why.**
- v1's crewjs-modal is custom and old; not worth inheriting.
- Smart Lightbox is image-focused; video + rich credits + stills are awkward.
- Fetch-and-inject gives a single source of truth (the standalone template), no duplicated CMS rendering on list pages, and the click UX opens instantly after first-fetch cache.
- Cost: ~50-200ms round-trip on first open per URL; acceptable and cacheable.

**Triggers.** Any element matching `[data-rogue-showreel-url], [data-rogue-showreel-trigger]` on any page. URL resolved via `data-rogue-showreel-url` (if URL-shaped) or the element's `href` (fallback). That means in Webflow, designers just bind the Link Block to the collection page and add a presence-only `data-rogue-showreel-trigger` attribute — no CMS-composed attribute value needed (which Webflow's custom attr UI can't produce anyway).

**Versioning lesson.** jsDelivr's `@0.5` (semver range, no `v` prefix) picks the latest matching tag. `@v0.5` is ambiguous and didn't resolve to the latest v0.5.x for us. Sitewide embed should use `@<major>.<minor>` form. Update the Site Footer script tag when promoting across minor-version boundaries (e.g. `@0.5` → `@0.6` when Phase 6 or 7 ships breaking changes).

**Status at session close.**
- Controller versions: v0.5.0 → v0.5.2 tagged on `@0.5`.
- CMS: `credits` RichText field added to Showreels.
- Standalone template rebuilt in v2 styling with CMS bindings.
- Music Videos page live at `/music-videos` with 75 tiles, 2+3 alternating grid, triggers + lightbox attrs all present.
- One remaining block: Site Footer embed uses `@v0.5` (resolves to 0.5.1 → missing href fallback). One-char edit to `@0.5` unblocks. Documented at top of README.
- Pending: make `.showreel_lightbox` a Webflow Symbol so Homepage / Film & TV / Director pages can reuse without duplication. Playwright suite for lightbox. Finsweet list-filter (director dropdown + search) on Music Videos is optional polish.

---

## 2026-04-18 · Phase 2 shipped — Talent page live with background-swap controller

**Outcome.** [`/talent`](https://roguefilms-staging.webflow.io/talent) is live on the Webflow.io staging subdomain. Controller v0.4.3 served via jsDelivr `@0.4`. 24 directors + 4 rebels detected; filter pills (All / Rogue / Rebel) work; hover swaps to hovered director's video; auto-rotate runs with name highlight; 40% dim overlay; reduced-motion support; canplay-gated fade; poster fallback.

**Iteration history during Phase 2:**
- v0.1 → v0.2 : shell + basic background-swap
- v0.2 → v0.3 : data-attrs on wrapper OR link; rebel-marker via Conditional Visibility (Webflow boolean-to-attribute emits empty — workaround)
- v0.3 → v0.4 : poster layer + canplay-gated fade + safety timeout + rapid-hover race safety
- v0.4.1 : poster URL via hidden native Webflow Image inside Collection Item (custom attrs don't expose image URLs)
- v0.4.2 : `.is-active` applied to both `.talent_item` and descendant `.talent_link`; overlay snippet inside the same HTML Embed
- v0.4.3 : runtime CSS injection for active-state styling so it "just works" without Designer combo-class setup

**Operational lessons, captured for next phases:**
- **jsDelivr @main is throttled during rapid dev.** Purges on rolling refs hit rate limits (~30 min lockout). Switched sitewide embed to `@0.4` semver range — patches auto-pick-up, no Webflow changes per push, no purge dance. Promote to `@0.5` when breaking.
- **Webflow booleans don't emit values through custom-attribute bindings.** Workaround: a conditionally-visible child element (Webflow adds `w-condition-invisible` class when condition is false), controller reads the class.
- **Webflow image fields aren't exposed to custom-attribute bindings.** Workaround: hidden native `<img>` inside the Collection Item with image binding; controller reads `src`.
- **The HTML Embed has its own stacking context.** Overlays/dimmers for video backgrounds must live inside the Embed as a sibling layer, not as a separate Webflow Div Block after it.
- **Boolean-to-data-attribute caveat in the build guide** now formally documented so we don't re-discover it on director page + lightbox.

**Loose ends not shipping with Phase 2:**
- Playwright suite has 12 specs; not all green yet (flaky on the hover race + navigation specs due to timing). Not blocking.
- Slug is `/talent` (swapped from `/talent-v2` once layout stabilised). The formal slug-swap cutover for all v2 pages happens in Phase 7.

---

## 2026-04-18 · Phase 1 complete — Webflow Tokens collection populated (49 variables, 3 modes)

**Outcome.** `Tokens` collection (`collection-d1ebecc4-8a57-3cd3-4515-853ab0874009`) now contains 49 variables across three modes:

- 13 colour (5 primitives + 8 semantics), semantics reference primitives via `existing_variable_id`; `color/border/subtle` stores `rgba(241,242,235,0.3)` as `custom_value`.
- 2 font family, 3 weight, 3 line-height.
- 9 type-size with distinct per-mode values for Mobile/Tablet/Desktop (8 tokens with real variation, `body-xl` stable at 1.25rem).
- 10 spacing tokens, same value across all modes (structural consistency).
- 1 radius, 5 breakpoint, 3 motion duration.
- 3 motion easings intentionally NOT in Webflow — Webflow Size variables reject `cubic-bezier()`. Easings stay in `tokens.json` for Figma; they'll land as CSS custom properties in site-wide custom code in Phase 2.

**Mode behaviour confirmed.** Creating a variable with a single `static_value` in a multi-mode collection auto-propagates that value to every mode (Mobile/Tablet/Desktop). Subsequent `update_size_variable` with a specific `mode_id` overrides only that mode; unupdated modes continue to show the default. This is what Dan anticipated (Q1 resolved). Verified by inspecting `type-size/display-xl` with `include_all_modes: true` — Mobile carries the propagated 3.5rem default, Tablet shows the 4.5rem update, Desktop shows 7.5rem.

**Implementation shape (record for future sessions).**

1. Add modes to collection via `create_variable_mode` (3 calls).
2. Create primitives and non-reference tokens with single `static_value` (1 batched call, 32 vars).
3. Create semantic colours with `existing_variable_id` referencing primitives; create multi-mode size variables with the Mobile value as the default (1 batched call, 17 vars).
4. `update_size_variable` per (variable × mode) for Tablet and Desktop of the 8 type-size tokens that vary (1 batched call, 16 updates).

Total: 4 MCP calls. All aliases hold across modes (verified).

**What's left for Phase 2 setup.**

- Dan to import `docs/tokens.json` via Crew Token Bridge plugin (DTCG format). Produces 9 separate Figma collections.
- Site Settings → Custom Code → Head: drop in the three motion-easing CSS custom properties plus the `<script src>` tag for the video controller.

---

## 2026-04-18 · Crew Token Bridge plugin format: DTCG, not the hybrid in the brief

**Finding (after reading the plugin source at `reference/crew-token-bridge/`).** The plugin supports two formats, both nested-object: **Style Dictionary** (`{ "color": { "navy": { "value": "#00162c", "type": "color" } } }`) and **W3C DTCG** (`{ "color": { "navy": { "$value": "#00162c", "$type": "color" } } }`). Detection is by presence of a `$value` anywhere in the tree.

**Neither format matches the `{ options, groups: [{ name, tokens: [...] }] }` shape the earlier brief described** — that shape isn't parsed at all. When supplied, the plugin falls back to Style Dictionary detection (no `$value` markers), walks the entire object tree, and treats top-level keys as collections. That's why the previous imports produced a single "groups" collection with numeric array-index paths.

**Decision.** Use **W3C DTCG format** for `tokens.json`. DTCG is the only option of the two that supports multi-mode tokens — `$values: { Mobile, Tablet, Desktop }` with `$modes` at a parent group. Style Dictionary format is single-value only.

**Structural consequences**:
- No `options` wrapper. No `groups` array. Top-level JSON keys are collection names directly.
- `separateCollections: true` is a UI toggle, not a JSON field. Stays on by default.
- Variable names in Figma will include the top-level key as a prefix (e.g. `color/primitive/navy` appears inside the Color collection). Slightly redundant but Figma renders slashes as folder hierarchy, so the UI reads fine.
- Group-level `$type` and `$modes` propagate to descendant tokens unless overridden.
- Motion easings use `$type: "cubicBezier"` → STRING; durations use `$type: "duration"` → FLOAT.

**Action.** `docs/tokens-test.json` rewritten in DTCG format for a fresh test-import. Once that produces the expected 3 separate collections (Color, Type Family, Type Size — with Mobile/Tablet/Desktop modes on Type Size), the full `docs/tokens.json` follows in the same shape.

---

## 2026-04-18 · Phase 1 reset. Token implementation restarted with three-mode responsive variables and no clamp()

**Decision.** Abandon the first Phase 1 token implementation. Clean the Webflow `Tokens` collection and restart with:
- **Three explicit modes** on responsive token collections (Mobile / Tablet / Desktop), not `clamp()` formulas inside a single-mode collection. Figma and Webflow hold three discrete values per responsive token.
- **Scale-based, three-tier naming** (primitive → semantic → component) instead of the mixed situational/generic scheme. Consistent token scale (`display-xl`, `display-lg`, `body-md`, etc.) for typography. Pixel-named spacing kept (`space/8`, `space/16`) but expressed per-mode.
- **Test-import first**: ship a 3-token `docs/tokens-test.json` to validate the Crew Token Bridge plugin parser before committing to the full `tokens.json`. Earlier imports produced a broken "groups" collection rather than per-category collections — the full spec doesn't re-run until the plugin proves it can parse the format.
- **Motion easings stay as CSS custom properties** (not Webflow Variables), to be added in Site Settings → Custom Code → Head when Phase 2 lands. Webflow's Size variable type rejects `cubic-bezier()`.

**Why.** Three fundamental problems surfaced during implementation review: (a) the Crew Token Bridge plugin collapsed the import into a single `groups` collection with numeric placeholder names instead of splitting by category, invalidating the Figma side; (b) Webflow Variables receiving `clamp()` values feel like lossy translation of what should be a three-mode system — designers want discrete Mobile/Tablet/Desktop values they can see and override per breakpoint, not a single opaque formula; (c) the naming was inconsistent — some tokens named by the single page role they served (`page-title`, `thumbnail-title`), others by raw value (`spacing/20`), with no coherent scale underneath.

**Alternatives considered.**
- Keep the clamp() approach and ship as-is. Rejected: clamp() doesn't give design the ability to deviate per breakpoint for a single token; it bakes interpolation into the variable. Designers can't see the tablet value they're working against.
- Keep situational naming. Rejected: names like `thumbnail-title` over-scope tokens to one use and break down when a future component needs the same size for a different purpose.
- Mixed semantic + t-shirt scale for spacing. Rejected in favour of px-named spacing, since the Figma spacing values are a short, specific set (8, 10, 15, 16, 20, 24, 32, 40, 80, 120) that doesn't map cleanly to a t-shirt scale — naming by px is honest and non-boxing.

**Cost of the reset.** ~4 hours of spec writing and MCP operations written off, plus one round of Figma re-import for Dan. Mitigated by doing a small test import before the full run this time.

---

## 2026-04-18 · Video controller hosted via jsDelivr from GitHub, not Webflow inline

**Decision.** The video controller JS lives at `/code/video-controller.js` in the `wearecrew/roguefilms-2.0` repo. It's served to the live site via jsDelivr's CDN (`https://cdn.jsdelivr.net/gh/wearecrew/roguefilms-2.0@main/code/video-controller.js`). Webflow's Site Settings > Custom Code > Footer carries a single `<script src="...">` tag pointing to this URL.

**Why.** Version control, easier iteration, no Webflow inline size limits, and jsDelivr is free and CDN-backed. The alternative (embedding directly in Webflow's custom code panel) was considered but rejected now that a repo exists.

**Trade-off.** A designer can no longer edit the controller code inside the Webflow Designer. But realistically, this code is dev-owned and a designer wouldn't touch it anyway. The single-line Webflow embed remains designer-visible and a designer can still swap in a different version tag if ever needed.

---

## 2026-04-18 · Build new pages alongside old, slug-swap at launch

**Decision.** Every new page is built as a brand-new Webflow page with a temporary slug (e.g. `home-v2`, `talent-v2`, `music-video`, `film-tv`). v1 pages stay in the Designer untouched. At launch, we swap slugs.

**Why.** Side-by-side visual comparison during the build. Safe rollback. No risk of half-built pages being exposed. The `Work - wf native` draft in the duplicated site suggests this was already being informally used.

**Alternatives considered.** Modifying existing pages in place (rejected: destroys reference context). Using Webflow's draft mode on existing pages (rejected: still risks destroying v1 layout).

---

## 2026-04-18 · Talent page is text-led, not a video grid

**Decision.** Based on Figma walkthrough, the Talent page is a list of director names in three columns over a single full-bleed background video. Hovering a name swaps the background video to that director's reel. The page runs one active video and one preloaded "next" video at any time, with auto-rotate when no hover is active.

**Why.** This is what the Figma shows, full stop. It's also dramatically better for performance than a grid of 24 simultaneously playing video tiles. Closely follows the Imperial.tv pattern Dan shared.

**Impact on plan.** Video controller needs multiple modes, not one: "background swap" for Talent, "grid hover" for Homepage/category pages/director archive, "lightbox" for work detail. Phase 2 scope updated to reflect this.

---

## 2026-04-18 · CMS stays intact, changes are additive only

**Decision.** Do not delete or rename any existing CMS fields. Any new field (e.g. `director-current` for the director page Current/Archive filter) is added as a new field. Deprecated fields get their help text updated with a `[DEPRECATED]` prefix and a note pointing to the replacement.

**Why.** 700+ Showreel items depend on current schema. Destructive changes risk data loss and break live v1 while v2 is in development. The CMS is already populated because v2 was duplicated from v1; we inherit all the content and just bind new pages to it.

---

## 2026-04-18 · Vimeo plan is Pro, HLS available

**Decision.** Use HLS for the Talent page background video (adaptive bitrate, critical for a single visible video that swaps). Progressive MP4 stays for the grid hover loops (simpler, adequate for short loops).

**Why.** Rogue's Vimeo plan is Pro, which includes HLS manifests via the Player API. HLS gives us proper adaptive quality without client-side rendition selection logic.

---

## 2026-04-18 · Top-level `Work` page dropped, `work-type` field preserved

**Decision.** No top-level `/work` IA entry in v2. The new nav is `TALENT / FILM & TV / MUSIC VIDEO / ABOUT`. The `work-type` reference field on the Showreel collection stays in the CMS because it's what filters Showreels into the new category pages.

**Why.** Figma walkthrough confirmed the IA change. Preserving the field is non-destructive and functionally required.

---

## 2026-04-18 · News section rebuilt as Finsweet CMS Slider

**Decision.** The Homepage news section moves from a vertical list (v1) to a horizontal Finsweet CMS Slider component (v2).

**Why.** Matches the Figma design. Finsweet Slider handles the pattern natively, no custom JS needed. Stays within the Webflow-first, attribute-driven principle.
