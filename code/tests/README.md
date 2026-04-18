# Tests

Playwright-based browser tests for the Rogue Films v2 site.

## Setup (once)

```bash
npm install
npm run test:install   # downloads browser engines
```

## Running

```bash
# against the default Webflow staging URL (roguefilms-<hash>.webflow.io)
npm test

# against a specific URL
BASE_URL=https://www.roguefilms.co.uk npm test

# just the talent page
npm run test:talent

# debug / headed mode
npx playwright test --headed --project=chromium code/tests/talent.spec.js
```

## Test files

- `talent.spec.js` — Phase 2. DOM contract, video playback, hover swap, filters, reduced-motion, navigation.
- More suites come in later phases (lightbox, homepage grid, CMS URL validation).

## Prerequisites for each suite

- **talent.spec.js**: the Talent v2 page must be published (draft OK on staging). Controller JS must be reachable via jsDelivr (push to main takes ~1 minute to propagate).

## What the suites don't test

- Visual regressions (use Lighthouse + BrowserStack for that in Phase 7).
- Vimeo URL validity across 700+ items (separate Node script in Phase 7).
- Accessibility (axe-core will run in Phase 7).
