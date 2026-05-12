# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — Vite dev server with HMR.
- `npm run build` — production build to `dist/`.
- `npm run preview` — serve the production build.
- `vercel --prod` — deploy `dist/` to Vercel (project already linked via `.vercel/project.json`).

There is no test runner, linter, or formatter configured. The user verifies changes by running the game in the browser.

When deploying, bump `#version-label` in `index.html` so the running version is identifiable on the live site. Recent convention has been `vX.Y <short-tag>`.

## High-level architecture

A Three.js + Vite SPA: an arcade game (internal name "Helix Descent", deployed as **pogomachine**) where the player descends a rotating cylindrical tower, bouncing on tiles, shooting enemies, and collecting coins.

### Entry point and orchestration

`src/main.js` (~1900 lines) is the single orchestrator. It:
1. Destructures the full asset bundle from `createGameAssets()` (see `src/render/assets.js`).
2. Builds the scene graph (lights, camera, pillar, ball).
3. Instantiates each system factory in `src/systems/` and `src/entities/`, threading shared state (arrays for platforms, enemies, etc.) and callbacks across them.
4. Runs the game loop via `createGameLoopSystem()`.

Treat `main.js` as the "wiring file" — its size is structural, not a problem to fix.

### Scene graph and coordinate frames

There are three coordinate frames; mixing them up is the most common source of bugs:

1. **scene-world** — what the camera renders. `ball.position` lives here.
2. **`world`** — a rotating group (around Y) that holds the entire tower. Player input rotates `world.rotation.y`. All platforms are direct children of `world`.
3. **`platform.group`** — one per platform, child of `world`. **Only sets `position.y`** — never rotation or scale. Several optimizations (e.g. coin InstancedMesh) rely on this invariant.

Convert between frames with `world.worldToLocal(...)` / `world.localToWorld(...)` and the analogous on `platform.group`. For positions inside a platform when written into a global-in-`world` InstancedMesh, you can shortcut as `platformGroup.position + tileLocalOffset` because platforms have identity rotation.

### Batching: InstancedMesh everywhere

Drawcalls have been aggressively reduced. The pattern in three places:

- **Tiles** (`src/entities/platforms.js`) — one `InstancedMesh` per platform **per tile type**. Each `tile` object has `typeMesh` (the InstancedMesh) and `instanceIndex`. Hide a tile (break/dispose) by writing `zeroScaleMatrix` to its instance. Arc geometries are cached in `arcGeometryCache` keyed on `(arcSize, innerR, outerR, thickness)` and marked `userData.shared = true` so lifecycle dispose skips them.
- **Coins** (`src/entities/coinPickups.js`) — one global `InstancedMesh` parented to `world` (rotates with the tower). 256-slot pool; collision check transforms `ball.position` to world-local once per frame and compares against stored per-coin local positions.
- **Particles** (`src/render/particles.js`) — one global `InstancedMesh` in `scene`. 256-slot pool; fade is encoded as `color * opacity` per-instance (no per-instance alpha in Three's standard InstancedMesh path).

**Y-rotation gotcha**: Three.js Y-axis rotation by θ moves a point at angle α to `α − θ`, not `α + θ`. The tile InstancedMesh uses `-tile.start` for the per-instance quaternion. This caused a v1.21 bug where colliders and visuals diverged — preserve the sign.

### Materials

All meshes use `MeshLambertMaterial`, created via `basicMat()` in `src/render/assets.js`. The helper sets `userData.baseColor` on every material so flash effects can restore the original color:

```js
material.color.setHex(0xff0000);                          // flash (e.g. damage)
material.color.setHex(material.userData.baseColor);       // reset
```

This pattern is used throughout `enemies/combat.js`, `enemies/update.js`, `obstacles.js` (cannon warning states), and `goldBlocks.js`. When a material is cloned (`material.clone()`) Three.js deep-clones `userData` via JSON, so per-enemy clones inherit `baseColor` automatically.

No emissive / metalness / roughness anywhere — they were stripped. Don't re-add them without converting back to `MeshStandardMaterial`.

### Shadows

Only **the ball** casts shadows (`main.js:288`). `sun.castShadow` (the directional light) stays `true` because the renderer needs it to render any shadows at all. `receiveShadow` is enabled on the pillar and the tile InstancedMeshes — that's where the ball's shadow lands. Don't add `castShadow = true` on new meshes unless intentional.

### Broad phase collisions

`src/entities/platforms.js` maintains a `platformBandIndex` Map keyed on `Math.round(y / platformSpacing)`. Use `forEachPlatformNearY(yMin, yMax, callback)` to iterate platforms intersecting a Y range without scanning all of them. `src/systems/collisions.js` uses this for bullet/ball vs platform tests. Pre-allocated buffers (`bulletPlatformBuffer`, `undersidePlatformBuffer`, `topsidePlatformBuffer`) avoid per-frame array allocs.

### Enemy module structure

`src/entities/enemies/` is split into:
- `spawn.js` — type-specific spawn factories.
- `meshes.js` — geometry/material assembly per type.
- `update.js` — per-frame movement and flash decay (resets color via `userData.baseColor`).
- `combat.js` — damage, kills, splits, `disposeEnemy()` (which disposes both materials and geometries).

Enemy types include `bat`, `worm`, `yellowWorm`, `miniYellowWorm`, `pillarWorm`, `turtle`, `jellyfish`, `pufferBomb`, `explosiveMushroom`, `porcupine`, `acidSnail`. Worms have `segments[]` (chain of meshes); collision logic caches `getWorldPosition()` results per-segment to avoid double-transform.

### Persistence

- **Game state** lives in `src/core/state.js`, mutated through getters/setters wired in `main.js`.
- **Leaderboard** uses **jsonbin.io** (`src/systems/leaderboard.js`) — not Firebase, despite `firebase` being in `package.json`. The bin ID and access key are hardcoded in that file.
- **Player options** persist in `localStorage` via `src/systems/options.js` and `optionsPanel.js`.

### Plan files

When the user invokes `/plan`, plans are written to `~/.claude/plans/`. Previous plans (tile batching, shadow removal, etc.) live there and document the optimization journey through versions v1.x. Reading the latest plan before starting work usually saves time.
