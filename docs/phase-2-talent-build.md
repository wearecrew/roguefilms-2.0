# Phase 2 · Talent page build guide

Step-by-step guide for finishing the Talent v2 page in the Webflow Designer.

- **Page**: Talent v2 (`/talent-v2`)
- **Page ID**: `69e3c6792fffaea7766fd272`
- **Site ID**: `69dcac21fd295013e4344d52`
- **Designer URL**: open the Roguefilms 2.0 site and navigate to the Talent v2 page.

---

## Page goal

A single full-bleed background video plays behind the page. Director names are listed in three columns (desktop) or stacked (mobile) on top of the video. Hovering a name swaps the background to that director's rollover loop. When no director is hovered, the controller auto-rotates through the filtered list every 6 seconds. Filter pills (All / Rogue / Rebel / Reset) filter the list via `is-a-rebel`. Clicking a name navigates to the director detail page.

Reference: Imperial.tv. Canonical source: Figma frame `2:623` (desktop) + `162:3948` (mobile).

---

## DOM contract

The video controller reads these data-attributes — they MUST match exactly or the controller won't activate:

```
section [data-rogue-talent]
  video [data-rogue-talent-bg="active"]    muted, loop, playsinline
  video [data-rogue-talent-bg="preload"]   muted, loop, playsinline
  button [data-rogue-talent-filter="all"]
  button [data-rogue-talent-filter="rogue"]
  button [data-rogue-talent-filter="rebel"]
  button [data-rogue-talent-filter="reset"]
  a [data-rogue-director]=slug [data-rogue-video-url]=url [data-rogue-is-rebel]=bool
    (one per director from the Collection List)
```

Webflow's "custom attributes" feature (on each element's settings panel) is how data-attributes go in. For CMS-bound attributes, use the "Get value from" option on the custom attribute.

---

## Element tree (what to build)

Using Finsweet Client First naming. Tokens referenced by their Webflow Variable names (e.g. `color/surface/page`).

> **Two things that trip people up**:
>
> 1. **`data-rogue-talent` is a presence-only attribute.** The controller runs `querySelector('[data-rogue-talent]')` — it doesn't care about the value. Webflow's Custom Attributes UI requires a value field though; just put `"talent"` or any placeholder.
>
> 2. **Don't use Webflow's Video or Background Video elements for the background.** Webflow's Background Video wraps the `<video>` in its own markup and sets `src` at design-time — fights the controller's runtime `src` swap. Webflow's Video element renders an iframe (wrong tag entirely). Use an **HTML Embed** with raw `<video>` tags (snippet below).

```
body.page-talent
  (nav — already exists, re-use the Navigation component instance)

  Section                       class: section_talent
    data-rogue-talent = "talent"      ← value is arbitrary, just needs to be present
    background-color: color/surface/inverse (primitive/black) — talent page only
    position: relative, min-height: 100vh

    Div Block                   class: talent_bg
      position: absolute, inset: 0, overflow: hidden, z-index: 0
      → background-color: color/primitive/black (fallback behind videos)

      HTML Embed                   (put both <video> tags in one Embed)
      ┌────────────────────────────────────────────────────────────────┐
      │ <video data-rogue-talent-bg="active"                           │
      │        class="talent_bg-video is-active"                       │
      │        muted loop playsinline preload="auto"></video>          │
      │                                                                │
      │ <video data-rogue-talent-bg="preload"                          │
      │        class="talent_bg-video is-preload"                      │
      │        muted loop playsinline preload="auto"></video>          │
      │                                                                │
      │ <style>                                                        │
      │   .talent_bg-video {                                           │
      │     position: absolute; inset: 0;                              │
      │     width: 100%; height: 100%;                                 │
      │     object-fit: cover;                                         │
      │     transition: opacity var(--motion-duration-normal, 300ms)   │
      │                         var(--motion-easing-standard,           │
      │                             cubic-bezier(0.4, 0, 0.2, 1));     │
      │   }                                                            │
      │   .talent_bg-video.is-active  { opacity: 1; }                  │
      │   .talent_bg-video.is-preload { opacity: 0; }                  │
      │ </style>                                                       │
      └────────────────────────────────────────────────────────────────┘
      (no src= on either video — the controller sets it on init and swap)

      Div Block                 class: talent_bg-dim
        position: absolute, inset: 0, pointer-events: none
        background: rgba(0,0,0,0.35)   (dims the video for text legibility)

    Div Block                   class: talent_content
      position: relative, z-index: 1
      padding: spacing/80 spacing/40 (desktop) / spacing/40 spacing/20 (mobile)

      Heading 1                 class: talent_title
        text: "Talent"
        font: type-family/headline, type-size/display-xl,
              weight type-weight/extra-bold, line-height tight, uppercase
        color: color/text/primary
        text-align: center

      Div Block                 class: talent_filters
        display: flex, gap spacing/8, justify-content: center
        margin-block: spacing/40

        Button                  class: filter-pill
          text: "All"
          custom attr: data-rogue-talent-filter="all"
          styles: see "Filter pill styling" below

        Button                  class: filter-pill
          text: "Rogue"
          custom attr: data-rogue-talent-filter="rogue"

        Button                  class: filter-pill
          text: "Rebel"
          custom attr: data-rogue-talent-filter="rebel"

        Button                  class: filter-pill is-reset
          text: "Reset"
          custom attr: data-rogue-talent-filter="reset"

      Collection List Wrapper   class: talent_list-wrap
        collection: Directors rosters
        filter: remove-from-director-list is NOT true
        sort: display-order ascending, then name ascending
        items per page: 100 (should cover all directors)

        Collection List         class: talent_list
          display: grid, grid-template-columns: repeat(3, 1fr) (desktop),
                  repeat(1, 1fr) (mobile), column-gap spacing/40, row-gap spacing/24

          Collection Item       class: talent_list-item

            Link Block          class: director-name
              link: current director (page → Directors roster template)
              custom attrs:
                data-rogue-director         = current director.slug
                data-rogue-video-url        = current director.hero-showreel.video-url
                data-rogue-is-rebel         = current director.is-a-rebel (as string "true"/"false")

              Text Block        class: director-name_text
                text: current director.name
                font: type-family/body Bold, type-size/body-xl (20px stable),
                      line-height tight, uppercase
                color: color/text/primary
                transition: color var(--motion-duration-fast) var(--motion-easing-standard)

              /* Active state (when controller adds .is-active class to the link): */
              &.is-active .director-name_text { color: color/text/accent; }

              /* Hover state: */
              &:hover .director-name_text { color: color/text/accent; }

  (footer — reuse the Footer component instance)
```

---

## Filter pill styling

Applied to `.filter-pill`:
- Display: inline-flex, align: center
- Padding: spacing/16 (all sides)
- Border-radius: radius/pill (100px)
- Border: 1px solid color/border/subtle
- Background: transparent
- Color: color/text/primary
- Font: type-family/body Regular, type-size/body-md, line-height loose, uppercase
- Cursor: pointer
- Transition: border-color var(--motion-duration-fast), color var(--motion-duration-fast)

Active state (`.is-active` class, added by controller):
- Border-color: color/text/accent
- Color: color/text/accent

Hover:
- Border-color: color/text/accent

Note: the reset pill (`is-reset` combo) doesn't take the active state — it's a single-tap "clear filter" action.

---

## Custom attribute mapping (Webflow UI)

For each element where a `data-*` attribute is needed, go to the element's settings panel → *Element settings* → *Custom attributes*.

For the Collection List items (dynamic attributes), toggle *Get value from* and select the CMS field:

| Element | Attribute name | Value source |
|---|---|---|
| Section | `data-rogue-talent` | (static, empty value) |
| Active video | `data-rogue-talent-bg` | static: `active` |
| Preload video | `data-rogue-talent-bg` | static: `preload` |
| Filter pill #1 | `data-rogue-talent-filter` | static: `all` |
| Filter pill #2 | `data-rogue-talent-filter` | static: `rogue` |
| Filter pill #3 | `data-rogue-talent-filter` | static: `rebel` |
| Filter pill #4 | `data-rogue-talent-filter` | static: `reset` |
| Director link | `data-rogue-director` | CMS: Current Director → Slug |
| Director link | `data-rogue-video-url` | CMS: Current Director → Hero showreel → Rollover Video Url |
| Director link | `data-rogue-is-rebel` | CMS: Current Director → Is a Rebel (boolean) |

**Note on the boolean attribute**: Webflow renders boolean CMS fields as `true` / `false` strings when used as attribute values, which is exactly what the controller expects. If the field is empty/unset, it renders as empty string — the controller treats that as `false`.

---

## Collection List filter + sort

In the Collection List Wrapper settings:

- **Filter**: *Remove from director list* is not set (excludes hidden directors).
- **Sort**: *Display order* ascending, then *Name* ascending (alphabetical tiebreaker).
- **Limit**: 100.

This ensures the auto-rotate walks directors in a predictable order matching the on-screen layout.

---

## Per-page custom code

Open Talent v2 page settings → Custom code → Footer. Paste the contents of [`code/init/talent-page.html`](../code/init/talent-page.html):

```html
<script>
  document.addEventListener('DOMContentLoaded', function () {
    if (window.RogueFilms && window.RogueFilms.initTalentPage) {
      window.RogueFilms.initTalentPage({
        autoRotateMs: 6000,
        crossfadeMs: 300
      });
    } else {
      console.warn('[RogueFilms] video-controller.js not loaded');
    }
  });
</script>
```

The sitewide `<script src>` that loads `video-controller.js` goes into Site Settings → Custom Code → Footer. See [`code/init/site-footer.html`](../code/init/site-footer.html).

---

## Accessibility notes

- Filter pills use `<button>` elements (not styled links) so keyboard / screen-reader users treat them as actions.
- Active director link gets the `.is-active` class, which paints pink. For screen readers, the active state isn't strictly necessary since the user isn't navigating it — it's a visual cue for the background video.
- `prefers-reduced-motion` disables auto-rotate and crossfade automatically.
- `playsinline` + `muted` on the videos meets mobile Safari's autoplay requirements without sound.

---

## Mobile adjustments

Per the Figma mobile canvas (402px):

- Page padding drops to `spacing/20` (20px horizontal).
- Talent list collapses to 1 column.
- Filter pill row stays centred with `spacing/8` gaps.
- Hero title stays `type-size/display-xl` (scales from 56 → 120 via the three-mode token).

All covered by the responsive token modes — no extra per-breakpoint CSS needed inside the components themselves. At smaller viewports, Webflow's breakpoint system picks the right mode values.

---

## Verification checklist (before Playwright)

1. Open `/talent-v2` in a browser — page renders, no console errors.
2. Background video starts playing on page load (first director's rollover loop).
3. Hovering a director name: background video swaps (with crossfade). Name turns pink.
4. Un-hovering: auto-rotate resumes after a brief moment.
5. Filter to "Rogue": only non-rebel directors show.
6. Filter to "Rebel": only rebel directors show.
7. Click "Reset": back to all directors.
8. `prefers-reduced-motion` enabled in OS settings: no auto-rotate, hover swaps instantly (no crossfade).
9. Tab away to another tab for 10 seconds, come back: auto-rotate has paused and resumes.
10. Mobile: tapping a director name navigates to the director detail page.
