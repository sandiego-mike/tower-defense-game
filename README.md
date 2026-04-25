# Tower Defense MVP

A minimal browser tower defense prototype built with TypeScript and HTML5 Canvas. It currently uses placeholder visuals, but is ready for single-image sprites through the asset pipeline. The game focuses on the core loop: mission selection, difficulty tuning, fixed-path enemies, limited economy, tower placement, targeting, projectiles, splash damage, slows, waves, life, and win/loss states.

## Run Locally

```bash
npm install
npm run dev
```

Then open the local URL printed by Vite.

Build a production bundle:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Mobile Browser Notes

The game is built as a full-screen canvas app. The canvas resizes to the browser viewport on desktop, tablet, and phone, including mobile browser chrome changes and orientation changes.

- The page uses `viewport-fit=cover`, safe-area insets, and dynamic viewport units so it fits notched phones.
- Canvas and drag interactions use pointer events with page scroll/zoom prevention while playing.
- The bottom tower palette stays centered and compact on phones.
- The selected tower inspector becomes a bottom sheet on small screens.
- Production assets live under `public/assets` and are referenced from the site root, for example `/assets/maps/forest-map.png`.

## Deploy To Vercel

This is a static Vite app, so Vercel can deploy it without a custom server.

1. Push the project to GitHub, GitLab, or Bitbucket.
2. Create a new Vercel project and import the repo.
3. Use these settings:
   - Framework Preset: `Vite`
   - Install Command: `npm install`
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Deploy.

The package scripts Vercel expects are already present:

```json
{
  "dev": "vite --host 0.0.0.0",
  "build": "tsc && vite build",
  "preview": "vite preview --host 0.0.0.0"
}
```

To test the production build locally before deploying:

```bash
npm run build
npm run preview
```

Open the preview URL on desktop and, if possible, from a phone on the same network. Verify tower tapping, drag placement, pause/resume, upgrade/sell buttons, and mission switching.

## How To Play

- Click or tap a tower type, then click or tap the map to place it.
- Drag a tower button onto the map to place it.
- Click or tap a placed tower to inspect it, preview its range, upgrade it, or change targeting.
- Towers cannot be placed directly on the enemy path or on top of another tower.
- Use Pause, Resume, and Restart from the HUD during a mission.
- Pick a mission and difficulty from the start screen.
- Survive all waves to win.
- Each enemy that reaches the base removes 5% of your starting life.

## Config Structure

Gameplay tuning lives in `src/config`:

- `towers.ts` defines each tower's label, color, future `spriteKey`, and three upgrade levels with damage, range, fire rate, projectile speed, optional splash/slow stats, and placeholder upgrade costs.
- `enemies.ts` defines enemy id, label, health, speed, radius, placeholder shape/color, life damage, reward placeholder, and future `spriteKey` support.
- `waves.ts` defines each wave composition, spawn timing, wave health scaling, wave count scaling, and per-group enemy modifiers.
- `difficulties.ts` defines Easy, Normal, and Hard multipliers for enemy health, enemy speed, enemy count, spawn interval, starting life, starting gold, and score.
- `missions.ts` defines mission names, descriptions, and fixed paths as normalized points.
- `economy.ts` defines sell refund rate, debug economy flags, and score tuning.
- `assets.ts` registers optional image files by key.
- `theme.ts` defines the current visual theme: `Prototype Forest Defense`.

The `WaveManager` combines `waves.ts`, `enemies.ts`, and `difficulties.ts` to generate the concrete waves for a run. The `Game` class reads the selected mission and converts normalized path points into responsive canvas coordinates.

## Economy Flow

Each mission now starts with limited gold from the selected difficulty. Towers cost gold to place, upgrades cost gold, enemies grant rewards when defeated, and selected towers can be sold.

- `startingGold` lives in `src/config/difficulties.ts`.
- `placementCost` lives on each tower in `src/config/towers.ts`.
- `upgradeCost` lives on each tower level in `src/config/towers.ts`.
- `reward` lives on each enemy in `src/config/enemies.ts`.
- `sellRefundRate` lives in `src/config/economy.ts`.

If `debugInfiniteGold` is `true` in `economy.ts`, placement and upgrades do not spend gold. The HUD shows infinite gold, which keeps testing easy.

Selling a tower refunds `sellRefundRate` times that tower's total invested gold, including its placement cost and paid upgrades. The default refund is 70%.

## Mission Progression

Progression is handled by `ProgressionManager` and saved locally in the browser. The first mission starts unlocked. Completing a mission unlocks the next mission in `MISSION_ORDER` from `src/config/missions.ts`.

The mission select shows:

- Locked or open status
- Completed status
- Best score
- Best star rating

Set `debugUnlockAllMissions` in `src/config/economy.ts` to `true` to keep all missions unlocked while testing.

## Local Save Structure

Progression is stored in `localStorage` under:

```text
tower-defense-mvp-save-v1
```

Shape:

```json
{
  "version": 1,
  "missions": {
    "green-pass": {
      "completed": true,
      "bestScore": 1280,
      "bestStars": 2
    }
  }
}
```

There are no accounts, cloud saves, servers, or databases.

## Score And Stars

Victory calculates score from:

- Life remaining
- Gold remaining
- Enemies defeated
- Difficulty score multiplier

Tune the formula in `SCORE_CONFIG` inside `src/config/economy.ts`. Star thresholds are also there.

## Asset Manager

`AssetManager` loads image assets before the game starts. Loading failures are safe: failed or missing assets are skipped, and the game keeps rendering placeholder shapes/colors.

Register images in `src/config/assets.ts`:

```ts
export const ASSET_MANIFEST = [
  { key: "tower-basic", src: "/assets/towers/basic.png" },
  { key: "enemy-basic", src: "/assets/enemies/basic.png" },
  { key: "projectile-basic", src: "/assets/projectiles/basic-shot.png" },
  { key: "map-green-pass", src: "/assets/maps/green-pass.png" }
];
```

Suggested folder structure:

```text
public/
  assets/
    towers/
      basic.png
      splash.png
      slow.png
    enemies/
      basic.png
      fast.png
      tank.png
      swarm.png
      boss.png
    projectiles/
      basic-shot.png
      splash-shot.png
      slow-shot.png
    maps/
      green-pass.png
      desert-bend.png
      lava-spill.png
```

Vite serves files from `public` at the site root, so `public/assets/towers/basic.png` is referenced as `/assets/towers/basic.png`.

## Fallback Rendering

Sprites are optional. If `AssetManager.getImage(spriteKey)` returns nothing, each object draws its themed placeholder:

- Towers draw colored forest-defense blocks with level text.
- Enemies draw colored shapes with bob animation and health bars.
- Projectiles draw small colored circles with trails.
- Missions draw a grass/forest background and dirt-road path.

This means art can be added gradually without breaking the current prototype.

## Assign Sprites

Tower images are currently registered in `src/config/assets.ts`:

```ts
{ key: "basic-tower", src: "/assets/towers/basic-tower.png" }
{ key: "splash-tower", src: "/assets/towers/splash-tower.png" }
{ key: "slow-tower", src: "/assets/towers/slow-tower.png" }
```

Place those files here:

```text
public/assets/towers/basic-tower.png
public/assets/towers/splash-tower.png
public/assets/towers/slow-tower.png
```

Tower sprites are assigned in `src/config/towers.ts`:

```ts
basic: {
  label: "Basic",
  color: "#4f8cff",
  renderSize: 36,
  spriteKey: "basic-tower",
  projectileSpriteKey: "projectile-basic",
  levels: [...]
}
```

Adjust `renderSize` per tower if an image appears too large or too small. The image is drawn centered on the tower's map position at `renderSize x renderSize` canvas pixels.

Enemy sprites are assigned in `src/config/enemies.ts`:

```ts
basic: {
  id: "basic",
  label: "Basic",
  spriteKey: "enemy-basic",
  ...
}
```

Map/background images are assigned in `src/config/missions.ts`:

```ts
"green-pass": {
  id: "green-pass",
  backgroundKey: "map-green-pass",
  path: [...]
}
```

Projectile sprites can be set per tower via `projectileSpriteKey`, or per level via `projectileSpriteKey` inside a level. Single-image sprites are supported now; sprite sheet frame support can be added later inside `AssetManager` or a small `AnimationManager`.

## Polish Systems

- `EffectManager` owns lightweight canvas effects such as projectile impacts, splash rings, and base pulses.
- `SoundManager` provides no-op hooks for tower fire, enemy hit, enemy destroyed, wave start, victory, and defeat. Add real audio later without changing gameplay code.
- `AssetManager` loads optional images before startup and returns fallback-safe image lookups.
- Subtle screen shake is triggered when a boss spawns, an enemy reaches the base, and victory/defeat happens.
- Enemy health bars are drawn by `Enemy`; boss enemies receive larger, more visible bars.
- Slow effects show a green ring around affected enemies.

## Placement Validation

Tower placement is validated in `Game` before a tower is created:

- The tower must be inside the map bounds.
- The tower cannot be placed on or too close to the enemy path.
- The tower cannot overlap or sit too close to another tower.

The placement preview turns red when invalid, and a short toast explains the reason after a failed placement attempt.

## Wave Feedback

`WaveManager` tracks wave start events, remaining enemies, and next-wave countdowns. The HUD displays remaining enemies and countdown timing. When a wave starts, the game shows a brief toast; the final wave uses a distinct warning message.

## Tower Upgrades

Tower upgrades are configured in `src/config/towers.ts`. Each tower has three `levels`; level 1 is the placed default, and levels 2 and 3 are upgraded versions.

Example level shape:

```ts
{
  level: 2,
  upgradeCost: 75,
  range: 165,
  damage: 30,
  fireRate: 1.15,
  projectileSpeed: 560
}
```

Splash towers can include `splashRadius`. Slow towers can include `slowAmount` and `slowDuration`. Upgrade costs are charged unless `debugInfiniteGold` is enabled.

## Targeting Modes

Placed towers can use four targeting modes:

- `First enemy`: enemy furthest along the path.
- `Strongest enemy`: enemy with the most current health.
- `Closest enemy`: enemy nearest to the tower.
- `Fastest enemy`: enemy with the highest base speed.

The selected tower inspector updates the tower's targeting mode immediately.

## Add A Tower Type

1. Add the new id to `TowerType` in `src/types.ts`.
2. Add a matching entry to `TOWER_CONFIGS` in `src/config/towers.ts`.
3. Define exactly three `levels` with damage, range, fire rate, projectile speed, and any special stats.
4. Add a matching button in `index.html` with `data-tower="your-id"`.
5. Add optional CSS for the tower chip color in `src/styles.css`.

The existing `Tower`, `Projectile`, and UI systems will use the config values automatically.

## Add A Mission

1. Add a new id to `MissionId` in `src/types.ts`.
2. Add a matching entry to `MISSION_CONFIGS` in `src/config/missions.ts`.
3. Define `path` as normalized `{ x, y }` points where `0,0` is the top-left and `1,1` is the bottom-right.
4. Use slightly negative or greater-than-one x values for off-screen path entrances and exits.

Example:

```ts
"new-route": {
  id: "new-route",
  label: "New Route",
  description: "A short test mission.",
  path: [
    { x: -0.04, y: 0.5 },
    { x: 0.3, y: 0.5 },
    { x: 0.3, y: 0.25 },
    { x: 1.04, y: 0.25 }
  ]
}
```

## Adjust Difficulty

Edit `src/config/difficulties.ts`:

- `enemyHealthMultiplier`: higher means tougher enemies.
- `enemySpeedMultiplier`: higher means faster enemies.
- `enemyCountMultiplier`: higher means more enemies per wave.
- `spawnIntervalMultiplier`: lower means enemies spawn closer together.
- `startingLife`: player life at the start of a run.
- `startingGold`: player gold at the start of a run.
- `scoreMultiplier`: score modifier applied on victory.

## Add An Enemy Type

1. Add the new id to `EnemyType` in `src/types.ts`.
2. Add a matching entry to `ENEMY_CONFIGS` in `src/config/enemies.ts`.
3. Set its `label`, `health`, `speed`, `radius`, `color`, `shape`, `lifeDamage`, and `reward`.
4. Add it to one or more wave `groups` in `src/config/waves.ts`.

Enemy shapes are placeholder-friendly values for now: `circle`, `diamond`, `square`, `triangle`, or `hexagon`. The `spriteKey` field is already available for later graphics work.

Example:

```ts
armored: {
  id: "armored",
  label: "Armored",
  color: "#94a3b8",
  shape: "square",
  radius: 15,
  health: 130,
  speed: 46,
  lifeDamage: 10,
  reward: 18
}
```

## Customize Wave Composition

Edit `src/config/waves.ts`. Each wave has a `groups` array:

```ts
{
  label: "Boss Escort",
  spawnInterval: 0.68,
  healthScale: 1.7,
  countScale: 1.15,
  groups: [
    { enemyType: "boss", count: 1, healthMultiplier: 1.15 },
    { enemyType: "tank", count: 4 },
    { enemyType: "fast", count: 8 },
    { enemyType: "swarm", count: 12 }
  ]
}
```

- `enemyType` chooses from `ENEMY_CONFIGS`.
- `count` is scaled by the wave `countScale` and difficulty `enemyCountMultiplier`.
- `healthMultiplier` and `speedMultiplier` are optional per-group overrides.
- `healthScale` raises all enemy health in that wave before difficulty is applied.
- `spawnInterval` is multiplied by difficulty; lower values spawn enemies faster.

## Main Systems

- `Game` owns the canvas, selected run config, game loop, entity lists, responsive path, placement rules, and win/loss checks.
- `Enemy` moves along an array of path points, supports temporary slow effects, and renders sprite-or-placeholder visuals.
- `Tower` owns level, targeting mode, range preview, upgrades, target selection, sprite-or-placeholder rendering, and projectile creation based on config.
- `Projectile` moves toward a target, applies damage, splash damage, slow effects, and renders sprite-or-placeholder visuals with a trail.
- `AssetManager` loads image assets and exposes safe image lookup by key.
- `WaveManager` generates and schedules scaled waves from config, while exposing wave start, countdown, and remaining enemy status.
- `EffectManager` draws short-lived visual feedback.
- `SoundManager` centralizes future audio hooks.
- `ProgressionManager` loads and saves local mission completion, best score, and best stars.
- `InputManager` handles mouse, touch, click-to-place, and drag-to-place.
- `UIManager` owns the start screen, HUD, pause/end screens, tower inspector, and feedback toast.

## Roadmap

1. Playtest and tune the economy curve: starting gold, tower costs, enemy rewards, and wave pressure.
2. Add a first rough art pass with single-image sprites in `public/assets`.
3. Replace `SoundManager` no-op methods with a tiny Web Audio or asset-backed sound layer.
4. Add enemy armor/resistances so targeting and tower choice matter more.
5. Add a reset-save debug button for faster progression testing.
