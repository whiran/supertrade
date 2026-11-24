---
name: verify-slice
description: Runs TypeScript typechecking and Vitest unit tests after implementing a slice.
---

# verify-slice

Use this skill to shift verification left after implementing any architectural slice or phase.

## Instructions
1. Run `npm run verify` from the workspace root (`tsc --noEmit` across all workspaces + `vitest run`).
2. Fix only failing files (maximum 3 retry loops per error).
3. Do NOT launch a browser until Phase 7.
4. Output a 3-line summary:
   - Files created / changed
   - Tests passed
   - Next phase / target
