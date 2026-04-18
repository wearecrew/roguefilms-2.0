// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Talent page — background-swap controller behaviour.
 *
 * Tests hit the staging URL set via BASE_URL env or playwright.config.js default.
 * The tests assume the page has been built per docs/phase-2-talent-build.md and
 * published to the staging environment. If the page isn't live yet, every test
 * in this file will fail at the navigation step — that's the expected signal.
 */

const TALENT_PATH = '/talent-v2';

test.describe('Talent page: loads + DOM contract', () => {
  test('page renders the controller root and background videos', async ({ page }) => {
    await page.goto(TALENT_PATH);

    await expect(page.locator('[data-rogue-talent]')).toBeVisible();
    await expect(page.locator('[data-rogue-talent-bg="active"]')).toBeAttached();
    await expect(page.locator('[data-rogue-talent-bg="preload"]')).toBeAttached();
  });

  test('Filter pills are present with correct values', async ({ page }) => {
    await page.goto(TALENT_PATH);

    for (const value of ['all', 'rogue', 'rebel', 'reset']) {
      const pill = page.locator(`[data-rogue-talent-filter="${value}"]`);
      await expect(pill, `pill ${value}`).toBeVisible();
    }
  });

  test('At least one director link is rendered with required attributes', async ({ page }) => {
    await page.goto(TALENT_PATH);

    const directors = page.locator('[data-rogue-director]');
    const count = await directors.count();
    expect(count, 'at least one director link').toBeGreaterThan(0);

    const first = directors.first();
    await expect(first, 'director has data-rogue-director slug').toHaveAttribute(
      'data-rogue-director',
      /.+/
    );
    await expect(first, 'director has data-rogue-video-url').toHaveAttribute(
      'data-rogue-video-url',
      /^https?:\/\//
    );
    await expect(first, 'director has data-rogue-is-rebel').toHaveAttribute(
      'data-rogue-is-rebel',
      /^(true|false)?$/
    );
    await expect(first, 'director link has an href').toHaveAttribute('href', /.+/);
  });

  test('RogueFilms module is loaded via jsDelivr', async ({ page }) => {
    await page.goto(TALENT_PATH);

    const hasModule = await page.evaluate(
      () => !!(window.RogueFilms && window.RogueFilms.initTalentPage)
    );
    expect(hasModule, 'window.RogueFilms.initTalentPage exists').toBe(true);

    const version = await page.evaluate(() => window.RogueFilms && window.RogueFilms.version);
    expect(version, 'controller reports a version').toBeTruthy();
  });
});

test.describe('Talent page: video playback', () => {
  test('Active background video begins playing on load', async ({ page }) => {
    await page.goto(TALENT_PATH);

    // Wait briefly for the controller to take over and start playback.
    await page.waitForTimeout(1000);

    const playing = await page.evaluate(() => {
      const v = document.querySelector('[data-rogue-talent-bg="active"]');
      if (!v) return false;
      return !v.paused && v.readyState > 2;
    });

    expect(playing, 'active background video is playing').toBe(true);
  });

  test('Initial active director has the .is-active class', async ({ page }) => {
    await page.goto(TALENT_PATH);
    await page.waitForTimeout(500);

    const activeCount = await page.locator('[data-rogue-director].is-active').count();
    expect(activeCount, 'exactly one director marked active').toBe(1);
  });
});

test.describe('Talent page: hover behaviour', () => {
  test('Hovering a director swaps the active class to that director', async ({ page }) => {
    await page.goto(TALENT_PATH);
    await page.waitForTimeout(500);

    const directors = page.locator('[data-rogue-director]');
    const second = directors.nth(1);
    const secondId = await second.getAttribute('data-rogue-director');

    await second.hover();
    await page.waitForTimeout(400); // allow crossfade to finish

    const activeDirector = await page
      .locator('[data-rogue-director].is-active')
      .getAttribute('data-rogue-director');

    expect(activeDirector).toBe(secondId);
  });

  test('Hovering loads the hovered director video URL into the now-active video element', async ({ page }) => {
    await page.goto(TALENT_PATH);
    await page.waitForTimeout(500);

    const directors = page.locator('[data-rogue-director]');
    const second = directors.nth(1);
    const expectedUrl = await second.getAttribute('data-rogue-video-url');

    await second.hover();
    await page.waitForTimeout(400);

    const loadedSrc = await page.evaluate(() => {
      const v = document.querySelector('[data-rogue-talent-bg="active"]');
      return v ? v.src : null;
    });

    expect(loadedSrc).toBe(expectedUrl);
  });
});

test.describe('Talent page: filters', () => {
  test('Filtering to Rogue hides rebels', async ({ page }) => {
    await page.goto(TALENT_PATH);
    await page.waitForTimeout(500);

    await page.locator('[data-rogue-talent-filter="rogue"]').click();
    await page.waitForTimeout(200);

    const hiddenRebels = await page.evaluate(() => {
      const rebels = document.querySelectorAll('[data-rogue-director][data-rogue-is-rebel="true"]');
      return Array.from(rebels).every((el) => el.style.display === 'none');
    });
    expect(hiddenRebels, 'all rebels are hidden').toBe(true);

    const visibleRogues = await page.evaluate(() => {
      const rogues = document.querySelectorAll(
        '[data-rogue-director]:not([data-rogue-is-rebel="true"])'
      );
      return Array.from(rogues).every((el) => el.style.display !== 'none');
    });
    expect(visibleRogues, 'all rogues are visible').toBe(true);
  });

  test('Filtering to Rebel hides non-rebels', async ({ page }) => {
    await page.goto(TALENT_PATH);
    await page.waitForTimeout(500);

    await page.locator('[data-rogue-talent-filter="rebel"]').click();
    await page.waitForTimeout(200);

    const allNonRebelsHidden = await page.evaluate(() => {
      const nonRebels = document.querySelectorAll(
        '[data-rogue-director]:not([data-rogue-is-rebel="true"])'
      );
      return Array.from(nonRebels).every((el) => el.style.display === 'none');
    });
    expect(allNonRebelsHidden).toBe(true);
  });

  test('Reset returns to showing all directors', async ({ page }) => {
    await page.goto(TALENT_PATH);
    await page.waitForTimeout(500);

    // Filter to rebel first
    await page.locator('[data-rogue-talent-filter="rebel"]').click();
    await page.waitForTimeout(200);

    // Reset
    await page.locator('[data-rogue-talent-filter="reset"]').click();
    await page.waitForTimeout(200);

    const allVisible = await page.evaluate(() => {
      const all = document.querySelectorAll('[data-rogue-director]');
      return Array.from(all).every((el) => el.style.display !== 'none');
    });
    expect(allVisible, 'all directors visible after reset').toBe(true);
  });
});

test.describe('Talent page: reduced motion', () => {
  test.use({ colorScheme: 'light', reducedMotion: 'reduce' });

  test('With prefers-reduced-motion, auto-rotate does not run and hover swaps instantly', async ({ page }) => {
    await page.goto(TALENT_PATH);
    await page.waitForTimeout(500);

    // Capture initial active director
    const initialActive = await page
      .locator('[data-rogue-director].is-active')
      .getAttribute('data-rogue-director');

    // Wait long enough that a normal auto-rotate would have fired (>6s)
    await page.waitForTimeout(7_000);

    const afterActive = await page
      .locator('[data-rogue-director].is-active')
      .getAttribute('data-rogue-director');

    expect(afterActive, 'auto-rotate suppressed under reduced motion').toBe(initialActive);

    // Hover a different director — should swap, but crossfade duration is 0 (instant)
    const directors = page.locator('[data-rogue-director]');
    const third = directors.nth(2);
    const thirdId = await third.getAttribute('data-rogue-director');

    await third.hover();
    await page.waitForTimeout(100); // just enough for the state update

    const nowActive = await page
      .locator('[data-rogue-director].is-active')
      .getAttribute('data-rogue-director');
    expect(nowActive, 'hover still swaps under reduced motion (instantly)').toBe(thirdId);
  });
});

test.describe('Talent page: navigation', () => {
  test('Clicking a director navigates to the director detail page', async ({ page }) => {
    await page.goto(TALENT_PATH);
    await page.waitForTimeout(500);

    const firstLink = page.locator('[data-rogue-director]').first();
    const href = await firstLink.getAttribute('href');
    expect(href, 'director link has an href').toBeTruthy();

    await firstLink.click();
    await page.waitForURL((url) => url.pathname === href, { timeout: 10_000 });
    expect(page.url()).toContain(href);
  });
});
