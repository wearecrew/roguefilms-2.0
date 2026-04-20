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
 *                 isn't present in the current page's list).
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

  const VERSION = '0.7.1-phase3';

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
      '/* Hide lightbox chrome when not inside a lightbox overlay.',
      '   Chrome lives inside [data-rogue-showreel-content] on the standalone',
      '   page so it can inherit layout. The standalone page should not show it.',
      '   When that content is fetched and injected into the lightbox body, the',
      '   :is() override re-shows it because the chrome then has a',
      '   [data-rogue-lightbox] ancestor. */',
      '[data-rogue-lightbox-close],',
      '[data-rogue-lightbox-prev],',
      '[data-rogue-lightbox-next] { display: none; }',
      '[data-rogue-lightbox] [data-rogue-lightbox-close],',
      '[data-rogue-lightbox] [data-rogue-lightbox-prev],',
      '[data-rogue-lightbox] [data-rogue-lightbox-next] { display: revert; }',
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
      this.state.currentUrl = url;
      this.state.currentIndex = triggers.findIndex(
        (t) => this.resolveTriggerUrl(t) === url
      );

      this.setOpen(true);
      this.renderLoading();

      try {
        const html = await this.fetchContent(url);
        // If the user has navigated to a different URL during fetch, bail.
        if (this.state.currentUrl !== url) return;
        this.body.innerHTML = html;
        this.applyVideoAspectRatios(this.body);
        this.autoplayVideoIfPresent(this.body);
        // Move focus into the freshly-injected chrome for keyboard users.
        // The close button is the natural landing target. If the chrome lives
        // at the overlay root instead, that selector still matches.
        const closeBtn = this.overlay.querySelector(
          '[data-rogue-lightbox-close], [data-rogue-showreel-back]'
        );
        if (closeBtn && document.activeElement !== closeBtn) closeBtn.focus();
      } catch (err) {
        console.error('[RogueFilms] lightbox fetch failed', err);
        this.body.innerHTML = this.renderErrorHtml(url);
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
      // internal links aren't counted), and only matches visible elements.
      return Array.from(document.querySelectorAll(this.opts.triggerSelector)).filter(
        (el) => !this.overlay.contains(el)
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
      if (triggers.length < 2) return;
      const next = (this.state.currentIndex - 1 + triggers.length) % triggers.length;
      this.open(this.resolveTriggerUrl(triggers[next]));
    }

    next() {
      const triggers = this.getTriggers();
      if (triggers.length < 2) return;
      const next = (this.state.currentIndex + 1) % triggers.length;
      this.open(this.resolveTriggerUrl(triggers[next]));
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

    renderLoading() {
      this.body.innerHTML =
        '<div style="padding: 80px 20px; text-align: center; opacity: 0.6;">Loading…</div>';
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

  function boot() {
    injectRuntimeCSS();
    autoInitLightbox();
    autoInitGridHover();
    autoInitFilterPrune();
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
