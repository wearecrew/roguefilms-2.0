# Rogue v2 design system

**Status**: Phase 1 reset — spec being rewritten (2026-04-18).

The prior token tree is invalidated by three problems:

1. The Figma plugin import created a broken structure (a "groups" collection with numeric placeholders instead of per-category collections). The tokens.json format emitted from this doc didn't parse as intended by Crew Token Bridge.
2. Webflow received `clamp()` values inside a single-mode collection. The team wants explicit Mobile / Tablet / Desktop modes with discrete values, not fluid interpolation.
3. Naming drifted between too-situational (`page-title`) and too-generic (`spacing/20`) with no consistent scale.

This document will be repopulated in Step 3 of the reset plan. Until then, assume nothing here is authoritative.
