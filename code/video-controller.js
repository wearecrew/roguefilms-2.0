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
 *   3. Provide controllers for specific page patterns. Phase 2: Talent (background swap).
 *      Phase 3/4/6 will add: lightbox mode, grid hover mode.
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

  const VERSION = '0.4.1-phase2';

  // ─── Design-system runtime CSS ───────────────────────────────────────────
  //
  // Motion easings and durations live here as :root custom properties, since
  // Webflow's size variable type rejects cubic-bezier() and the ms suffix is
  // ergonomically needed for transition-duration.

  function injectRuntimeCSS() {
    if (document.getElementById('rogue-runtime-tokens')) return;
    const style = document.createElement('style');
    style.id = 'rogue-runtime-tokens';
    style.textContent = [
      ':root {',
      '  --motion-easing-standard: cubic-bezier(0.4, 0, 0.2, 1);',
      '  --motion-easing-in: cubic-bezier(0.4, 0, 1, 1);',
      '  --motion-easing-out: cubic-bezier(0, 0, 0.2, 1);',
      '  --motion-duration-fast: 150ms;',
      '  --motion-duration-normal: 300ms;',
      '  --motion-duration-slow: 500ms;',
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

      // Active-director class on the link
      this.directorEls.forEach((el) => {
        el.classList.toggle(
          'is-active',
          el.dataset.rogueDirector === director.id
        );
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

      // Highlight active pill
      this.root.querySelectorAll('[data-rogue-talent-filter]').forEach((btn) => {
        btn.classList.toggle(
          'is-active',
          btn.dataset.rogueTalentFilter === nextFilter &&
            nextFilter !== 'all'
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

  // ─── Namespace + boot ────────────────────────────────────────────────────

  const RogueFilms = {
    version: VERSION,
    _controllers: {},

    initTalentPage(options) {
      const controller = new TalentController(options);
      RogueFilms._controllers.talent = controller;
      return controller;
    },
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectRuntimeCSS);
  } else {
    injectRuntimeCSS();
  }

  window.RogueFilms = RogueFilms;

  if (typeof console !== 'undefined' && console.info) {
    console.info('[RogueFilms] v' + VERSION + ' loaded');
  }
})();
