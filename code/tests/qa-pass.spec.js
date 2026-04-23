// @ts-check
const { test } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

/**
 * QA pass — walks every key page, captures:
 *  - console errors + pageerrors
 *  - failed network requests (4xx/5xx, ERR_*)
 *  - horizontal overflow (any page wider than viewport)
 *  - empty / #void / javascript: hrefs
 *  - broken images (loaded but naturalWidth === 0)
 *  - grid computed columns on mobile (should be 1 on ≤480px for most grids)
 *  - video element state (src, muted, paused, dimensions)
 *  - full-page screenshot
 *
 * Output: test-results/qa-pass-<project>/<page>-findings.json + -full.png
 * Each page runs in its own test, so one failing page does not halt the rest.
 */

const PAGES = [
  { name: '01-home', path: '/' },
  { name: '02-talent', path: '/talent' },
  { name: '03-music-videos', path: '/music-videos' },
  { name: '04-film-tv', path: '/film-tv' },
  { name: '05-director-detail', path: '/directors-roster/andrew-de-zen' },
  { name: '06-showreel-detail', path: '/director-showreels/welcome-to-my-bank-2' },
];

const OUT_ROOT = path.resolve(__dirname, '..', '..', 'test-results', 'qa-pass');
fs.mkdirSync(OUT_ROOT, { recursive: true });

for (const pg of PAGES) {
  test(`QA :: ${pg.name}`, async ({ page, browserName }, testInfo) => {
    const consoleErrors = [];
    const failedRequests = [];
    const seenFailed = new Set();

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push({
          type: 'console.error',
          text: msg.text().slice(0, 500),
          location: msg.location(),
        });
      }
    });
    page.on('pageerror', (err) => {
      consoleErrors.push({ type: 'pageerror', text: String(err.message).slice(0, 500) });
    });
    page.on('requestfailed', (req) => {
      const key = `FAIL|${req.url()}|${req.failure()?.errorText}`;
      if (seenFailed.has(key)) return;
      seenFailed.add(key);
      failedRequests.push({
        url: req.url(),
        method: req.method(),
        resourceType: req.resourceType(),
        errorText: req.failure()?.errorText,
      });
    });
    page.on('response', async (resp) => {
      const status = resp.status();
      if (status < 400) return;
      const key = `HTTP|${resp.url()}|${status}`;
      if (seenFailed.has(key)) return;
      seenFailed.add(key);
      failedRequests.push({
        url: resp.url(),
        status,
        method: resp.request().method(),
        resourceType: resp.request().resourceType(),
      });
    });

    let navError = null;
    try {
      await page.goto(pg.path, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    } catch (e) {
      navError = String(e.message);
    }
    // Give videos + deferred scripts time to settle.
    await page.waitForTimeout(2500);

    const viewport = page.viewportSize() || { width: 0, height: 0 };
    const projectTag = testInfo.project.name;
    const outDir = path.join(OUT_ROOT, projectTag);
    fs.mkdirSync(outDir, { recursive: true });
    const fileBase = path.join(outDir, pg.name);

    let screenshotErr = null;
    try {
      await page.screenshot({ path: `${fileBase}-full.png`, fullPage: true });
    } catch (e) {
      screenshotErr = String(e.message);
    }

    const pageData = await page.evaluate(() => {
      const docW = document.documentElement.scrollWidth;
      const viewW = window.innerWidth;

      const anchors = Array.from(document.querySelectorAll('a'));
      const badLinks = anchors
        .filter((a) => {
          const h = a.getAttribute('href');
          return !h || h === '#' || /^javascript:/i.test(h);
        })
        .map((a) => ({
          text: (a.textContent || '').trim().slice(0, 60),
          href: a.getAttribute('href') || '(empty)',
          classes: a.className || '',
        }));

      const imgs = Array.from(document.querySelectorAll('img'));
      const brokenImages = imgs
        .filter((img) => img.complete && img.naturalWidth === 0)
        .map((img) => ({ src: img.currentSrc || img.src, alt: img.alt || '(no alt)' }));

      // Grid audit — list every element whose computed display is grid,
      // recording its column count at the current viewport.
      const gridHosts = Array.from(document.querySelectorAll('*')).filter((el) => {
        const cs = getComputedStyle(el);
        return cs.display === 'grid' || cs.display === 'inline-grid';
      });
      const gridInfo = gridHosts.slice(0, 40).map((el) => {
        const cs = getComputedStyle(el);
        const cols = (cs.gridTemplateColumns || '').trim().split(/\s+/).filter(Boolean);
        return {
          selector:
            el.tagName.toLowerCase() +
            (el.id ? `#${el.id}` : '') +
            (el.className
              ? '.' +
                String(el.className)
                  .split(/\s+/)
                  .filter(Boolean)
                  .slice(0, 3)
                  .join('.')
              : ''),
          gridTemplateColumns: cs.gridTemplateColumns,
          columnCount: cols.length,
          childCount: el.children.length,
          widthPx: Math.round(el.getBoundingClientRect().width),
        };
      });

      const videos = Array.from(document.querySelectorAll('video')).map((v) => ({
        src: (v.currentSrc || v.src || '').slice(0, 200),
        muted: v.muted,
        paused: v.paused,
        readyState: v.readyState,
        autoplay: v.autoplay,
        loop: v.loop,
        width: v.clientWidth,
        height: v.clientHeight,
        hidden:
          v.offsetParent === null ||
          getComputedStyle(v).visibility === 'hidden' ||
          getComputedStyle(v).display === 'none',
      }));

      // Rogue module
      const rogueModule = window.RogueFilms
        ? {
            version: window.RogueFilms.version || null,
            hasInitTalent: typeof window.RogueFilms.initTalentPage === 'function',
            hasInitLightbox: typeof window.RogueFilms.initLightbox === 'function',
            hasInitHero: typeof window.RogueFilms.initHeroVideo === 'function',
          }
        : null;

      // Check for body background leaking (e.g. .hero_media overflow)
      const bodyBg = getComputedStyle(document.body).backgroundColor;
      const htmlBg = getComputedStyle(document.documentElement).backgroundColor;

      return {
        title: document.title,
        overflow: { docW, viewW, overflows: docW - viewW > 1 },
        badLinks,
        brokenImages,
        gridInfo,
        videos,
        rogueModule,
        bodyBg,
        htmlBg,
      };
    });

    const findings = {
      page: pg.name,
      path: pg.path,
      url: page.url(),
      project: projectTag,
      browser: browserName,
      viewport,
      navError,
      screenshotErr,
      consoleErrors,
      failedRequests,
      ...pageData,
    };

    fs.writeFileSync(`${fileBase}-findings.json`, JSON.stringify(findings, null, 2));

    // Also write a compact line to a shared log for quick scanning.
    const logLine = {
      page: pg.name,
      project: projectTag,
      vw: viewport.width,
      title: pageData.title,
      errs: consoleErrors.length,
      netFails: failedRequests.length,
      badLinks: pageData.badLinks.length,
      brokenImgs: pageData.brokenImages.length,
      overflows: pageData.overflow.overflows,
      docW: pageData.overflow.docW,
      videos: pageData.videos.length,
      rogueVer: pageData.rogueModule?.version || null,
    };
    fs.appendFileSync(
      path.join(OUT_ROOT, 'summary.jsonl'),
      JSON.stringify(logLine) + '\n'
    );

    // Always pass — this is a data-gathering run, not an assertion suite.
    // The report surfaces every issue; failing would just hide later pages.
  });
}
