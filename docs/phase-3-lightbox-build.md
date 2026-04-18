# Phase 3 · Work-detail page + lightbox build guide

Two Webflow targets, one layout, one controller.

- **Standalone page** — rebuild the `/director-showreels/[slug]` Template page in v2 styling. Server-rendered, shareable URL, full page. Canonical source.
- **Sitewide lightbox overlay** — hidden overlay shared across every page with grid tiles. On tile click, the controller fetches the standalone page HTML and injects its main content into the overlay.

The Webflow layout is **literally the same element tree** in both places. Build it on the standalone page first. Copy-paste that section into the lightbox overlay body as the placeholder shell.

---

## References

- Static HTML mockup: [`code/mockup/work-detail.html`](../code/mockup/work-detail.html) — open in a browser to preview the layout. All class names and data-attributes in the mockup mirror what the Webflow build should have.
- Figma source: desktop frame `2:1674`, mobile frame `162:3879` in the [Rogue 2026 file](https://www.figma.com/design/BuVndAwQ1zQKACDJFswneK/Rogue-Website-2026-updates).
- Controller: [`code/video-controller.js`](../code/video-controller.js) v0.5.0+ exposes `window.RogueFilms.initLightbox()` (auto-inits if a `[data-rogue-lightbox]` overlay is on the page).

---

## Attribute contract

The controller reads these. Don't rename.

### On grid tiles (triggers — Phase 4/5/6 list pages)

| Attribute | On element | Source | Purpose |
|---|---|---|---|
| `data-rogue-showreel-url` | Each tile's link block | Canonical path, e.g. `/director-showreels/{{slug}}` | The controller intercepts clicks and fetches this URL |
| `href` | Same element | Same canonical path | Fallback — if JS fails or user ctrl/cmd-clicks, navigates normally |

Tiles can live on any page. The controller uses a global click delegate to catch all of them.

### On the sitewide lightbox overlay (add once, reused everywhere)

| Attribute | On element | Purpose |
|---|---|---|
| `data-rogue-lightbox` | Outer overlay container (e.g. a site-wide Div Block placed inside the body) | Marks this element as the lightbox overlay; controller activates when present |
| `role="dialog"` | Same | A11y |
| `aria-modal="true"` | Same | A11y |
| `aria-hidden="true"` | Same (default state) | Controller toggles to `false` when open |
| `data-rogue-lightbox-backdrop` | Interactive backdrop div (full-size, positioned absolute inside the overlay, behind content) | Click closes the lightbox |
| `data-rogue-lightbox-close` | Close button | Click closes |
| `data-rogue-lightbox-prev` | Previous button | Click navigates to previous trigger |
| `data-rogue-lightbox-next` | Next button | Click navigates to next trigger |
| `data-rogue-lightbox-body` | Inner container that holds the showreel content | Controller replaces this element's innerHTML when opening |

### On the showreel content (both places — standalone page + lightbox body shell)

| Attribute | On element | Purpose |
|---|---|---|
| `data-rogue-showreel-content` | The outer wrapper of the showreel layout | Controller fetches the standalone page and extracts the innerHTML of this element |
| `data-rogue-showreel-back` | Back pill (`<a>` or `<button>`) | In the lightbox, click closes the overlay. On the standalone page, `href="javascript:history.back()"` works as-is. |
| `data-rogue-showreel-prev` | Prev arrow button (desktop) | Optional; reserved for standalone-page archive navigation (Phase 6). Currently no-op. |
| `data-rogue-showreel-next` | Next arrow button (desktop) | Optional; same as above |
| `data-rogue-showreel-frame` | Video frame container | Controller reads `data-video-width` / `data-video-height` and sets `aspect-ratio` |
| `data-video-width` | Same element | CMS bind to `video-width` (Number field on Showreels); fallback 16 |
| `data-video-height` | Same element | CMS bind to `video-height`; fallback 9 |
| `data-rogue-showreel-poster` | Poster `<img>` inside the frame | CMS bind src to `preview-image` |
| `data-rogue-showreel-video` | The `<video>` element | CMS bind src to `hero-video` (full-length) |
| `data-rogue-showreel-title` | Title heading | Static attr, no JS use — descriptive hook |
| `data-rogue-showreel-director` | Director link | Same — descriptive |
| `data-rogue-showreel-copy-link` | Copy-share-link button | **Click handler**: controller copies the URL to clipboard (from this element's `data-rogue-showreel-url` attr if present, else falls back to the canonical URL the lightbox is currently showing) |
| `data-rogue-showreel-url` | On the copy-link button | Absolute or relative URL to copy. Bind to canonical path `/director-showreels/{{slug}}` |
| `data-rogue-showreel-stills` | Stills wrapper | Descriptive hook |
| `data-rogue-showreel-credits` | Credits body wrapper | Descriptive hook |

### CMS bindings required (on the standalone page)

| Element | CMS field |
|---|---|
| Title text | `{{brand}} • {{title}}` (concatenated with bullet separator; use a Text Block with two CMS text spans and a hardcoded ` • ` between, or use a single CMS text field containing the combined string if easier) |
| Director link href | `/directors-roster/{{current-showreel.director.slug}}` |
| Director link text | `{{current-showreel.director.name}}` |
| Video frame `data-video-width` | `{{video-width}}` (set via custom attribute, fallback 1920) |
| Video frame `data-video-height` | `{{video-height}}` (fallback 1080) |
| Poster img src | `{{preview-image}}` (native Webflow image binding) |
| Video element src | `{{hero-video}}` (via custom attribute → value source → Link field) |
| Copy-link `data-rogue-showreel-url` | `/director-showreels/{{slug}}` (custom attribute binding) |
| Stills | Collection List nested inside the stills wrapper, bound to the multi-image field (or use the CMS repeater pattern for `project-stills`) |
| Credits | Rich Text element bound to the new `credits` field |

---

## Standalone page build

Page: `Director showreel` Collection Template page (already exists in Webflow as `/director-showreels/[slug]`). Rebuild its content per the mockup.

### Step-by-step

1. **Open the Director showreel template page** in the Webflow Designer.
2. **Delete the existing content block** (we're rebuilding fresh in v2 styling). Keep the page chrome (nav + footer).
3. **Add a Main element** (or Section) wrapping everything you're about to build. Give it:
   - Class: `showreel_layout`
   - Custom attribute: `data-rogue-showreel-content` (value: any placeholder, e.g. `showreel`)
4. **Build the structure** per the mockup (`code/mockup/work-detail.html`). Every class name and data-attribute in the mockup is what the Designer should produce.
5. **CMS-bind** the fields per the table above.
6. **Publish.**

### Notes

- The aspect-ratio of the video frame needs to come from CMS. Webflow may not let you bind a `style` attribute directly. Workaround: use two custom attributes `data-video-width` and `data-video-height` bound to the Number fields, and let the controller set `aspect-ratio` at runtime via the auto-init code in v0.5.0.
- If the `credits` field is empty on a particular showreel, hide the credits block via Conditional Visibility so the layout doesn't render an empty container.

---

## Sitewide lightbox overlay build

One-time sitewide build. Can live in the body's last child — just before the `</body>` close. Reused across every page; the controller activates it automatically.

### Step-by-step

1. **At the Webflow site level** (or on a shared Component / Symbol used on every page), add a Div Block at the bottom of the body.
2. Give it:
   - Class: `lightbox`
   - Custom attributes:
     - `data-rogue-lightbox` (value: any placeholder)
     - `role` = `dialog`
     - `aria-modal` = `true`
     - `aria-hidden` = `true`
3. Inside, add:
   - A backdrop Div Block — class `lightbox_backdrop`, custom attr `data-rogue-lightbox-backdrop`.
   - A button — class `lightbox_close`, text "Close", custom attrs `data-rogue-lightbox-close`, `aria-label="Close"`.
   - A button — class `lightbox_prev`, text "‹" (or SVG arrow), custom attrs `data-rogue-lightbox-prev`, `aria-label="Previous"`.
   - A button — class `lightbox_next`, text "›" (or SVG arrow), custom attrs `data-rogue-lightbox-next`, `aria-label="Next"`.
   - A body container — class `lightbox_body`, custom attr `data-rogue-lightbox-body`.
4. **Inside the body container**, paste the entire showreel layout element tree that you built for the standalone page. It acts as the placeholder shell — the controller replaces it on open.
5. The controller auto-inits on any page where this overlay exists. No per-page init script needed.

### Styling

The controller injects minimum positioning CSS (fixed, full-viewport, hidden by default, `is-open` class toggles visible). You can style the overlay further in Webflow — positioning of close/prev/next buttons, button appearance etc. Recommended:

- Close button: top-right, 48px circular, cream outline — same spec as the standalone page's prev/next arrows.
- Prev / next: absolutely positioned left / right of the video frame area. Desktop only; hide on mobile (`@media (max-width: 767px) { ... { display: none } }`).

---

## Per-page init

**Nothing needed per-page.** The controller auto-inits the lightbox when it finds the overlay element on the page. Tiles are picked up via a global click delegate.

Each grid tile just needs:
- `data-rogue-showreel-url="/director-showreels/{{slug}}"` custom attribute
- `href="/director-showreels/{{slug}}"` on the Link Block (fallback)

When you build Phase 4 Homepage, Phase 5 Music Video / Film & TV, and Phase 6 Director page, each tile uses the same trigger attributes and everything "just works" because the sitewide overlay + controller are already in place.

---

## Testing the lightbox before Phase 4 ships

The Talent page has director-name links, not showreel tiles, so it can't directly test the lightbox. Options:

- **(a) Add a temporary test page** with a Collection List of Showreels rendering simple tiles with `data-rogue-showreel-url`. Easy smoke-test.
- **(b) Navigate to the standalone page directly** to verify the layout + CMS bindings look right, before the lightbox integration gets tested in Phase 4.

Recommend (b) first for layout/CMS correctness, then (a) for lightbox interactions before Phase 4.

---

## Open questions

Defaults in brackets; flag if you disagree.

1. **Back pill on standalone page** — `href="javascript:history.back()"` assumes user came from a list page. If someone lands on the URL cold (bookmarked/shared), history.back() goes to the previous tab. Alternative: always link back to `/directors-roster/{{director.slug}}` so the fallback is meaningful. **[default: director archive link]**
2. **Prev/next on standalone page** — defer to Phase 6 when director archive exists. For now, **[default: hide the prev/next buttons on the standalone page; they're lightbox-only]**.
3. **Copy-link on mobile** — pill alignment and placement is the same but feedback "Copied!" swap may overlap narrow layouts. **[default: keep identical]**.
4. **Video autoplay in lightbox** — currently `<video controls poster>` stays paused; user clicks to play. Alternative: auto-play (muted) on lightbox open. **[default: manual play]**.
5. **Anamorphic — does the lightbox frame resize vertically based on ratio, or always fill 16:9 and letterbox?** Controller currently sets `aspect-ratio` on the frame, so the frame shrinks vertically for wider ratios. **[default: keep frame width fixed, shrink height]**.

---

## Change log

- **2026-04-19**: initial build guide for Phase 3. Static mockup at `code/mockup/work-detail.html`. Controller v0.5.0 adds `initLightbox()` + auto-init. CMS `credits` RichText field added to the Director showreels collection.
