# Onslaught 2 Web Remake – Starter Project

This is a minimal **Phaser 3 + TypeScript + Vite** starter you can use to rebuild **Onslaught 2** as a modern web game.

It is intentionally simple:
- One `GameScene` with a placeholder **path**, **tower**, and **enemy**.
- No assets yet – everything is basic shapes so you can plug in sprites and logic as you go.
- Set up to work nicely on **GitHub** and **Render.com** (static site hosting).

---

## 1. Getting Started Locally

### Prerequisites

- Node.js (LTS or current) installed
- npm (comes with Node)

### Install dependencies

```bash
npm install
```

### Run the dev server

```bash
npm run dev
```

Then open the printed URL (usually http://localhost:5173) in your browser.

You should see:
- A dark page with a title.
- A canvas showing a gray path, a green square "tower", and a red circle "enemy" moving along the path.
- Some debug text in the top-left.

This confirms that Phaser, TypeScript, and Vite are wired up correctly.

---

## 2. Build for Production

```bash
npm run build
```

This outputs static files into the `dist/` folder.

You can test the production build locally with:

```bash
npm run preview
```

---

## 3. Using this on GitHub

1. Create a new GitHub repo (or use an existing one).
2. Copy this project into that repo (or push this folder as the repo).
3. Commit and push:

   ```bash
   git add .
   git commit -m "Add Onslaught 2 Phaser starter"
   git push origin main
   ```

Once it's on GitHub, you can point Render.com at that repo.

---

## 4. Deploying on Render.com (Static Site)

1. In Render, create a **Static Site**.
2. Connect it to your GitHub repo that contains this project.
3. Use the following settings:
   - **Build Command:** `npm run build`
   - **Publish Directory:** `dist`
4. Click **Create Static Site**.

Render will install dependencies, run the Vite build, and host the files from `dist/`.

Whenever you push changes to the main branch (or whichever branch you configured), Render will automatically rebuild and redeploy.

---

## 5. Where to Start Coding Onslaught 2

The main files you care about right now:

- `src/main.ts`
  - Boots Phaser and wires up the scenes.
- `src/scenes/GameScene.ts`
  - Currently holds all placeholder logic.
  - This is where you can start adding:
    - Tower placement
    - Enemy spawning/waves
    - Projectiles
    - HP/damage/combos
- Later you can add folders like:
  - `src/gameplay/` (Tower, Enemy, Projectile, WaveManager, etc.)
  - `src/ui/` (HUD, buttons, tooltips)
  - `public/assets/` for your sprites and audio.

As you reverse-engineer the original Onslaught 2 (from SWFs / decompiled AS), you can move the real gameplay values and rules into this structure.

---

## 6. Next Steps

Some natural next steps from here:

- Replace the placeholder enemy with a sprite.
- Add a basic `Tower` class and a `TowerManager` that:
  - Keeps a list of towers.
  - Updates them each frame.
  - Has them target and "shoot" enemies.
- Add a simple `WaveManager` that spawns enemies on a timer.

When you’re ready, I can help you:
- Design a clean folder structure for towers/enemies/waves.
- Port specific formulas/behaviors from the decompiled ActionScript into TypeScript.
- Add UI (money, lives, score, wave progress, etc.).

### New in this version (v4)

- Extended `Enemy` with a `reward` value so kills can grant money.
- Extended `WaveManager` to accept callbacks (`onEnemyLeak`, `onEnemyKilled`) and report events to the scene.
- Updated `GameScene` to add:
  - Simple grid-based tower placement by clicking on the playfield (excluding the path).
  - Economy (money) and lives tracking, with HUD text.
  - Game over detection when lives reach zero.

### New in this version (v5)

- Added `src/config/towers.ts` for defining multiple tower types (Gun, Slow, Splash) with configurable stats.
- Extended `WaveManager` to support multiple waves, wave index tracking, and a `onWaveEnded` callback.
- Updated `GameScene` to include:
  - A tower selection bar at the bottom to choose tower type before placing.
  - A "Start Wave" button to manually trigger waves.
  - Wave number display in the HUD.

### New in this version (v7)

- Integrated a background image from the decompiled SWF into `public/assets/onslaught/bg-1.png` and wired it into `GameScene`.
- Expanded `Enemy` to support slow debuffs with duration and multiplier.
- Expanded `Tower` to support multiple behaviors: single-target, slow, splash (AOE), and chain lightning.
- Added a simple `Combos` system that boosts tower damage when certain type pairs are placed near each other.
- Added a 4th tower type ("Chain") in `src/config/towers.ts` and in the selection bar.
- Implemented a basic tower upgrade system: click a tower to open a small upgrade panel and pay money to increase its level and stats.
