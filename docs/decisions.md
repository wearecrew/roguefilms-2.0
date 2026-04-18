# Decisions log

Running record of architectural and project decisions, with rationale. Append new entries to the top. Each entry is short: the decision, the date, why we made it, and any alternatives considered.

---

## 2026-04-18 · Crew Token Bridge plugin parser doesn't match documented JSON schema

**Observation.** Test-importing a minimal 3-token JSON in the documented Crew Token Bridge format (`{ options: {}, groups: [{ name, tokens: [...] }] }`) produced a broken result:

- A single collection named "groups" was created (the plugin treated the top-level `groups` key as a collection name).
- Variables were named by their numeric array index (`0`) rather than by the `path` field.
- Variable paths were constructed by walking the JSON tree: `groups / 0 / tokens / 0` for the first colour, `groups / 2 / tokens / 0` for the font.
- The multi-mode group (index 1, `type-size`) was silently dropped — likely the `modes` + `values` structure wasn't recognised.
- `value` content parsed correctly (hex and string values rendered as expected); only the schema interpretation failed.

**Implication.** The plugin walks the JSON as a generic nested-object tree rather than parsing the documented `groups` / `name` / `tokens` / `path` schema. The parser appears to expect a shape more like DTCG (`{ color: { navy: { value: "#..." } } }`) or Style Dictionary nested objects, where top-level keys become collections and nested keys become variable path segments.

**Decision.** Halt token import work until the plugin source (`ui.html`, `code.js`) is shared so the actual parser can be inspected. Speculating on the format is wasteful — three iterations of format-guessing is worse than one iteration of reading the source.

**Action.** Dan to drop plugin source into `reference/crew-token-bridge/` in the repo, or paste the `importTokens` / `parseJSON` handler inline. Spec + Webflow implementation are paused on this.

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
