# Technical architecture

How the custom code layer is structured, where it lives, and how Webflow embeds it.

---

## Stack at a glance

- **Designer + CMS**: Webflow.
- **Video host**: Vimeo Pro (HLS available; progressive MP4 used for short rollover loops).
- **Custom JS**: Plain ES2015+, served from GitHub via jsDelivr CDN.
- **Tests**: Playwright for browser behaviour, Node script for Vimeo URL health, Lighthouse CI for performance (all under `code/tests/`).

---

## Where custom code lives

```
repo/
  code/
    video-controller.js    ← sitewide module (CSS + namespace + page controllers)
    init/
      site-footer.html     ← one-line <script src> tag, paste into Site Settings
      talent-page.html     ← per-page init, paste into Talent page settings
    tests/                 ← Playwright suites (Phase 2+)
  docs/
    technical-architecture.md
```

- **`code/video-controller.js`** is the single sitewide module. Served from the repo via jsDelivr:
  `https://cdn.jsdelivr.net/gh/wearecrew/roguefilms-2.0@main/code/video-controller.js`
  (swap `@main` for `@v1.0` or similar once we pin for production stability).

- **`code/init/site-footer.html`** is the exact snippet that goes into Webflow's *Site Settings → Custom Code → Footer*. One `<script src>` tag plus a comment. Kept in the repo so the embed is source-controlled.

- **`code/init/talent-page.html`** is the exact snippet for the Talent page's per-page custom code. Calls `window.RogueFilms.initTalentPage({...})` on DOMContentLoaded.

Per-page scripts stay small (just init calls with optional config). All the logic lives in the one sitewide module, so iteration happens via repo commits and jsDelivr picks up automatically.

---

## Runtime structure

`video-controller.js` does three things at load:

1. **Inject runtime CSS.** A `<style id="rogue-runtime-tokens">` block is appended to `<head>` with `:root` custom properties for motion easings and durations:
   ```css
   :root {
     --motion-easing-standard: cubic-bezier(0.4, 0, 0.2, 1);
     --motion-easing-in: cubic-bezier(0.4, 0, 1, 1);
     --motion-easing-out: cubic-bezier(0, 0, 0.2, 1);
     --motion-duration-fast: 150ms;
     --motion-duration-normal: 300ms;
     --motion-duration-slow: 500ms;
   }
   ```
   These complement the Webflow-generated Variables (`--_tokens---*`) — they're the ones designers and the controller use in transitions.

2. **Expose `window.RogueFilms` namespace.** Exports init methods for each page controller:
   - `initTalentPage(options)` — Phase 2, background-swap controller.
   - `initLightbox(options)` — Phase 3 (planned).
   - `initGridPage(options)` — Phase 4 (planned).

3. **Stay idle.** No DOM mutation or side-effects until a per-page init script calls into the namespace.

---

## Phase 2: talent-page controller

### DOM contract

The controller reads the following attributes from Webflow-rendered markup:

```html
<section data-rogue-talent>
  <video data-rogue-talent-bg="active"  muted loop playsinline></video>
  <video data-rogue-talent-bg="preload" muted loop playsinline></video>

  <button data-rogue-talent-filter="all">All</button>
  <button data-rogue-talent-filter="rogue">Rogue</button>
  <button data-rogue-talent-filter="rebel">Rebel</button>
  <button data-rogue-talent-filter="reset">Reset</button>

  <a href="/directors-roster/joe-connor"
     data-rogue-director="joe-connor"
     data-rogue-video-url="https://player.vimeo.com/....mp4"
     data-rogue-is-rebel="false">
    Joe Connor
  </a>
  <!-- more director names, rendered from the Webflow CMS Collection List -->
</section>
```

Webflow Designer binds the Directors rosters collection to the `<a>` elements and populates:
- `data-rogue-director` ← director slug
- `data-rogue-video-url` ← hero-showreel → video-url (the rollover loop)
- `data-rogue-is-rebel` ← director `is-a-rebel` boolean

The `<video>` elements are static — two plain placeholders that the controller swaps sources between.

### State machine

```
┌──────────── initial ────────────┐
│ show director[0] instantly       │
│ queue director[1] into preload   │
│ start auto-rotate timer          │
└──────────────┬──────────────────┘
               │
       ┌───────┴─────────┐
       │                 │
   [hover enter]     [rotate tick]
       │                 │
       ▼                 ▼
 stop timer         advance index
 swap to hovered    swap active/preload
       │            queue next preload
   [hover leave]
       │
       ▼
  start timer
```

Core invariants:
- Exactly **two** `<video>` elements at all times. One visible (opacity 1), one hidden (opacity 0).
- On swap, the hidden element is first loaded with the target director's URL, then cross-fades in while the active one fades out. Then the roles swap.
- `prefers-reduced-motion` disables auto-rotate and crossfade (opacity toggles instantly on hover).
- Tab visibility drops pause the rotate timer (browser throttles `setInterval` anyway; this makes the pause explicit).

### Filter

- `all` shows every director.
- `rogue` shows directors where `data-rogue-is-rebel="false"`.
- `rebel` shows directors where `data-rogue-is-rebel="true"`.
- `reset` resets to `all`.

Filters update the DOM via `display: none` + `aria-hidden` on filtered-out director links. Auto-rotate cycles only the visible subset. If the currently-active director is filtered out, the controller jumps to the first visible director.

### Mobile behaviour

No hover on touch devices. The controller:
- Keeps auto-rotate running.
- Does nothing special on tap — the anchor's default href navigates to the director page.

This matches option (a) of the brief's two proposals. If we later want tap-to-activate-first then tap-to-navigate (option b), we'd add a touch handler that intercepts the first tap.

---

## Phase 3 / 4 / 6 — to be added

The namespace shape leaves room for:
- `initLightbox({ list, ...})` — Phase 3, Smart Lightbox + next/prev-within-context.
- `initGridPage({ mode, ...})` — Phase 4 (homepage grid) and reused by Phase 5 (Music Video / Film & TV) and Phase 6 (director page archive).

Each adds a new class in the module, registered via a new `RogueFilms.init*` method. The two-video swap pattern isn't shared — grid mode needs one video per tile — so the phases don't share much code beyond the runtime-CSS and utility helpers.

---

## Updating the controller

Flow for pushing a change:
1. Edit `code/video-controller.js` locally.
2. Run the Playwright suite.
3. Commit + push to `main`.
4. jsDelivr picks up the new commit within minutes (cache TTL is short on `@main` refs). Verify in DevTools that the latest hash is loading.
5. For production launches, pin the embed URL to a tagged version (`@v1.0`).
