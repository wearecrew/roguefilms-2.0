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

  const VERSION = '0.5.1-phase3';

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
          triggerSelector: '[data-rogue-showreel-url]',
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
          const url = trigger.dataset.rogueShowreelUrl;
          if (!url) return;
          e.preventDefault();
          this.open(url);
        },
        false
      );

      if (this.closeBtn) this.closeBtn.addEventListener('click', () => this.close());
      if (this.backdrop) this.backdrop.addEventListener('click', () => this.close());
      if (this.prevBtn) this.prevBtn.addEventListener('click', () => this.prev());
      if (this.nextBtn) this.nextBtn.addEventListener('click', () => this.next());

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

      // Delegate Back pill + Copy-link + inline prev/next clicks inside the
      // lightbox body. Content is fetched + injected, so listeners need to
      // be delegated. The inline prev/next buttons (data-rogue-showreel-prev
      // / data-rogue-showreel-next) are the same ones that live in the
      // showreel content on the standalone page. Inside the overlay they
      // share the controller's prev/next logic; outside the overlay they're
      // inert unless Phase 6 wires them up for director-archive navigation.
      this.overlay.addEventListener('click', (e) => {
        const backBtn = e.target.closest('[data-rogue-showreel-back]');
        if (backBtn) {
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
        const prevBtn = e.target.closest('[data-rogue-showreel-prev]');
        if (prevBtn) {
          e.preventDefault();
          this.prev();
          return;
        }
        const nextBtn = e.target.closest('[data-rogue-showreel-next]');
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
        (t) => t.dataset.rogueShowreelUrl === url
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

    prev() {
      const triggers = this.getTriggers();
      if (triggers.length < 2) return;
      const next = (this.state.currentIndex - 1 + triggers.length) % triggers.length;
      this.open(triggers[next].dataset.rogueShowreelUrl);
    }

    next() {
      const triggers = this.getTriggers();
      if (triggers.length < 2) return;
      const next = (this.state.currentIndex + 1) % triggers.length;
      this.open(triggers[next].dataset.rogueShowreelUrl);
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
  };

  // Auto-init the lightbox if an overlay exists on the page. Safe on pages
  // without triggers — the controller just sits idle.
  function autoInitLightbox() {
    if (document.querySelector('[data-rogue-lightbox]')) {
      RogueFilms.initLightbox();
    }
  }

  function boot() {
    injectRuntimeCSS();
    autoInitLightbox();
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
