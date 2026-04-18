# Handover to Claude Code

Context for the first Claude Code session picking up this project.

## Start here

1. Read `README.md` for project context, working principles, and status.
2. Read `PROJECT_PLAN.md` for the phased plan.
3. Read `docs/decisions.md` for decisions made to date.

## Current state (as of 2026-04-18)

Phase 0 (planning and audit) is essentially closed. We've:

- Audited the existing Webflow 2.0 site (Site ID `69dcac21fd295013e4344d52`).
- Completed a design walkthrough of six Figma frames: Homepage, Talent, Music Video, Film & TV, Director, Lightbox/Work detail.
- Locked the major architectural decisions (see `docs/decisions.md`).
- Created a new `Tokens` variable collection in the Designer and seeded it with the three core raw brand colours (navy, pink, cream) as a scaffold. Collection ID captured below.

Phase 1 (foundation) has been kicked off but not completed. The Tokens collection exists, needs populating with the full token tree from Figma.

## What to do first in this Code session

**1. Set up MCPs.** From the project directory:

```bash
claude mcp add webflow --scope project
```

Authenticate when prompted. Verify with `claude mcp list`.

If Figma desktop is running with its MCP server enabled, also add:

```bash
claude mcp add figma --scope project --transport sse --url http://127.0.0.1:3845/sse
```

(Adjust URL to match whatever port Figma is broadcasting on.)

**2. Connect to the Webflow Designer.** Open the Designer session for Roguefilms 2.0 in the browser and keep the tab in the foreground. If the MCP can't find the Designer, ask for the app-launch URL (Webflow MCP will provide it).

**3. Pick up Phase 1 token tree.** The Tokens collection exists but is almost empty. Complete it by:

- Reading the Figma file via Figma MCP for exact colour hex values, font families, font sizes, line heights, spacing values, and radii.
- Creating the raw colour palette under `color/raw/*` naming.
- Creating semantic colour tokens under `color/surface/*`, `color/text/*`, `color/interactive/*`, `color/border/*` referencing the raw tokens.
- Creating the spacing scale as size variables under `spacing/*` (rem-based, 8-step probably: 0.25, 0.5, 1, 1.5, 2, 3, 4, 6, 8).
- Creating the type scale as size variables under `type/size/*` (rem-based, with fluid clamp values where the Figma design indicates fluid behaviour).
- Creating font family variables under `type/family/*`.
- Creating border radius variables under `radius/*`.

Document the token tree in `docs/design-system.md` as you go.

**4. Then, begin Phase 2 (Talent page).** Create a new page `talent-v2` in the Designer. Use the Imperial.tv pattern documented in the brief and in `PROJECT_PLAN.md` Phase 2. Video controller for this page lives at `/code/video-controller.js`, embedded in the site via jsDelivr from this repo.

## Key context to carry over

- **CMS is fully populated already.** Don't re-import anything. New pages bind to existing collections.
- **Build new pages with temporary slugs**, don't modify v1 pages. Slug-swap at launch.
- **Video controller lives in this repo**, served via jsDelivr. Embed point in Webflow is a single `<script src>` tag.
- **Talent page first, it informs the controller architecture.** Once the Talent page is shipped, the grid pages follow.
- **Figma is the canonical source of truth.** No visual drift. Ask for values from Figma MCP rather than guessing.

## IDs for quick reference

```
Site ID (Roguefilms 2.0):       69dcac21fd295013e4344d52
Tokens collection ID:           collection-d1ebecc4-8a57-3cd3-4515-853ab0874009
Legacy Base collection ID:      collection-35e3f140-011b-d8a5-7f7a-3e693515ab56
Director showreels collection:  69dcac21fd295013e4344d5b
Directors rosters collection:   69dcac21fd295013e4344d5a
Work Types collection:          69dcac21fd295013e4344d5d
News collection:                69dcac21fd295013e4344d5c

Home page ID:                   69dcac21fd295013e4344d3c
Directors page ID (legacy):     69dcac21fd295013e4344d41
Director showreels template:    69dcac21fd295013e4344d3e
```

### Tokens collection contents so far

Raw colour palette (5 variables, known-confident values from Figma):
- `color/raw/navy` = #00162c
- `color/raw/pink` = #f25d78
- `color/raw/cream` = #f1f2eb
- `color/raw/black` = #000000
- `color/raw/white` = #ffffff

Semantic colour tokens (5 variables, referencing raw):
- `color/surface/primary` → raw/navy (page background)
- `color/text/body` → raw/cream (primary text on navy)
- `color/brand/accent` → raw/pink (logo, accent, active states)
- `color/interactive/default` → raw/pink (default link colour)
- `color/interactive/hover` → raw/cream (hover link colour)

**What's still to add (do this from Figma MCP):**
- Additional raw colours if Figma uses more than these five
- Additional semantic tokens (borders, dividers, secondary surfaces, etc)
- Full spacing scale (8-step rem, e.g. `spacing/xs`, `spacing/sm`, `spacing/md`, `spacing/lg`, `spacing/xl`, etc)
- Type family variables (confirm exact fonts from Figma: likely a bold display sans and a body sans)
- Type size scale (rem-based, fluid clamp where Figma indicates)
- Border radius scale

## Session hygiene

- Commit and push at logical break points. End of a phase, end of a working session, after a meaningful chunk.
- Update `docs/decisions.md` any time we make a real architectural call, so the next session inherits the rationale.
- Update README's Status Board so the first thing anyone reads reflects current state.
