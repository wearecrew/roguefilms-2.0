/**
 * Rogue Films v2 — Site-wide custom code + video controller
 *
 * Single module served via jsDelivr from the wearecrew/roguefilms-2.0 GitHub repo:
 *   https://cdn.jsdelivr.net/gh/wearecrew/roguefilms-2.0@main/code/video-controller.js
 *
 * Webflow embed point is a single <script src> tag in Site Settings → Custom Code → Footer.
 *
 * Responsibilities (by phase of the v2 build):
 *   1. Inject design-system runtime CSS (motion easings, durations) as :root vars.
 *   2. Expose `window.RogueFilms` namespace for per-page init scripts.
 *   3. Provide controllers for specific page patterns:
 *        Phase 2: Talent (background swap).
 *        Phase 3: Lightbox (fetch + inject standalone showreel pages),
 *                 GridHover (per-tile rollover videos on Music Videos /
 *                 Film & TV / similar grid views),
 *                 FilterPrune (hides Finsweet filter options whose value
 *                 isn't present in the current page's list),
 *                 FilterLabel (mirrors the active Finsweet filter value
 *                 into a label element — e.g. the dropdown toggle).
 *
 * Per-page usage (Webflow page custom code → Footer):
 *
 *   <script>
 *     document.addEventListener('DOMContentLoaded', () => {
 *       if (window.RogueFilms) window.RogueFilms.initTalentPage();
 *     });
 *   </script>
 *
 * Accepts optional config: { autoRotateMs: 6000 } etc. See initTalentPage for options.
 */

(function () {
  'use strict';

  const VERSION = '0.11.0-phase3';

  // ─── Design-system runtime CSS ───────────────────────────────────────────
  //
  // Motion easings and durations live here as :root custom properties, since
  // Webflow's size variable type rejects cubic-bezier() and the ms suffix is
  // ergonomically needed for transition-duration.

  function injectRuntimeCSS() {
    if (document.getElementById('rogue-runtime-tokens')) return;
    const style = document.createElement('style');
    style.id = 'rogue-runtime-tokens';
    // Uses Webflow's generated CSS variable for text/accent, with hex
    // fallback. Specificity is two-class (e.g. .talent_link.is-active)
    // so it wins over Webflow's single-class base styles without !important.
    style.textContent = [
      ':root {',
      '  --motion-easing-standard: cubic-bezier(0.4, 0, 0.2, 1);',
      '  --motion-easing-in: cubic-bezier(0.4, 0, 1, 1);',
      '  --motion-easing-out: cubic-bezier(0, 0, 0.2, 1);',
      '  --motion-duration-fast: 150ms;',
      '  --motion-duration-normal: 300ms;',
      '  --motion-duration-slow: 500ms;',
      '  --rogue-accent: var(--_tokens---color--text--accent, #f25d78);',
      '}',
      '',
      '/* Active-director highlight (auto-rotate + hover) */',
      '.talent_link.is-active,',
      '[data-rogue-director].is-active .talent_link,',
      '[data-rogue-director].is-active { color: var(--rogue-accent); }',
      '',
      '/* Active filter pill */',
      '[data-rogue-talent-filter].is-active {',
      '  color: var(--rogue-accent);',
      '  border-color: var(--rogue-accent);',
      '}',
      '',
      '/* Lightbox base styles (Phase 3) — hidden by default, shown when',
      '   the controller sets aria-hidden="false" + class is-open. */',
      '[data-rogue-lightbox] {',
      '  position: fixed;',
      '  inset: 0;',
      '  z-index: 9999;',
      '  background: #00162c;', // color/surface/page — opaque, matches standalone
      '  overflow-y: auto;',
      '  visibility: hidden;',
      '  opacity: 0;',
      '  transition: opacity var(--motion-duration-normal, 300ms) var(--motion-easing-standard),',
      '              visibility 0s linear var(--motion-duration-normal, 300ms);',
      '}',
      '[data-rogue-lightbox].is-open {',
      '  visibility: visible;',
      '  opacity: 1;',
      '  transition: opacity var(--motion-duration-normal, 300ms) var(--motion-easing-standard),',
      '              visibility 0s;',
      '}',
      '[data-rogue-lightbox-backdrop] {',
      '  position: absolute; inset: 0;',
      '  background: transparent;',  // chrome handled by overlay bg
      '}',
      'body.rogue-lightbox-open { overflow: hidden; }',
      '',
      '/* Hide lightbox chrome when the page has no lightbox overlay.',
      '   Chrome lives inside [data-rogue-showreel-content] on the standalone',
      '   /director-showreels/[slug] template so it can inherit layout. When',
      '   that content is fetched and injected into a page that HAS a',
      '   lightbox overlay (music-videos, film-tv, etc.), the chrome becomes',
      '   a descendant of [data-rogue-lightbox] and we want it visible with',
      '   its authored class styling intact.',
      '   Using :has() to scope by page context keeps the class-based display',
      '   (e.g. .showreel_nav-btn\'s display: flex) winning cleanly inside the',
      '   lightbox — an earlier approach used `display: revert` on the unhide,',
      '   which resolved past the class to the UA default `block`, breaking',
      '   the align-items/justify-content centering of the arrow icons. */',
      'body:not(:has([data-rogue-lightbox])) [data-rogue-lightbox-close],',
      'body:not(:has([data-rogue-lightbox])) [data-rogue-lightbox-prev],',
      'body:not(:has([data-rogue-lightbox])) [data-rogue-lightbox-next] { display: none; }',
      '',
      '/* Grid rollover videos (Phase 3) — fade in over the static poster',
      '   while the tile is hovered. The .is-rolling class is applied by',
      '   GridHoverController on mouseenter and removed on mouseleave (or',
      '   when another tile takes over as the active rollover). The video',
      '   element should be positioned over its poster in Webflow; this rule',
      '   only handles the opacity + fade timing. */',
      '[data-rogue-grid-tile] [data-rogue-grid-rollover] {',
      '  opacity: 0;',
      '  transition: opacity 250ms var(--motion-easing-standard, cubic-bezier(0.4, 0, 0.2, 1));',
      '  pointer-events: none;',
      '}',
      '[data-rogue-grid-tile].is-rolling [data-rogue-grid-rollover] {',
      '  opacity: 1;',
      '}',
      '',
      '/* Lightbox loading — designer-controlled element (optional).',
      '   If the designer adds <div data-rogue-lightbox-loading> inside the',
      '   overlay (outside [data-rogue-lightbox-body]), the controller toggles',
      '   .is-visible on it while content is fetching. Default state here is',
      '   display:none so the element stays hidden until the controller shows',
      '   it. Both states are overridable in Webflow Designer. */',
      '[data-rogue-lightbox-loading] { display: none; }',
      '[data-rogue-lightbox-loading].is-visible {',
      '  display: flex;',
      '  align-items: center;',
      '  justify-content: center;',
      '}',
      '',
      '/* Lightbox loading — fallback spinner (used only when the designer',
      '   has not added a [data-rogue-lightbox-loading] element). Subtle, ',
      '   centred over the empty body while fetch is in flight. */',
      '.rogue-lightbox-loading-fallback {',
      '  position: absolute;',
      '  inset: 0;',
      '  display: flex;',
      '  align-items: center;',
      '  justify-content: center;',
      '  pointer-events: none;',
      '}',
      '.rogue-lightbox-spinner {',
      '  width: 32px; height: 32px;',
      '  border: 2px solid rgba(255, 255, 255, 0.15);',
      '  border-top-color: rgba(255, 255, 255, 0.7);',
      '  border-radius: 50%;',
      '  animation: rogue-lightbox-spin 0.9s linear infinite;',
      '}',
      '@keyframes rogue-lightbox-spin { to { transform: rotate(360deg); } }',
      '',
      '/* Lightbox prev/next disabled state — applied by the controller when',
      '   the current item is at the start or end of the visible list. Uses',
      '   visibility:hidden rather than display:none so absolute-positioned',
      '   chrome keeps its slot and inline chrome does not cause layout jump. */',
      '[data-rogue-lightbox-prev].is-disabled,',
      '[data-rogue-lightbox-next].is-disabled,',
      '[data-rogue-showreel-prev].is-disabled,',
      '[data-rogue-showreel-next].is-disabled {',
      '  visibility: hidden;',
      '  pointer-events: none;',
      '}',
    ].join('\n');
    document.head.appendChild(style);
  }

  // ─── Utilities ───────────────────────────────────────────────────────────

  const prefersReducedMotion = () =>
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const onReducedMotionChange = (handler) => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.addEventListener) mq.addEventListener('change', handler);
    else if (mq.addListener) mq.addListener(handler); // older Safari
  };

  const isTouchDevice = () =>
    'ontouchstart' in window || (navigator.maxTouchPoints || 0) > 0;

  // Hover capability — true when the primary input device can hover (mouse,
  // trackpad). Returns false on touch-only devices and when the user has no
  // hover-capable input attached. Preferred over isTouchDevice() for deciding
  // whether to enable hover-driven UI like grid rollover videos: hybrid
  // devices with both touch + mouse still report (hover: hover) so they get
  // the rollover, whereas pure touch screens do not.
  const supportsHover = () =>
    !!(window.matchMedia && window.matchMedia('(hover: hover)').matches);

  // ─── Talent page controller: background swap ─────────────────────────────
  //
  // DOM contract:
  //
  //   <section data-rogue-talent>
  //     <video data-rogue-talent-bg="active"  muted loop playsinline></video>
  //     <video data-rogue-talent-bg="preload" muted loop playsinline></video>
  //
  //     <button data-rogue-talent-filter="all">All</button>
  //     <button data-rogue-talent-filter="rogue">Rogue</button>
  //     <button data-rogue-talent-filter="rebel">Rebel</button>
  //     <button data-rogue-talent-filter="reset">Reset</button>
  //
  //     <a href="/directors/joe-connor"
  //        data-rogue-director="joe-connor"
  //        data-rogue-video-url="https://player.vimeo.com/...mp4"
  //        data-rogue-is-rebel="false">
  //       Joe Connor
  //     </a>
  //     ...
  //   </section>
  //
  // Behaviours:
  //   - One active video visible, one hidden preloading the next expected director.
  //   - Hover a director → pause auto-rotate, swap to that director's video.
  //   - No hover → auto-rotate every `autoRotateMs` through the filtered list.
  //   - Filter pills (all/rogue/rebel/reset) show/hide directors and reset the rotate cycle.
  //   - Active director gets the `is-active` class (style in Webflow).
  //   - prefers-reduced-motion: disable auto-rotate and crossfade, swap instantly on hover.
  //   - Touch devices (no hover): continuous auto-rotate, tap = navigate (anchor default).

  class TalentController {
    constructor(options) {
      this.opts = Object.assign(
        {
          autoRotateMs: 6000,
          crossfadeMs: 300,
          // Safety fallback if canplay never fires (slow network, 404, etc).
          // After this we fade in anyway — the poster layer covers the blank.
          crossfadeTimeoutMs: 2500,
        },
        options || {}
      );

      this.root = document.querySelector('[data-rogue-talent]');
      if (!this.root) {
        console.info('[RogueFilms] talent root not found; skipping controller');
        return;
      }

      this.videos = {
        active: this.root.querySelector('[data-rogue-talent-bg="active"]'),
        preload: this.root.querySelector('[data-rogue-talent-bg="preload"]'),
      };

      // Optional poster layer — an <img> that sits behind the videos and
      // covers loading/buffering time. See v0.4.0 notes.
      this.poster = this.root.querySelector('[data-rogue-talent-poster]');

      this.directorEls = Array.from(
        this.root.querySelectorAll('[data-rogue-director]')
      );

      if (!this.videos.active || !this.videos.preload) {
        console.warn('[RogueFilms] talent background video elements missing');
        return;
      }
      if (this.directorEls.length === 0) {
        console.warn('[RogueFilms] no directors found on talent page');
        return;
      }

      this.directors = this.directorEls.map((el, i) => {
        // Click target: if the director element is itself an <a>, use it;
        // otherwise look for an <a> descendant (Webflow pattern where the
        // Collection Item wraps a Link Block).
        const anchor = el.tagName === 'A' ? el : el.querySelector('a[href]');
        const href = anchor ? anchor.getAttribute('href') : null;

        // is-rebel detection. Webflow's boolean→custom-attribute-value
        // binding emits empty for both true and false, so the attribute
        // alone isn't reliable. Fall back to a conditionally-rendered
        // marker element (a child with class .is-rebel-marker or attribute
        // data-rogue-rebel-marker; Webflow's Conditional Visibility keeps
        // the element in the DOM but adds class w-condition-invisible when
        // the condition is false).
        const attrSaysRebel = el.dataset.rogueIsRebel === 'true';
        const marker = el.querySelector(
          '[data-rogue-rebel-marker], .is-rebel-marker'
        );
        const markerSaysRebel =
          !!marker && !marker.classList.contains('w-condition-invisible');
        const isRebel = attrSaysRebel || markerSaysRebel;

        // Poster URL — Webflow doesn't expose image-field URLs to custom
        // attribute bindings, so the idiomatic path is a hidden native <img>
        // inside each Collection Item bound via Webflow's image binding.
        // We read its src. A plain data-rogue-poster-url attribute is still
        // accepted as a fallback for non-Webflow contexts or if someone
        // wires it up manually.
        const posterImg = el.querySelector(
          'img[data-rogue-poster], img.talent_item-poster'
        );
        const posterUrl =
          (posterImg && (posterImg.currentSrc || posterImg.src)) ||
          el.dataset.roguePosterUrl ||
          '';

        return {
          id: el.dataset.rogueDirector,
          name: (el.textContent || '').trim(),
          videoUrl: el.dataset.rogueVideoUrl || '',
          posterUrl,
          isRebel,
          href,
          anchor,
          el,
          index: i,
        };
      });

      this.state = {
        activeIndex: 0,
        hoveredId: null,
        filter: 'all',
        rotateTimer: 0,
        reducedMotion: prefersReducedMotion(),
        touchDevice: isTouchDevice(),
      };

      this.prepareVideoElements();
      this.bindEvents();
      // Initial visual state: highlight the "All" filter pill.
      this.setFilter('all');
      // Initial show — not instant, so the first video fades in over its
      // poster once canplay fires (or after the safety timeout).
      this.show(0);
      this.queuePreload(this.nextIndexInFilter(0));
      if (!this.state.reducedMotion) this.startAutoRotate();

      console.info(
        '[RogueFilms] talent controller initialised — ' +
          this.directors.length +
          ' directors, ' +
          this.directors.filter((d) => d.isRebel).length +
          ' rebels detected'
      );
    }

    prepareVideoElements() {
      [this.videos.active, this.videos.preload].forEach((v) => {
        v.muted = true;
        v.loop = true;
        v.playsInline = true;
        v.setAttribute('playsinline', '');
        v.setAttribute('webkit-playsinline', '');
        v.style.transition = `opacity ${this.opts.crossfadeMs}ms var(--motion-easing-standard, cubic-bezier(0.4, 0, 0.2, 1))`;
        // Both start hidden — videos fade up only once canplay fires.
        // The poster layer (if present) covers the blank space until then.
        v.style.opacity = '0';
      });
      // fade-counter lets us discard stale canplay callbacks when the user
      // rapidly hovers through multiple directors.
      this.fadeCounter = 0;
    }

    bindEvents() {
      // Hover (desktop only — no-op on touch devices via default behaviour)
      this.directorEls.forEach((el) => {
        el.addEventListener('mouseenter', () => this.onHover(el.dataset.rogueDirector));
        el.addEventListener('mouseleave', () => this.onUnhover());
      });

      // Filter pills
      const pills = this.root.querySelectorAll('[data-rogue-talent-filter]');
      pills.forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          this.setFilter(btn.dataset.rogueTalentFilter);
        });
      });

      // Reduced motion changes mid-session
      onReducedMotionChange((e) => {
        this.state.reducedMotion = e.matches;
        if (this.state.reducedMotion) {
          this.stopAutoRotate();
        } else if (!this.state.hoveredId) {
          this.startAutoRotate();
        }
      });

      // Pause auto-rotate when tab is hidden, resume when visible
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.stopAutoRotate();
        } else if (!this.state.hoveredId && !this.state.reducedMotion) {
          this.startAutoRotate();
        }
      });
    }

    // ─── Video swap ────────────────────────────────────────────────────────
    //
    // Flow for each show(index):
    //   1. Update poster image src immediately — covers the blank space behind
    //      the videos while the new one buffers. The poster element is always
    //      at opacity 1; videos fade in on top of it once ready.
    //   2. Set the preload video's src (if not already loaded) and start
    //      loading. Fire play() eagerly so it kicks off decoding.
    //   3. Wait for canplay (readyState >= 3 / HAVE_FUTURE_DATA). Once fired,
    //      fade the current active out and the preload (new active) in.
    //      If canplay doesn't fire within `crossfadeTimeoutMs` we fade anyway
    //      — the poster remains visible underneath, so the user sees the
    //      still instead of a black rectangle.
    //   3. Swap active/preload references so the next call loads into the
    //      now-hidden element.
    //   4. Abort-safety: each show() bumps a fade counter. Callbacks check
    //      their captured counter value; if it's stale (user hovered again),
    //      they bail.

    show(index, opts) {
      const director = this.directors[index];
      if (!director) return;
      const instant = !!(opts && opts.instant) || this.state.reducedMotion;

      this.state.activeIndex = index;

      // Active-director class. Applied to BOTH the director element itself
      // AND its descendant anchor (.talent_link), so CSS that targets either
      // `.talent_item.is-active` or `.talent_link.is-active` will work.
      this.directorEls.forEach((el) => {
        const isActive = el.dataset.rogueDirector === director.id;
        el.classList.toggle('is-active', isActive);
        const anchor = el.tagName === 'A' ? null : el.querySelector('a');
        if (anchor) anchor.classList.toggle('is-active', isActive);
      });

      // Poster swap — instant, always visible, covers loading time.
      this.updatePoster(director.posterUrl);

      // Load preload video
      const preloadEl = this.videos.preload;
      const activeEl = this.videos.active;
      const preloadHasCorrectSrc =
        director.videoUrl && preloadEl.src.indexOf(director.videoUrl) >= 0;

      if (!preloadHasCorrectSrc) {
        this.setVideoSrc(preloadEl, director.videoUrl);
      }

      this.playSafe(preloadEl);

      // Crossfade, gated on canplay unless instant.
      const myFadeId = ++this.fadeCounter;

      const doFade = () => {
        if (myFadeId !== this.fadeCounter) return; // superseded by a newer show()
        activeEl.style.opacity = '0';
        preloadEl.style.opacity = '1';
      };

      if (instant) {
        doFade();
      } else if (preloadEl.readyState >= 3) {
        requestAnimationFrame(doFade);
      } else {
        const onReady = () => {
          cleanup();
          doFade();
        };
        const timeoutId = setTimeout(() => {
          cleanup();
          doFade(); // safety fallback — poster covers if video still blank
        }, this.opts.crossfadeTimeoutMs);
        const cleanup = () => {
          preloadEl.removeEventListener('canplay', onReady);
          clearTimeout(timeoutId);
        };
        preloadEl.addEventListener('canplay', onReady, { once: true });
      }

      // Swap roles — preload becomes new active, active becomes new preload.
      this.videos.active = preloadEl;
      this.videos.preload = activeEl;
    }

    updatePoster(posterUrl) {
      if (!this.poster) return;
      if (!posterUrl) return;
      if (this.poster.getAttribute('src') === posterUrl) return;
      this.poster.setAttribute('src', posterUrl);
    }

    setVideoSrc(videoEl, src) {
      if (!src) return;
      if (videoEl.src === src) return;
      videoEl.src = src;
      videoEl.load();
    }

    playSafe(videoEl) {
      const p = videoEl.play();
      if (p && typeof p.catch === 'function') {
        p.catch(() => {
          // Autoplay may be blocked momentarily. Retry once canplay fires.
          videoEl.addEventListener(
            'canplay',
            () => {
              const retry = videoEl.play();
              if (retry && typeof retry.catch === 'function') {
                retry.catch(() => {});
              }
            },
            { once: true }
          );
        });
      }
    }

    queuePreload(index) {
      const director = this.directors[index];
      if (!director) return;
      this.setVideoSrc(this.videos.preload, director.videoUrl);
    }

    // ─── Auto-rotate ───────────────────────────────────────────────────────

    startAutoRotate() {
      this.stopAutoRotate();
      this.state.rotateTimer = window.setInterval(() => {
        this.rotateOnce();
      }, this.opts.autoRotateMs);
    }

    stopAutoRotate() {
      if (this.state.rotateTimer) {
        clearInterval(this.state.rotateTimer);
        this.state.rotateTimer = 0;
      }
    }

    rotateOnce() {
      if (this.state.hoveredId) return; // paused while hovered
      const next = this.nextIndexInFilter(this.state.activeIndex);
      if (next === this.state.activeIndex) return;
      this.show(next);
      this.queuePreload(this.nextIndexInFilter(next));
    }

    nextIndexInFilter(fromIndex) {
      const visible = this.getVisibleDirectors();
      if (visible.length === 0) return fromIndex;
      const currentVisible = visible.findIndex((d) => d.index === fromIndex);
      if (currentVisible < 0) return visible[0].index;
      return visible[(currentVisible + 1) % visible.length].index;
    }

    // ─── Hover ─────────────────────────────────────────────────────────────

    onHover(directorId) {
      this.state.hoveredId = directorId;
      this.stopAutoRotate();
      const target = this.directors.find((d) => d.id === directorId);
      if (target && target.index !== this.state.activeIndex) {
        this.show(target.index);
      }
    }

    onUnhover() {
      this.state.hoveredId = null;
      if (!this.state.reducedMotion) this.startAutoRotate();
    }

    // ─── Filter ────────────────────────────────────────────────────────────

    setFilter(name) {
      const nextFilter = name === 'reset' ? 'all' : name;
      this.state.filter = nextFilter;

      // Highlight active pill. "All" also gets highlighted when nothing
      // else is filtered — it represents the current state visually.
      this.root.querySelectorAll('[data-rogue-talent-filter]').forEach((btn) => {
        btn.classList.toggle(
          'is-active',
          btn.dataset.rogueTalentFilter === nextFilter
        );
      });

      // Show / hide directors
      const visibleIds = new Set(this.getVisibleDirectors().map((d) => d.id));
      this.directorEls.forEach((el) => {
        const visible = visibleIds.has(el.dataset.rogueDirector);
        el.style.display = visible ? '' : 'none';
        el.setAttribute('aria-hidden', String(!visible));
      });

      // If the active director was filtered out, jump to first visible
      const visible = this.getVisibleDirectors();
      const activeStillVisible = visible.some(
        (d) => d.index === this.state.activeIndex
      );
      if (!activeStillVisible && visible.length > 0) {
        this.show(visible[0].index);
        this.queuePreload(this.nextIndexInFilter(visible[0].index));
      }

      // Reset the rotate cadence after a filter change
      if (!this.state.hoveredId && !this.state.reducedMotion) {
        this.startAutoRotate();
      }
    }

    getVisibleDirectors() {
      if (this.state.filter === 'rogue')
        return this.directors.filter((d) => !d.isRebel);
      if (this.state.filter === 'rebel')
        return this.directors.filter((d) => d.isRebel);
      return this.directors.slice();
    }
  }

  // ─── Lightbox controller (Phase 3) ─────────────────────────────────────
  //
  // Opens a sitewide overlay containing the work-detail layout, populated
  // by fetching the standalone page's content and injecting it.
  //
  // DOM contract (sitewide overlay — hidden by default):
  //
  //   <div data-rogue-lightbox aria-hidden="true" role="dialog">
  //     <div data-rogue-lightbox-backdrop></div>
  //     <button data-rogue-lightbox-close aria-label="Close">…</button>
  //     <button data-rogue-lightbox-prev  aria-label="Previous film">…</button>
  //     <button data-rogue-lightbox-next  aria-label="Next film">…</button>
  //     <div data-rogue-lightbox-loading>          <!-- optional, designer-owned -->
  //       <!-- Shown while content is fetching. Controller toggles
  //            .is-visible on this element. Lives at the overlay root,
  //            NOT inside [data-rogue-lightbox-body] (the body gets
  //            wiped on each open). If this element is absent the
  //            controller injects a subtle centred spinner as fallback. -->
  //     </div>
  //     <div data-rogue-lightbox-body>
  //       <!-- Placeholder / shell copy of the showreel layout. The controller
  //            replaces innerHTML on open with the fetched standalone page
  //            content (inner HTML of [data-rogue-showreel-content]). -->
  //     </div>
  //   </div>
  //
  // DOM contract (trigger — on any grid tile across the site):
  //
  //   <a href="/director-showreels/the-slug"
  //      data-rogue-showreel-url="/director-showreels/the-slug">
  //     ...tile contents...
  //   </a>
  //
  // The href fallback ensures graceful degradation if JS fails.
  // The controller intercepts clicks on elements that match the trigger
  // selector, prevents default, and opens the lightbox.
  //
  // Navigation behaviour (v0.9+):
  //   - prev/next are NON-CIRCULAR. At the start of the (filtered, visible)
  //     trigger list prev is no-op; at the end next is no-op. Chrome is
  //     visually hidden via .is-disabled — see updateNavButtons() below.
  //   - Hidden triggers (e.g. filtered out by Finsweet) are excluded from
  //     the nav list, so prev/next skips them rather than jumping to
  //     off-grid items.

  class LightboxController {
    constructor(options) {
      this.opts = Object.assign(
        {
          // Any element matching this selector is a lightbox trigger. The URL
          // is resolved by resolveTriggerUrl() — it prefers an explicit URL in
          // data-rogue-showreel-url, else falls back to the element's own
          // href (or a descendant <a>'s href). That lets designers just bind
          // the Link Block to the collection page in Webflow without needing
          // a CMS-composed attribute value.
          triggerSelector: '[data-rogue-showreel-url], [data-rogue-showreel-trigger]',
          fetchTimeoutMs: 8000,
          // Delay before hover-triggered prefetch starts. Short enough to
          // feel responsive, long enough that a casual mouse flyover past a
          // tile doesn't kick off a fetch. 100ms is the pattern used by
          // instant.page and similar libraries — it clears most accidental
          // flyovers without being perceptible as a "wait" to a deliberate
          // user.
          hoverPrefetchDelayMs: 100,
        },
        options || {}
      );

      this.overlay = document.querySelector('[data-rogue-lightbox]');
      if (!this.overlay) {
        console.info('[RogueFilms] no [data-rogue-lightbox] on page; lightbox inactive');
        return;
      }

      this.body = this.overlay.querySelector('[data-rogue-lightbox-body]');
      this.backdrop = this.overlay.querySelector('[data-rogue-lightbox-backdrop]');
      this.closeBtn = this.overlay.querySelector('[data-rogue-lightbox-close]');
      this.prevBtn = this.overlay.querySelector('[data-rogue-lightbox-prev]');
      this.nextBtn = this.overlay.querySelector('[data-rogue-lightbox-next]');

      if (!this.body) {
        console.warn('[RogueFilms] lightbox overlay missing [data-rogue-lightbox-body]');
        return;
      }

      this.cache = new Map(); // url → extracted innerHTML
      this.inflightFetch = null;
      this.state = {
        open: false,
        currentUrl: null,
        currentIndex: -1,
        previousFocus: null,
      };

      this.bindEvents();
      this.bindHoverPrefetch();
      this.setOpen(false, { skipFocus: true });

      console.info(
        '[RogueFilms] lightbox initialised — ' + this.getTriggers().length + ' tiles bound'
      );
    }

    // ─── Events ────────────────────────────────────────────────────────────

    bindEvents() {
      // Intercept clicks on any trigger, site-wide, via capture delegation.
      document.addEventListener(
        'click',
        (e) => {
          const trigger = e.target.closest(this.opts.triggerSelector);
          if (!trigger) return;
          // Allow middle-click / cmd-click / ctrl-click to open in new tab.
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
          const url = this.resolveTriggerUrl(trigger);
          if (!url) return;
          e.preventDefault();
          this.open(url);
        },
        false
      );

      // Chrome clicks (close/prev/next/backdrop) are handled by the delegated
      // overlay listener below — that path works for both overlay-root chrome
      // and chrome that gets injected with the body content. Direct listeners
      // here would double-fire alongside delegation.

      // Esc to close; Tab trap when open.
      document.addEventListener('keydown', (e) => {
        if (!this.state.open) return;
        if (e.key === 'Escape') {
          e.preventDefault();
          this.close();
        } else if (e.key === 'Tab') {
          this.handleFocusTrap(e);
        }
      });

      // Delegate chrome + inline action clicks inside the overlay. Content is
      // fetched and injected on each open, so any chrome that lives inside
      // [data-rogue-showreel-content] on the standalone page can't be wired
      // with cached listeners — delegation handles both overlay-root chrome
      // and post-injection chrome with the same code.
      //
      // Two attribute families are supported:
      //   data-rogue-lightbox-* — overlay chrome (close, prev, next, backdrop).
      //     Works whether the element lives at the overlay root or inside the
      //     injected body.
      //   data-rogue-showreel-* — inline content actions (back, copy-link, and
      //     standalone prev/next deferred to Phase 6). Only delegated inside
      //     the overlay; on the standalone page they're inert.
      this.overlay.addEventListener('click', (e) => {
        // Backdrop / overlay-bg click — close. Match either an explicit
        // backdrop element or a click on the overlay surface itself (so the
        // overlay doubles as backdrop when no dedicated element exists).
        if (
          e.target.closest('[data-rogue-lightbox-backdrop]') ||
          e.target === this.overlay
        ) {
          this.close();
          return;
        }
        const closeBtn = e.target.closest('[data-rogue-lightbox-close], [data-rogue-showreel-back]');
        if (closeBtn) {
          e.preventDefault();
          this.close();
          return;
        }
        const copyBtn = e.target.closest('[data-rogue-showreel-copy-link]');
        if (copyBtn) {
          e.preventDefault();
          this.copyShareLink(copyBtn);
          return;
        }
        const prevBtn = e.target.closest('[data-rogue-lightbox-prev], [data-rogue-showreel-prev]');
        if (prevBtn) {
          e.preventDefault();
          this.prev();
          return;
        }
        const nextBtn = e.target.closest('[data-rogue-lightbox-next], [data-rogue-showreel-next]');
        if (nextBtn) {
          e.preventDefault();
          this.next();
          return;
        }
      });
    }

    // ─── Open / close ──────────────────────────────────────────────────────

    async open(url) {
      if (!url) return;
      const triggers = this.getTriggers();
      const cached = this.cache.has(url);
      this.state.currentUrl = url;
      this.state.currentIndex = triggers.findIndex(
        (t) => this.resolveTriggerUrl(t) === url
      );

      this.setOpen(true);
      // Only show the loading state if the content isn't already cached.
      // Cache hits resolve on the next microtask — skipping renderLoading
      // avoids the single-frame "empty body → spinner" flash users were
      // seeing when navigating via prev/next through previously-opened
      // items, and keeps any inline chrome in the current body visible
      // until the new body swaps in atomically.
      if (!cached) this.renderLoading();
      // First pass — updates any overlay-root prev/next chrome before the
      // fetch resolves. A second pass runs after content injection to
      // catch inline chrome that lives inside the fetched HTML.
      this.updateNavButtons();

      try {
        const html = await this.fetchContent(url);
        // If the user has navigated to a different URL during fetch, bail.
        if (this.state.currentUrl !== url) return;
        this.body.innerHTML = html;
        this.hideLoading();
        this.applyVideoAspectRatios(this.body);
        this.autoplayVideoIfPresent(this.body);
        this.updateNavButtons();
        // Move focus into the freshly-injected chrome for keyboard users.
        // The close button is the natural landing target. If the chrome lives
        // at the overlay root instead, that selector still matches.
        const closeBtn = this.overlay.querySelector(
          '[data-rogue-lightbox-close], [data-rogue-showreel-back]'
        );
        if (closeBtn && document.activeElement !== closeBtn) closeBtn.focus();
        // Warm the cache for neighbours so the next prev/next click is
        // instant. Fire-and-forget: errors land in the catch inside
        // fetchContent and don't affect the currently open item.
        this.prefetchAdjacent();
      } catch (err) {
        console.error('[RogueFilms] lightbox fetch failed', err);
        this.body.innerHTML = this.renderErrorHtml(url);
        this.hideLoading();
      }
    }

    close() {
      if (!this.state.open) return;
      // Pause any playing video in the overlay before hiding.
      const v = this.body.querySelector('video');
      if (v) {
        try {
          v.pause();
        } catch (_) {
          /* noop */
        }
      }
      this.setOpen(false);
    }

    setOpen(open, { skipFocus } = {}) {
      this.state.open = open;
      this.overlay.setAttribute('aria-hidden', open ? 'false' : 'true');
      this.overlay.classList.toggle('is-open', open);
      document.body.classList.toggle('rogue-lightbox-open', open);

      if (open) {
        this.state.previousFocus = document.activeElement;
        if (!skipFocus && this.closeBtn) {
          // Delay focus until content is rendering so focus ring is on overlay chrome.
          setTimeout(() => this.closeBtn && this.closeBtn.focus(), 0);
        }
      } else {
        if (this.state.previousFocus && this.state.previousFocus.focus) {
          try {
            this.state.previousFocus.focus();
          } catch (_) {
            /* noop */
          }
        }
      }
    }

    // ─── Prev / next ───────────────────────────────────────────────────────

    getTriggers() {
      // Trigger list excludes the lightbox overlay's own descendants (so
      // internal links aren't counted), and only matches visible triggers.
      // offsetParent === null means the element (or an ancestor) has
      // display:none — this is how Finsweet filters out non-matching items,
      // and the only cheap way to detect it without getComputedStyle.
      // Effect: when a CMS filter is active (e.g. Archive on a director
      // page), prev/next navigation cycles only through matching items,
      // and the at-start / at-end check below reflects the filtered set.
      return Array.from(document.querySelectorAll(this.opts.triggerSelector)).filter(
        (el) => !this.overlay.contains(el) && el.offsetParent !== null
      );
    }

    // Resolve the canonical URL for a trigger element. Prefers an explicit
    // data-rogue-showreel-url (only if it looks like a URL path), otherwise
    // falls back to the element's href (if it's an <a>) or a descendant
    // <a>'s href. Supports the common Webflow pattern where the Link Block
    // is bound to a collection page and the designer just adds a presence-
    // only data-rogue-showreel-trigger attribute.
    resolveTriggerUrl(el) {
      if (!el) return null;
      const direct = el.dataset.rogueShowreelUrl;
      if (direct && /^(https?:\/\/|\/)/.test(direct)) return direct;
      const anchor = el.tagName === 'A' ? el : el.querySelector('a[href]');
      if (anchor) {
        const href = anchor.getAttribute('href');
        if (href && href !== '#') return href;
      }
      return null;
    }

    prev() {
      const triggers = this.getTriggers();
      // Non-circular: no-op at the start of the list. Chrome is also
      // visually hidden via .is-disabled by updateNavButtons(), so this is
      // a belt-and-braces guard against keyboard or programmatic clicks.
      if (this.state.currentIndex <= 0) return;
      this.open(this.resolveTriggerUrl(triggers[this.state.currentIndex - 1]));
    }

    next() {
      const triggers = this.getTriggers();
      // Non-circular: no-op at the end of the list. See prev() for rationale.
      if (this.state.currentIndex >= triggers.length - 1) return;
      this.open(this.resolveTriggerUrl(triggers[this.state.currentIndex + 1]));
    }

    // Toggle the .is-disabled class on prev/next chrome when the current
    // item is at the start or end of the filtered, visible list. Matches
    // both overlay-root chrome ([data-rogue-lightbox-prev/next]) and the
    // inline chrome that can live inside the injected body content
    // ([data-rogue-showreel-prev/next]). Called twice per open(): once
    // before fetch so overlay-root chrome updates immediately, and once
    // after injection so any inline chrome inside the fetched HTML gets
    // the right state too.
    updateNavButtons() {
      const triggers = this.getTriggers();
      const atStart = this.state.currentIndex <= 0;
      const atEnd = this.state.currentIndex >= triggers.length - 1;
      // currentIndex < 0 happens when the opened URL isn't in the visible
      // trigger list — e.g. direct deeplink with a filter active. In that
      // case hide both rather than pick a random direction.
      const isolated = this.state.currentIndex < 0;

      const prevBtns = this.overlay.querySelectorAll(
        '[data-rogue-lightbox-prev], [data-rogue-showreel-prev]'
      );
      const nextBtns = this.overlay.querySelectorAll(
        '[data-rogue-lightbox-next], [data-rogue-showreel-next]'
      );
      prevBtns.forEach((b) => b.classList.toggle('is-disabled', atStart || isolated));
      nextBtns.forEach((b) => b.classList.toggle('is-disabled', atEnd || isolated));
    }

    // Warm the fetch cache for the items immediately before and after the
    // currently open one. Called after open() has resolved. Silently does
    // nothing for out-of-range indices (already at start/end) or cache
    // entries that already exist. Errors are swallowed — a prefetch that
    // fails doesn't matter; the real fetch on click will surface it.
    //
    // Why two neighbours rather than more: director pages have ~25 items,
    // music-videos has 75+. Prefetching further than one step in each
    // direction means downloading content the user is statistically
    // unlikely to navigate to, and the standalone pages are non-trivial
    // (typically 50-150kb of HTML + lazy-loaded video manifest). Two
    // neighbours covers 99% of prev/next navigation without being wasteful.
    prefetchAdjacent() {
      const triggers = this.getTriggers();
      if (triggers.length < 2 || this.state.currentIndex < 0) return;
      const neighbours = [
        this.state.currentIndex - 1,
        this.state.currentIndex + 1,
      ].filter((i) => i >= 0 && i < triggers.length);
      for (const i of neighbours) {
        const url = this.resolveTriggerUrl(triggers[i]);
        if (url && !this.cache.has(url)) {
          this.fetchContent(url).catch(() => {});
        }
      }
    }

    // Hover-based prefetch: when a desktop user hovers a trigger tile
    // for longer than hoverPrefetchDelayMs, kick off a cache-warming
    // fetch for its URL. By the time the user completes the click, the
    // content is already loaded and the lightbox opens with no flash.
    //
    // Delegation via capture phase: mouseenter doesn't bubble, so we use
    // the capture phase of mouseover. mouseover fires on every element
    // the pointer enters (including children), but closest() on the
    // trigger selector dedupes: we only act when the pointer moves from
    // "outside trigger" to "inside trigger", tracked via a lastTrigger
    // reference so repeated mouseover within the same tile is a no-op.
    //
    // Touch devices skipped: they fire a synthetic mouseenter just
    // before the click, giving no meaningful head start — prefetch and
    // click would race. On touch we rely on prefetchAdjacent() warming
    // the cache for the items immediately before/after the first open.
    bindHoverPrefetch() {
      if (!window.matchMedia || !window.matchMedia('(hover: hover)').matches) {
        return;
      }
      let pending = 0;
      let lastTrigger = null;

      document.addEventListener('mouseover', (e) => {
        const t =
          e.target && e.target.closest
            ? e.target.closest(this.opts.triggerSelector)
            : null;
        if (!t || t === lastTrigger) return;
        if (this.overlay.contains(t)) return;
        lastTrigger = t;
        const url = this.resolveTriggerUrl(t);
        if (!url || this.cache.has(url)) return;
        clearTimeout(pending);
        pending = window.setTimeout(() => {
          this.fetchContent(url).catch(() => {});
        }, this.opts.hoverPrefetchDelayMs || 100);
      });

      document.addEventListener('mouseout', (e) => {
        // Clear lastTrigger when we leave the current trigger, so a
        // return visit re-arms the prefetch if the URL still isn't
        // cached by then.
        const t =
          e.target && e.target.closest
            ? e.target.closest(this.opts.triggerSelector)
            : null;
        if (t && t === lastTrigger && !t.contains(e.relatedTarget)) {
          lastTrigger = null;
          clearTimeout(pending);
        }
      });
    }

    // ─── Fetch + inject ────────────────────────────────────────────────────

    async fetchContent(url) {
      if (this.cache.has(url)) return this.cache.get(url);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.opts.fetchTimeoutMs);

      try {
        const res = await fetch(url, { signal: controller.signal, credentials: 'same-origin' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const text = await res.text();
        const doc = new DOMParser().parseFromString(text, 'text/html');
        const content = doc.querySelector('[data-rogue-showreel-content]');
        if (!content) {
          throw new Error('No [data-rogue-showreel-content] at ' + url);
        }
        const html = content.innerHTML;
        this.cache.set(url, html);
        return html;
      } finally {
        clearTimeout(timeout);
      }
    }

    // Show the loading indicator. If the designer has added a
    // [data-rogue-lightbox-loading] element inside the overlay (outside
    // the body container — the body gets wiped on each open), the
    // controller toggles .is-visible on it. Designer owns the visual.
    // Otherwise a small centred spinner is injected into the empty body
    // as a fallback — subtle enough to not distract, subdued colours to
    // sit well against the dark overlay background.
    renderLoading() {
      const loader = this.overlay.querySelector('[data-rogue-lightbox-loading]');
      if (loader) {
        loader.classList.add('is-visible');
        // Clear body so previous content doesn't flash while fetching.
        this.body.innerHTML = '';
        return;
      }
      this.body.innerHTML =
        '<div class="rogue-lightbox-loading-fallback" aria-hidden="true">' +
        '<div class="rogue-lightbox-spinner"></div>' +
        '</div>';
    }

    // Hide the designer-controlled loader. The fallback spinner doesn't
    // need an explicit hide — body.innerHTML = html on successful fetch
    // replaces it naturally.
    hideLoading() {
      const loader = this.overlay.querySelector('[data-rogue-lightbox-loading]');
      if (loader) loader.classList.remove('is-visible');
    }

    renderErrorHtml(url) {
      return (
        '<div style="padding: 80px 20px; text-align: center;">' +
        '<p>Could not load this film.</p>' +
        '<p><a href="' + this.escapeAttr(url) + '">Open page directly</a></p>' +
        '</div>'
      );
    }

    escapeAttr(str) {
      return String(str).replace(/["<>&]/g, (c) =>
        ({ '"': '&quot;', '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c])
      );
    }

    // ─── Video helpers ─────────────────────────────────────────────────────

    applyVideoAspectRatios(root) {
      const frames = root.querySelectorAll('[data-rogue-showreel-frame]');
      frames.forEach((frame) => {
        const w = parseFloat(frame.dataset.videoWidth) || 16;
        const h = parseFloat(frame.dataset.videoHeight) || 9;
        if (w > 0 && h > 0) frame.style.aspectRatio = w + ' / ' + h;
      });
    }

    autoplayVideoIfPresent(root) {
      // Lightbox video autoplay is a separate policy decision. For now,
      // leave the poster visible and let the user click to play — same
      // UX as the standalone page. Future iterations can flip this.
    }

    // ─── Copy-link ─────────────────────────────────────────────────────────

    copyShareLink(btn) {
      const url = btn.dataset.rogueShowreelUrl || this.state.currentUrl;
      if (!url) return;
      const full = new URL(url, window.location.origin).href;
      const originalText = btn.textContent;
      const succeed = () => {
        btn.textContent = 'Copied!';
        btn.classList.add('is-copied');
        setTimeout(() => {
          btn.textContent = originalText;
          btn.classList.remove('is-copied');
        }, 1500);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(full).then(succeed).catch(() => this.fallbackCopy(full, succeed));
      } else {
        this.fallbackCopy(full, succeed);
      }
    }

    fallbackCopy(text, cb) {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        cb && cb();
      } catch (_) {
        /* noop */
      }
    }

    // ─── Focus trap ────────────────────────────────────────────────────────

    handleFocusTrap(e) {
      const focusables = this.overlay.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  // ─── Grid hover controller (Phase 3) ──────────────────────────────────────
  //
  // Plays a short low-bitrate "rollover" video on each grid tile when hovered
  // on desktop. Used on Music Videos, Film & TV, and any grid view backed by
  // the Showreels collection. Does not initialise on touch-only devices, so
  // mobile visitors never download rollover bytes — battery and bandwidth
  // budget per the v2 brief's mobile-first principle.
  //
  // DOM contract (per tile, on the page):
  //
  //   <a data-rogue-grid-tile
  //      data-rogue-showreel-trigger
  //      href="/director-showreels/the-slug">
  //     <img class="tile_poster" src="…poster.jpg" />
  //     <video data-rogue-grid-rollover
  //            preload="none" muted loop playsinline
  //            src="…rollover.mp4">
  //     </video>
  //     ...tile chrome...
  //   </a>
  //
  // The video element should have its src bound by Webflow to the Showreel's
  // video-url field. preload="none" is critical — it keeps the video off the
  // wire until the user actually hovers. The controller defensively re-applies
  // muted/loop/playsinline at init in case the Designer didn't set them.
  //
  // Behaviours:
  //   - mouseenter on a tile → pause any other playing rollover, play this one
  //   - mouseleave → pause
  //   - .is-rolling class added/removed on the tile to drive the opacity
  //     crossfade between poster and video (CSS injected by injectRuntimeCSS)
  //   - Tab visibility hidden → pause active video; user can mouseenter again
  //     to resume
  //   - Single-active concurrency: only one rollover plays at a time across
  //     the whole page
  //   - Touch devices and prefers-reduced-motion → controller no-ops, no
  //     bytes downloaded, static poster remains visible
  //
  // Lightbox interaction: tiles also typically carry data-rogue-showreel-
  // trigger so the same element opens the lightbox on click. The hover and
  // click pathways are independent — hover plays/pauses the rollover, click
  // is intercepted by LightboxController which fetches the standalone page
  // and injects it into the overlay body.
  //
  // Finsweet integration: tiles added to the DOM after boot (load-more,
  // pagination, or Finsweet rebuilds on filter) are picked up automatically
  // by a MutationObserver. Tiles are deduped via a WeakSet — a tile that
  // gets reparented or re-emitted only ever has one set of listeners.

  class GridHoverController {
    constructor(options) {
      this.opts = Object.assign(
        {
          tileSelector: '[data-rogue-grid-tile]',
          videoSelector: '[data-rogue-grid-rollover]',
        },
        options || {}
      );

      if (!supportsHover()) {
        console.info(
          '[RogueFilms] grid hover skipped — device has no hover-capable pointer (touch-only)'
        );
        return;
      }
      if (prefersReducedMotion()) {
        console.info('[RogueFilms] grid hover skipped — prefers-reduced-motion is set');
        return;
      }

      this.activeTile = null;
      this.activeVideo = null;
      // WeakSet of tiles we've already bound — avoids double-binding when
      // Finsweet load-more re-emits a tile, or when our MutationObserver
      // sees a tile a second time after re-parenting.
      this.bound = new WeakSet();

      this.bindAll();
      this.observeDynamicTiles();
      this.bindGlobalEvents();

      console.info(
        '[RogueFilms] grid hover initialised — ' +
          document.querySelectorAll(this.opts.tileSelector).length +
          ' tile(s) found at boot; new tiles will be picked up automatically'
      );
    }

    // Bind hover listeners on every currently-existing tile that we haven't
    // already bound. Idempotent — safe to call repeatedly.
    bindAll() {
      const tiles = document.querySelectorAll(this.opts.tileSelector);
      tiles.forEach((tile) => this.bindTile(tile));
    }

    bindTile(tile) {
      if (this.bound.has(tile)) return;
      // Skip tiles that live inside the lightbox overlay — fetched standalone
      // content shouldn't trigger rollover behaviour.
      const overlay = document.querySelector('[data-rogue-lightbox]');
      if (overlay && overlay.contains(tile)) return;

      const video = tile.querySelector(this.opts.videoSelector);
      if (!video) return;

      // Defensive — Designer may forget one of these in the Webflow video
      // element settings. Without them the browser will block autoplay or
      // fall back to fullscreen on iOS.
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.setAttribute('playsinline', '');
      video.setAttribute('webkit-playsinline', '');

      tile.addEventListener('mouseenter', () => this.onHover(tile, video));
      tile.addEventListener('mouseleave', () => this.onUnhover(tile, video));
      this.bound.add(tile);
    }

    // Watch the page for tiles added after boot — this is how Finsweet
    // Attributes 2's list-load (load-more / pagination) ships new items into
    // the DOM. Without this, only the first batch of tiles would have
    // rollover behaviour. Cheap subtree observer; the callback only acts on
    // matching nodes.
    observeDynamicTiles() {
      if (typeof MutationObserver !== 'function') return;
      const tileSel = this.opts.tileSelector;
      this.observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
          for (const node of m.addedNodes) {
            if (node.nodeType !== 1) continue; // element nodes only
            if (node.matches && node.matches(tileSel)) {
              this.bindTile(node);
            }
            // The added node may be a wrapper containing tiles further down.
            if (node.querySelectorAll) {
              node.querySelectorAll(tileSel).forEach((t) => this.bindTile(t));
            }
          }
        }
      });
      this.observer.observe(document.body, { childList: true, subtree: true });
    }

    bindGlobalEvents() {
      // Pause active video when tab loses focus. Resume happens naturally on
      // the next mouseenter — we don't auto-resume on visibility return
      // because the user's pointer may no longer be over the tile.
      document.addEventListener('visibilitychange', () => {
        if (document.hidden && this.activeVideo) {
          this.pauseActive();
        }
      });
    }

    onHover(tile, video) {
      // Single-active concurrency: pause the previous rollover before starting
      // this one. Keeps load on the page low and matches the visual model —
      // the user only sees one playing tile at a time.
      if (this.activeVideo && this.activeVideo !== video) {
        this.pauseActive();
      }
      this.activeTile = tile;
      this.activeVideo = video;
      tile.classList.add('is-rolling');

      const p = video.play();
      if (p && typeof p.catch === 'function') {
        // Rejection happens for two reasons: autoplay policy (rare here since
        // the video is muted) and play() interruption when a rapid hover
        // pauses this video before it finished starting. Both are safe to
        // swallow — the user has already moved on.
        p.catch(() => {});
      }
    }

    onUnhover(tile, video) {
      // Only clear active state if THIS tile is still the active one. Rapid
      // hovers can fire mouseleave on tile A after mouseenter on tile B
      // already swapped active to B — don't blow that away.
      if (this.activeVideo === video) {
        this.activeTile = null;
        this.activeVideo = null;
      }
      tile.classList.remove('is-rolling');
      try {
        video.pause();
      } catch (_) {
        /* noop */
      }
    }

    pauseActive() {
      if (!this.activeVideo) return;
      try {
        this.activeVideo.pause();
      } catch (_) {
        /* noop */
      }
      if (this.activeTile) this.activeTile.classList.remove('is-rolling');
      this.activeTile = null;
      this.activeVideo = null;
    }
  }

  // ─── Filter prune controller (Phase 3) ────────────────────────────────────
  //
  // Generic pruning for Finsweet Attributes 2 filter options. When a filter
  // dropdown on a category page (Music Videos, Film & TV, etc.) is fed by a
  // separate CMS Collection List — e.g. a Directors roster feeding a
  // "filter by director" dropdown — the dropdown will contain options for
  // records that have no matching items in the current page's list. Example:
  // the Directors roster has 28 directors but only 15 of them have made a
  // music video, so the dropdown on /music-videos is padded with 13 options
  // that filter to zero results.
  //
  // This controller hides those dead options automatically. It scans the
  // list items' `fs-list-field` cells for unique values, then toggles the
  // display of any filter input whose `fs-list-value` isn't in that set.
  // Generic across field names — works the same for director, producer,
  // long-form/short-form, and any future filter category without code
  // changes. Same logic on Music Videos, Film & TV, director archive pages.
  //
  // DOM contract:
  //
  //   <div fs-list-element="list"> … items … </div>      ← the filtered list
  //     <div class="w-dyn-item">
  //       <a fs-list-field="director">Sam Brown</a>      ← source of truth
  //     </div>
  //
  //   <form>                                             ← separate location
  //     <label class="w-dyn-item">                       ← wrapper that hides
  //       <input fs-list-field="director"                ← filter declares
  //              fs-list-value="Sam Brown" />            ← which value
  //     </label>
  //   </form>
  //
  // The wrapper that gets display:none'd is the closest .w-dyn-item (the
  // Collection Item boundary) or, failing that, the closest label/parent —
  // so the whole row disappears, not just the input.
  //
  // Re-prunes when the list DOM changes (Finsweet load-more, pagination,
  // or any dynamic item addition). Debounced via rAF so a burst of item
  // insertions only triggers one recompute.
  //
  // Notes:
  //   - Pruning only looks at textContent of list items' fs-list-field cells.
  //     Finsweet's own filter state (display:none items) doesn't change that
  //     — the full universe of list items is always considered, so an active
  //     director filter doesn't falsely shrink the dropdown.
  //   - Filter inputs INSIDE the list container are ignored (those are item
  //     data cells, not filter controls).
  //   - Whitespace-only textContent is ignored — avoids matching placeholder
  //     or empty cells.

  class FilterPruneController {
    constructor(options) {
      this.opts = Object.assign(
        {
          listSelector: '[fs-list-element="list"]',
          // Filter inputs to prune — anything with both fs-list-field and
          // fs-list-value declared (the Finsweet pattern for radios /
          // checkboxes / selects).
          filterSelector: '[fs-list-field][fs-list-value]',
          // Element to hide when the option is pruned. First match wins;
          // .w-dyn-item covers the Webflow CMS case, label covers static
          // lists, parentElement is the last resort.
          wrapperSelectors: ['.w-dyn-item', 'label', '[data-rogue-filter-option]'],
        },
        options || {}
      );

      this.list = document.querySelector(this.opts.listSelector);
      if (!this.list) {
        console.info('[RogueFilms] filter prune: no [fs-list-element="list"] on page');
        return;
      }

      this.refreshFilterInputs();
      if (this.filterInputs.length === 0) {
        console.info(
          '[RogueFilms] filter prune: no filter inputs with fs-list-value on page'
        );
        // Still observe — filter inputs may render late (e.g. Collection List
        // with CMS binding mounts after the script runs).
      }

      // Monotonically growing set of values we've ever seen per field. The
      // "present" universe for the purposes of pruning is the union of every
      // observation since init, not the momentary list state. Without this,
      // when Finsweet's filter removes non-matching items from the DOM
      // (which v2 does for fs-list-load="infinite" mode), a subsequent
      // prune would see only the filtered-in director and hide every other
      // option in the dropdown — which produces a degenerate UX where
      // selecting a director empties the dropdown of all other options and
      // the user can't switch to a different director without resetting.
      this.seenValues = new Map();

      this.pendingRaf = 0;
      this.scheduleUpdate();
      this.observe();

      console.info(
        '[RogueFilms] filter prune initialised — ' +
          this.filterInputs.length +
          ' filter input(s) across ' +
          this.fieldsToPrune.size +
          ' field(s)'
      );
    }

    refreshFilterInputs() {
      // Only consider inputs that live OUTSIDE the list — inputs inside the
      // list are item data cells, not filter controls.
      this.filterInputs = Array.from(
        document.querySelectorAll(this.opts.filterSelector)
      ).filter((el) => !this.list.contains(el));
      this.fieldsToPrune = new Set(
        this.filterInputs.map((el) => el.getAttribute('fs-list-field'))
      );
    }

    // Collect the unique textContent values for a given fs-list-field within
    // the list. Reads all items regardless of Finsweet filter state — the
    // goal is to know what values COULD match, not what's currently shown.
    collectFieldValues(field) {
      const cells = this.list.querySelectorAll(
        '[fs-list-field="' + field + '"]'
      );
      const values = new Set();
      cells.forEach((cell) => {
        const text = (cell.textContent || '').trim();
        if (text) values.add(text);
      });
      return values;
    }

    findWrapper(input) {
      for (const sel of this.opts.wrapperSelectors) {
        const match = input.closest(sel);
        if (match) return match;
      }
      return input.parentElement || input;
    }

    prune() {
      // Re-collect inputs in case the filter's own Collection List rendered
      // more options since init.
      this.refreshFilterInputs();

      this.fieldsToPrune.forEach((field) => {
        // Union newly-observed values into the seen set for this field.
        // Seen values are never removed — see constructor comment for why.
        const currentlyPresent = this.collectFieldValues(field);
        let seen = this.seenValues.get(field);
        if (!seen) {
          seen = new Set();
          this.seenValues.set(field, seen);
        }
        currentlyPresent.forEach((v) => seen.add(v));

        this.filterInputs
          .filter((el) => el.getAttribute('fs-list-field') === field)
          .forEach((input) => {
            const value = input.getAttribute('fs-list-value');
            const wrapper = this.findWrapper(input);
            if (!wrapper) return;
            const shouldShow = seen.has(value);
            // Use a data attribute as the authoritative "we hid this" marker
            // so we can undo it cleanly and avoid fighting with Webflow's
            // w-condition-invisible or any other visibility controllers.
            if (shouldShow) {
              if (wrapper.dataset.rogueFilterPruned === 'true') {
                wrapper.style.display = '';
                delete wrapper.dataset.rogueFilterPruned;
              }
            } else if (wrapper.dataset.rogueFilterPruned !== 'true') {
              wrapper.style.display = 'none';
              wrapper.dataset.rogueFilterPruned = 'true';
            }
          });
      });
    }

    scheduleUpdate() {
      if (this.pendingRaf) return;
      this.pendingRaf = requestAnimationFrame(() => {
        this.pendingRaf = 0;
        this.prune();
      });
    }

    observe() {
      if (typeof MutationObserver !== 'function') return;
      // Watch the list for pagination / load-more additions, and the whole
      // document for filter inputs being rendered late (Finsweet or Webflow
      // Collection List mounting after initial boot).
      this.listObserver = new MutationObserver(() => this.scheduleUpdate());
      this.listObserver.observe(this.list, { childList: true, subtree: true });

      this.docObserver = new MutationObserver((mutations) => {
        // Only re-run if something outside the list added/removed nodes that
        // could affect filter inputs. Cheap guard — we don't want every
        // lightbox open to trigger a prune.
        for (const m of mutations) {
          if (this.list.contains(m.target)) continue;
          if (m.addedNodes.length || m.removedNodes.length) {
            this.scheduleUpdate();
            return;
          }
        }
      });
      this.docObserver.observe(document.body, { childList: true, subtree: true });
    }
  }

  // ─── Filter label controller (Phase 3) ────────────────────────────────────
  //
  // Mirrors the currently-active Finsweet filter value into a designer-
  // authored label element. Intended use case: the dropdown toggle shows
  // "All directors" by default, and when the user picks Sam Brown from the
  // dropdown the toggle text changes to "Sam Brown". Clicking the Finsweet
  // clear button reverts it to the default text.
  //
  // Generic across fields — the same controller handles director filters on
  // /music-videos, long-form/short-form filters on the upcoming /film-tv, and
  // any future filter category without code changes.
  //
  // DOM contract:
  //
  //   <div class="dropdown-toggle">
  //     <span data-rogue-filter-label="director"
  //           data-rogue-filter-label-default="All directors">
  //       All directors
  //     </span>
  //   </div>
  //
  //   <!-- elsewhere on the page, the Finsweet radio/checkbox inputs -->
  //   <input fs-list-field="director" fs-list-value="Sam Brown" />
  //
  // The default text to show when no filter is active can be given
  // explicitly via data-rogue-filter-label-default. If that attribute is
  // absent, the element's initial textContent at init time is used as the
  // default — so designers can just type "All directors" into the Designer
  // and it becomes the fallback automatically.
  //
  // Multiple selections (Finsweet checkbox filters) are joined with ", " by
  // default. Override via options.joinMultiple if a page needs different
  // formatting ("3 selected" etc.).
  //
  // The controller watches for:
  //   - `change` events on filter inputs (covers the normal user pathway)
  //   - Clicks on [fs-list-element="clear"] buttons (Finsweet's clear UI).
  //     After Finsweet processes the clear, radios become unchecked but the
  //     change event isn't always fired on each input — we re-sync shortly
  //     after the click to catch up.

  class FilterLabelController {
    constructor(options) {
      this.opts = Object.assign(
        {
          labelSelector: '[data-rogue-filter-label]',
          defaultAttribute: 'data-rogue-filter-label-default',
          filterSelector: 'input[fs-list-field][fs-list-value]',
          clearSelector: '[fs-list-element="clear"]',
          joinMultiple: ', ',
        },
        options || {}
      );

      this.labels = Array.from(document.querySelectorAll(this.opts.labelSelector));
      if (this.labels.length === 0) {
        console.info(
          '[RogueFilms] filter label: no [data-rogue-filter-label] on page'
        );
        return;
      }

      // Snapshot default text before anything else changes the DOM. Skipped
      // if the designer set the explicit attribute — that's authoritative.
      this.labels.forEach((label) => {
        if (!label.getAttribute(this.opts.defaultAttribute)) {
          label.setAttribute(
            this.opts.defaultAttribute,
            (label.textContent || '').trim()
          );
        }
      });

      this.sync();
      this.bindEvents();

      console.info(
        '[RogueFilms] filter label initialised — ' +
          this.labels.length +
          ' label(s)'
      );
    }

    bindEvents() {
      // Any filter input change — recompute all labels. Cheap; runs
      // infrequently (only on user interaction).
      document.addEventListener('change', (e) => {
        if (e.target.closest && e.target.closest(this.opts.filterSelector)) {
          this.sync();
        }
      });

      // Finsweet's clear button — schedule a sync after the clear has been
      // processed. Two staggered syncs give it time to actually uncheck
      // the radios regardless of Finsweet internal timing.
      document.addEventListener('click', (e) => {
        if (e.target.closest && e.target.closest(this.opts.clearSelector)) {
          setTimeout(() => this.sync(), 0);
          setTimeout(() => this.sync(), 120);
        }
      });
    }

    sync() {
      this.labels.forEach((label) => {
        const field = label.getAttribute('data-rogue-filter-label');
        if (!field) return;
        const checkedInputs = document.querySelectorAll(
          'input[fs-list-field="' + field + '"][fs-list-value]:checked'
        );
        if (checkedInputs.length === 0) {
          label.textContent = label.getAttribute(this.opts.defaultAttribute) || '';
          return;
        }
        const values = Array.from(checkedInputs)
          .map((i) => i.getAttribute('fs-list-value'))
          .filter(Boolean);
        label.textContent = values.join(this.opts.joinMultiple);
      });
    }
  }

  // ─── Hero video controller (Homepage) ──────────────────────────────────
  //
  // Single-video hero. Autoplays muted (browser autoplay policy), provides
  // a mute/unmute toggle that flips audio on user interaction, and lets
  // the video size to its intrinsic aspect ratio (no cover, no min-height)
  // so anamorphic sources just work without a separate 16x9 render.
  //
  // DOM contract:
  //
  //   <section data-rogue-hero>
  //     <video data-rogue-hero-video
  //            src="https://.../hero-video.mp4"
  //            autoplay muted loop playsinline
  //            poster="..."></video>
  //     <button data-rogue-hero-mute-toggle type="button" aria-pressed="false">
  //       <!-- Designer owns the visual — both states are typically combo
  //            classes on the toggle (.is-audio-on / default) for icon
  //            swap. Controller sets:
  //              aria-pressed="false" when muted (default)
  //              aria-pressed="true"  when unmuted
  //            and adds .is-audio-on to both the toggle and the hero root
  //            while audio is playing. -->
  //     </button>
  //   </section>
  //
  // CSS contract: Designer sets the video's display/width/height in
  // Webflow — typically `display:block; width:100%; height:auto;` so
  // the page flows around the video's intrinsic height. Do NOT set
  // aspect-ratio on the video or force min-height on the hero; let the
  // file drive.
  //
  // Autoplay policy: videos with the `muted` + `playsinline` attributes
  // are allowed to autoplay on all major browsers (including iOS Safari).
  // The controller enforces muted on boot as a belt-and-braces in case
  // the designer forgot one of those attributes. First user interaction
  // with the toggle then permits audio. If initial play() rejects (rare —
  // usually missing one of the required attributes) the controller retries
  // silently on the next canplay.

  class HeroVideoController {
    constructor(options) {
      this.opts = Object.assign(
        {
          rootSelector: '[data-rogue-hero]',
          videoSelector: '[data-rogue-hero-video]',
          toggleSelector: '[data-rogue-hero-mute-toggle]',
        },
        options || {}
      );

      this.root = document.querySelector(this.opts.rootSelector);
      if (!this.root) {
        console.info('[RogueFilms] hero root not found; skipping controller');
        return;
      }

      this.video = this.root.querySelector(this.opts.videoSelector);
      if (!this.video) {
        console.warn('[RogueFilms] hero video element missing');
        return;
      }

      this.toggle = this.root.querySelector(this.opts.toggleSelector);

      this.prepareVideo();
      this.bindEvents();
      this.syncToggleState();

      console.info('[RogueFilms] hero video initialised');
    }

    prepareVideo() {
      // Belt-and-braces — these should already be set via HTML attributes
      // in Webflow, but enforcing them here avoids a silent autoplay failure
      // if the designer forgot one.
      this.video.muted = true;
      this.video.loop = true;
      this.video.playsInline = true;
      this.video.setAttribute('playsinline', '');
      this.video.setAttribute('webkit-playsinline', '');

      const p = this.video.play();
      if (p && typeof p.catch === 'function') {
        p.catch(() => {
          // Rare — usually indicates a missing attribute. Retry once on
          // canplay, which will succeed if the video has decoded enough
          // data and the page has met the autoplay policy.
          this.video.addEventListener(
            'canplay',
            () => {
              const retry = this.video.play();
              if (retry && typeof retry.catch === 'function') retry.catch(() => {});
            },
            { once: true }
          );
        });
      }
    }

    bindEvents() {
      if (this.toggle) {
        this.toggle.addEventListener('click', (e) => {
          e.preventDefault();
          this.toggleAudio();
        });
      }

      // Pause when the tab is hidden, resume when visible. Saves battery
      // and stops the audio continuing while the user is elsewhere.
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          try {
            this.video.pause();
          } catch (_) {
            /* noop */
          }
        } else {
          const p = this.video.play();
          if (p && typeof p.catch === 'function') p.catch(() => {});
        }
      });
    }

    toggleAudio() {
      this.video.muted = !this.video.muted;
      this.syncToggleState();
    }

    // Reflect the muted state onto both the hero root and the toggle
    // button so Webflow can drive the icon/label swap via combo classes
    // (.is-audio-on) and CSS. Also updates aria-pressed + aria-label for
    // keyboard / screen reader users.
    syncToggleState() {
      const audioOn = !this.video.muted;
      this.root.classList.toggle('is-audio-on', audioOn);
      if (this.toggle) {
        this.toggle.classList.toggle('is-audio-on', audioOn);
        this.toggle.setAttribute('aria-pressed', String(audioOn));
        this.toggle.setAttribute('aria-label', audioOn ? 'Mute' : 'Unmute');
      }
    }
  }

  // ─── Namespace + boot ────────────────────────────────────────────────────

  const RogueFilms = {
    version: VERSION,
    _controllers: {},

    initTalentPage(options) {
      const controller = new TalentController(options);
      RogueFilms._controllers.talent = controller;
      return controller;
    },

    initLightbox(options) {
      if (RogueFilms._controllers.lightbox) return RogueFilms._controllers.lightbox;
      const controller = new LightboxController(options);
      RogueFilms._controllers.lightbox = controller;
      return controller;
    },

    initGridHover(options) {
      if (RogueFilms._controllers.gridHover) return RogueFilms._controllers.gridHover;
      const controller = new GridHoverController(options);
      RogueFilms._controllers.gridHover = controller;
      return controller;
    },

    initFilterPrune(options) {
      if (RogueFilms._controllers.filterPrune) return RogueFilms._controllers.filterPrune;
      const controller = new FilterPruneController(options);
      RogueFilms._controllers.filterPrune = controller;
      return controller;
    },

    initFilterLabel(options) {
      if (RogueFilms._controllers.filterLabel) return RogueFilms._controllers.filterLabel;
      const controller = new FilterLabelController(options);
      RogueFilms._controllers.filterLabel = controller;
      return controller;
    },

    initHeroVideo(options) {
      if (RogueFilms._controllers.heroVideo) return RogueFilms._controllers.heroVideo;
      const controller = new HeroVideoController(options);
      RogueFilms._controllers.heroVideo = controller;
      return controller;
    },
  };

  // Auto-init the lightbox if an overlay exists on the page. Safe on pages
  // without triggers — the controller just sits idle.
  function autoInitLightbox() {
    if (document.querySelector('[data-rogue-lightbox]')) {
      RogueFilms.initLightbox();
    }
  }

  // Auto-init grid hover if any tile is marked. Controller no-ops on touch
  // devices and reduced-motion preference, so this is safe to wire site-wide.
  function autoInitGridHover() {
    if (document.querySelector('[data-rogue-grid-tile]')) {
      RogueFilms.initGridHover();
    }
  }

  // Auto-init filter prune if a Finsweet list exists AND there's at least
  // one filter input with fs-list-value on the page. Safe on pages without
  // either (controller early-returns, observer never starts).
  function autoInitFilterPrune() {
    if (
      document.querySelector('[fs-list-element="list"]') &&
      document.querySelector('[fs-list-field][fs-list-value]')
    ) {
      RogueFilms.initFilterPrune();
    }
  }

  // Auto-init filter label if any [data-rogue-filter-label] exists. Safe
  // no-op otherwise.
  function autoInitFilterLabel() {
    if (document.querySelector('[data-rogue-filter-label]')) {
      RogueFilms.initFilterLabel();
    }
  }

  // Auto-init hero video if a hero root is marked. Safe on pages without
  // one — controller early-returns.
  function autoInitHeroVideo() {
    if (document.querySelector('[data-rogue-hero]')) {
      RogueFilms.initHeroVideo();
    }
  }

  function boot() {
    injectRuntimeCSS();
    autoInitLightbox();
    autoInitGridHover();
    autoInitFilterPrune();
    autoInitFilterLabel();
    autoInitHeroVideo();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.RogueFilms = RogueFilms;

  if (typeof console !== 'undefined' && console.info) {
    console.info('[RogueFilms] v' + VERSION + ' loaded');
  }
})();
