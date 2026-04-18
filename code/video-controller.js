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

  const VERSION = '0.2.0-phase2';

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

      this.directors = this.directorEls.map((el, i) => ({
        id: el.dataset.rogueDirector,
        name: (el.textContent || '').trim(),
        videoUrl: el.dataset.rogueVideoUrl || '',
        isRebel: el.dataset.rogueIsRebel === 'true',
        el,
        index: i,
      }));

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
      this.show(0, { instant: true });
      this.queuePreload(this.nextIndexInFilter(0));
      if (!this.state.reducedMotion) this.startAutoRotate();
    }

    prepareVideoElements() {
      [this.videos.active, this.videos.preload].forEach((v) => {
        v.muted = true;
        v.loop = true;
        v.playsInline = true;
        v.setAttribute('playsinline', '');
        v.setAttribute('webkit-playsinline', '');
        v.style.transition = `opacity ${this.opts.crossfadeMs}ms var(--motion-easing-standard, cubic-bezier(0.4, 0, 0.2, 1))`;
      });
      this.videos.active.style.opacity = '1';
      this.videos.preload.style.opacity = '0';
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

      // If preload already has the right URL, swap. Otherwise set and play.
      const preloadHasCorrectSrc =
        this.videos.preload.src.indexOf(director.videoUrl) >= 0 &&
        director.videoUrl;

      if (!preloadHasCorrectSrc) {
        this.setVideoSrc(this.videos.preload, director.videoUrl);
      }

      this.playSafe(this.videos.preload);

      // Crossfade
      if (instant) {
        this.videos.active.style.opacity = '0';
        this.videos.preload.style.opacity = '1';
      } else {
        requestAnimationFrame(() => {
          this.videos.active.style.opacity = '0';
          this.videos.preload.style.opacity = '1';
        });
      }

      // Swap roles: preload becomes new active, active becomes new preload
      const tmp = this.videos.active;
      this.videos.active = this.videos.preload;
      this.videos.preload = tmp;
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
          /* autoplay may be blocked; the crossfade still occurs */
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
