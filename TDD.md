# Technical Design Document — 指尖修仙

*Version 1.0 | 2026-05-13 | Pre-Phase 1 Architecture Lock*

---

## 1. Architecture Overview

```
                         ┌──────────┐
                         │ main.ts  │ wx.onLaunch → Game.init()
                         └────┬─────┘
                              │
                         ┌────▼─────┐
                         │   Game   │ rAF loop, lifecycle orchestrator
                         └──┬───┬───┘
                            │   │
              ┌─────────────┘   └──────────────┐
              │                                │
       ┌──────▼──────┐                  ┌──────▼──────┐
       │ SceneManager│                  │  EventBus   │  ← lives in game/
       └──────┬──────┘                  └──────┬──────┘
              │                                │
   ┌──────────┼──────────┐          ┌──────────┼──────────────┐
   │          │          │          │          │              │
┌──▼──┐  ┌───▼───┐  ┌──▼───┐  ┌──▼───┐  ┌──▼────┐  ┌──────▼──────┐
│Menu │  │Battle │  │Result│  │Audio │  │  HUD  │  │SaveManager  │
└─────┘  └───┬───┘  └──────┘  └──────┘  └───────┘  └─────────────┘
             │          ▲
        ┌────▼────┐     │  (overlay, Battle.pause())
        │Upgrade  │─────┘  (chosen → Battle.resume())
        │Select   │
        └─────────┘

DEPENDENCY DIRECTION (imports):
  data/ ← utils/ ← game/ ← combat/ ← ui/
                    ↑          ↑
                render/    progression/
                audio/

COMMUNICATION PATHS:
  A. Direct call     — Game → SceneManager.update(), Skill.update(ctx)
  B. CombatContext   — Skill ←→ Player/Enemy/Projectile (synchronous query)
  C. EventBus        — cross-module notification (audio, UI, save, spawner)
  D. SaveManager     — called by Game on lifecycle events, subscribes to bus
```

| Mechanism | When | Direction | Example |
|---|---|---|---|
| **Direct call** | Owner calls owned | 1:1, sync | `Game` → `sceneManager.update(dt)` |
| **CombatContext** | Skill queries game state | sync read | `skill.update(dt, ctx)` reads `ctx.enemies` |
| **EventBus** | Module notifies unknown listeners | 1:N, fire-and-forget | `DamageSystem` emits `combat:enemy-killed` → HUD, Audio, Save |

---

## 2. Scene State Machine

### 2.1 Transition Graph

```
                 ┌─────────────────────────────────────────┐
                 │                                         │
                 ▼                                         │
  ┌──────────┐  start  ┌─────────┐  timeout/death  ┌──────┴───┐
  │ MainMenu ├────────►│ Battle  ├────────────────►│ Result   │
  └────┬─────┘        └────┬────┘                 └────┬─────┘
       │                   │ levelup                    │
       │              ┌────▼────────┐                   │
       │              │UpgradeSelect│                   │
       │              │  (overlay)  │                   │
       │              └────┬────────┘                   │
       │                   │ chosen                     │
       │                   ▼                            │
       │              Battle (resume)                   │
       │                                                │
       └────────────────────────────────────────────────┘
                          back / retry
```

| From | Trigger | To |
|---|---|---|
| MainMenu | start button | Battle |
| Battle | levelup | UpgradeSelect (overlay) |
| UpgradeSelect | skill chosen | Battle (resume) |
| Battle | hp ≤ 0 | ResultScreen |
| Battle | time ≥ limit | ResultScreen |
| ResultScreen | back button | MainMenu |
| ResultScreen | retry button | Battle |

### 2.2 Scene Interface

```typescript
interface Scene {
  enter(params?: SceneParams): void;
  exit(): void;
  update(dt: number): void;          // called only when NOT paused
  render(ctx: CanvasRenderingContext2D, alpha: number): void;  // always called
  pause(): void;                      // overlay pushed on top
  resume(): void;                     // overlay popped
}

interface SceneParams {
  [key: string]: string | number | boolean;
}
```

### 2.3 SceneManager

```typescript
class SceneManager {
  register(name: string, factory: () => Scene): void;
  changeTo(name: string, params?: SceneParams): void;
  pushOverlay(name: string, params?: SceneParams): void;
  popOverlay(): void;
  update(dt: number): void;
  render(ctx: CanvasRenderingContext2D, alpha: number): void;
  isOverlayActive(): boolean;
  getCurrentSceneName(): string;
}
```

### 2.4 Game Loop Integration

```typescript
// Game.ts — rAF always runs, never cancelled
class Game {
  private paused = false;  // set by wx.onHide

  private loop(timestamp: number): void {
    const dt = Math.min((timestamp - this.lastTimestamp) / 1000, 0.1);
    this.lastTimestamp = timestamp;

    if (!this.paused) {
      this.accumulator += dt;
      while (this.accumulator >= this.FIXED_DT) {
        this.sceneManager.update(this.FIXED_DT);
        this.accumulator -= this.FIXED_DT;
      }
    }
    // ALWAYS render — even when paused
    const alpha = this.accumulator / this.FIXED_DT;
    this.sceneManager.render(this.ctx, alpha);
    requestAnimationFrame(this.loop.bind(this));
  }

  pauseGame(): void  { this.paused = true; }
  resumeGame(): void { this.paused = false; this.accumulator = 0; }
}
```

### 2.5 Overlay Rendering

```
SceneManager.render():
  1. current.render()       // Battle always drawn (frozen when paused)
  2. if overlay: overlay.render()  // UpgradeSelect on top
  // Each overlay renders its own backdrop dimming (alpha ~0.6 black rect)
```

---

## 3. Event System

### 3.1 Type Definitions

```typescript
// src/game/EventBus.ts

interface EventMap {
  'combat:enemy-killed':      { enemyType: string; x: number; y: number; expValue: number };
  'combat:player-damaged':    { damage: number; currentHp: number; maxHp: number };
  'combat:player-healed':     { amount: number; currentHp: number; maxHp: number };
  'combat:player-leveled-up': { level: number; expToNext: number };
  'combat:breakthrough':      { realm: string; prevRealm: string };
  'combat:skill-acquired':    { skillId: string; level: number };
  'combat:skill-evolved':     { skillId: string; newLevel: number };
  'combat:boss-spawned':      { bossId: string };
  'combat:boss-killed':       { bossId: string };
  'combat:game-over':         { cause: 'death' | 'timeout'; elapsed: number };

  'game:scene-changed':       { from: string; to: string };
  'game:paused':              { reason: 'user' | 'lifecycle' | 'overlay' };
  'game:resumed':             { reason: 'user' | 'lifecycle' | 'overlay' };

  'audio:play-sfx':           { id: string; volume?: number };
  'audio:play-bgm':           { id: string; volume?: number };
  'audio:stop-bgm':           never;

  'save:dirty':               { source: string };
  'save:request':             { immediate: boolean };

  'ui:show-upgrade':          { options: readonly UpgradeOption[] };
  'ui:hide-upgrade':          never;
  'ui:shake-screen':          { intensity: number; duration: number };
  'ui:float-text':            { text: string; x: number; y: number; color: string };
}

type EventHandler<T extends keyof EventMap> = (payload: EventMap[T]) => void;

class EventBus {
  private handlers: { [K in keyof EventMap]?: EventHandler<K>[] } = {};

  on<K extends keyof EventMap>(event: K, handler: EventHandler<K>): () => void;
  off<K extends keyof EventMap>(event: K, handler: EventHandler<K>): void;
  emit<K extends keyof EventMap>(event: K, payload: EventMap[K]): void;
  clear(): void;
}
```

`on()` returns unsubscribe function. `emit()` calls handlers synchronously in subscription order.

### 3.2 Publisher/Subscriber Map

| Event | Publisher | Subscribers |
|---|---|---|
| `combat:enemy-killed` | DamageSystem | HUD, SaveManager, AudioManager, Spawner |
| `combat:player-damaged` | DamageSystem | HUD, AudioManager, SaveManager |
| `combat:player-healed` | Skill (utility) | HUD |
| `combat:player-leveled-up` | Player | UpgradeSelect, HUD, AudioManager |
| `combat:breakthrough` | Player | HUD, AudioManager, ParticleSystem, SaveManager |
| `combat:skill-acquired` | SkillManager | HUD, AudioManager, SaveManager |
| `combat:skill-evolved` | SkillManager | HUD, AudioManager |
| `combat:boss-spawned` | Spawner | HUD, AudioManager |
| `combat:boss-killed` | DamageSystem | HUD, AudioManager, ParticleSystem |
| `combat:game-over` | Player/Battle | SceneManager, SaveManager |
| `game:scene-changed` | SceneManager | AudioManager, SaveManager |
| `game:paused` | Game/Battle | AudioManager, HUD |
| `game:resumed` | Game/Battle | AudioManager, HUD |
| `audio:play-sfx` | Any | AudioManager |
| `audio:play-bgm` | SceneManager | AudioManager |
| `audio:stop-bgm` | SceneManager | AudioManager |
| `save:dirty` | Any | SaveManager |
| `save:request` | Game (onHide) | SaveManager |
| `ui:shake-screen` | DamageSystem | Camera |
| `ui:float-text` | DamageSystem | Renderer |

### 3.3 CombatContext vs EventBus

```
CombatContext = SYNCHRONOUS QUERY — skill reads current state to decide action
EventBus      = NOTIFICATION — module announces something happened

RULES:
  1. Skill.update(dt, ctx) uses CombatContext to find enemies, spawn projectiles.
     NEVER emit events inside Skill.update() hot path for per-frame logic.
  2. DamageSystem emits events AFTER resolving damage (result, not query).
  3. EventBus handlers MUST NOT modify CombatContext entities
     (payloads are plain data, not entity refs).
  4. If a module needs both: CombatContext for the action, EventBus for the echo.
```

### 3.4 GC Discipline

High-frequency events (`combat:enemy-killed`, `combat:player-damaged`, `ui:float-text`): reuse a single payload object per event, mutate before emit. Handlers MUST NOT store payload references.

```typescript
// DamageSystem — reuse payload
private readonly _killPayload: EventMap['combat:enemy-killed'] = {
  enemyType: '', x: 0, y: 0, expValue: 0
};

onEnemyKilled(enemy: Enemy): void {
  this._killPayload.enemyType = enemy.type;
  this._killPayload.x = enemy.x;
  this._killPayload.y = enemy.y;
  this._killPayload.expValue = enemy.expValue;
  this.eventBus.emit('combat:enemy-killed', this._killPayload);
}
```

Low-frequency events: object literal payloads are fine.

---

## 4. WeChat Lifecycle Integration

### 4.1 Mapping

| WeChat Callback | Game Action |
|---|---|
| `wx.onLaunch(opts)` | `Game.init()` → load save → init subsystems → MainMenu |
| `wx.onHide()` | Auto-pause + auto-save (scene-dependent, see §4.2) |
| `wx.onShow()` | Conditional resume (scene-dependent, see §4.2) |
| `wx.onError(msg)` | Log + `saveManager.emergencySave()` |

### 4.2 State-Dependent Behavior

```typescript
onHide(): void {
  switch (this.sceneManager.getCurrentSceneName()) {
    case 'MainMenu': break;                                    // nothing to save
    case 'Battle':
      this.pauseGame();
      this.saveManager.saveBattleSnapshot(this.battleState);
      this.saveManager.flush();                                // sync write
      break;
    case 'UpgradeSelect':
      this.saveManager.saveBattleSnapshot(this.battleState);   // includes pending options
      this.saveManager.flush();
      break;
    case 'ResultScreen':
      this.pauseGame();
      break;
  }
}

onShow(): void {
  switch (this.sceneManager.getCurrentSceneName()) {
    case 'MainMenu': break;
    case 'Battle':
      this.showResumePrompt();    // DO NOT auto-resume — user may not be ready
      break;
    case 'UpgradeSelect': break;  // overlay still showing, safe to re-render
    case 'ResultScreen': break;
  }
}
```

### 4.3 Kill Mid-Battle Recovery

```
1. wx.onHide → saveBattleSnapshot() + flush()
2. [OS kills process — sometimes no onHide fires]
3. Next launch → load() → battleSnapshot exists?
   a. YES → MainMenu shows "Resume Battle?" → resume or discard
   b. NO  → normal MainMenu
4. Snapshot validation: version mismatch → discard silently
```

### 4.4 Edge Cases

| Case | Handling |
|---|---|
| `wx.onHide` during overlay | Save snapshot including `pendingUpgradeOptions`. Resume re-shows same 3 options. |
| `wx.onHide` during scene transition | Transition is synchronous (one frame). Cannot happen. |
| Save write fails (storage full) | Catch → log → continue. Storage full is unrecoverable. |
| `wx.onError` mid-battle | Log + `emergencySave()` (permanent data only, discard snapshot). Next launch warns "last session crashed." |
| Double `wx.onShow` | Idempotent — `showResumePrompt()` is safe to call multiple times. |

---

## 5. Resource Manager

### 5.1 API

```typescript
interface ResourceGroup {
  readonly name: string;
  readonly images: ReadonlyArray<{ key: string; src: string }>;
  readonly audio: ReadonlyArray<{ key: string; src: string }>;
}

class ResourceManager {
  registerGroup(group: ResourceGroup): void;
  loadGroup(name: string): Promise<void>;      // idempotent, returns same promise if loading
  getImage(key: string): WxImage | null;        // null if not loaded
  getAudio(key: string): InnerAudioContext | null;
  isGroupLoaded(name: string): boolean;
  releaseGroup(name: string): void;             // free memory
  getGroupProgress(name: string): number;        // 0..1 for loading bar
}
```

### 5.2 Loading Strategy

```
FIRST PACKAGE (<4MB):
  Code bundle                    ~400KB minified
  Menu sprites (title, buttons)  ~100KB
  Boot SFX (click, transition)   ~30KB
  Config data (in code)           0KB
  TOTAL                          ~530KB

LAZY-LOADED on scene transition:
  Group "battle": player/enemy/projectile/boss/pickup sprites + background
  Group "battle-sfx": attack/hit/kill/levelup/breakthrough/pickup SFX
  Group "result": result screen decorations (optional, fallback text-only)
```

### 5.3 Scene Transition with Loading

Loading overlay renders via `ctx.fillRect` (no sprite dependency). Progress polled from `resourceManager.getGroupProgress()`.

```typescript
async changeToBattle(params?: SceneParams): Promise<void> {
  this.showLoadingOverlay();
  await this.resourceManager.loadGroup('battle');
  this.sceneManager.changeTo('Battle', params);
  this.hideLoadingOverlay();
}
```

### 5.4 Failure Handling

| Failure | Strategy |
|---|---|
| Single image fails | Retry once → fallback 1×1 transparent placeholder → log warning |
| Single audio fails | Skip. Silent gameplay is valid per GDD. |
| Entire group fails (network) | Retry dialog. Cancel → return to previous scene. |

---

## 6. Save Data

### 6.1 Schema

```typescript
const SAVE_VERSION = 1;
const SAVE_KEY = 'fingertip_cultivation_save';

interface SaveData {
  version: number;
  spiritStones: number;
  upgrades: PermanentUpgrades;
  unlockedCharacters: string[];
  selectedCharacter: string;       // default: 'qingyun'
  collection: SkillCollection;
  stats: PlayerStatistics;
  settings: GameSettings;
  battleSnapshot: BattleSnapshot | null;  // null = no battle in progress
}

interface PermanentUpgrades {
  attackPower:  number;  // 0~20
  maxHp:        number;  // 0~20
  moveSpeed:    number;  // 0~10
  spiritRange:  number;  // 0~10
  expBonus:     number;  // 0~10
  luck:         number;  // 0~10
}

interface SkillCollection {
  skillBestLevel: Record<string, number>;       // skillId → best level ever
  skillTimesAcquired: Record<string, number>;   // skillId → total times acquired
  highestRealm: string;
}

interface PlayerStatistics {
  totalGames: number;
  totalKills: number;
  totalPlayTime: number;    // seconds
  highestScore: number;
  highestLevel: number;
  bossKills: number;
  longestSurvival: number;  // seconds
}

interface GameSettings {
  sfxVolume: number;         // 0~1, step 0.1
  bgmVolume: number;         // 0~1, step 0.1
  vibrationEnabled: boolean;
}

interface BattleSnapshot {
  version: number;
  levelId: string;
  characterId: string;
  playerLevel: number;
  playerHp: number;
  playerMaxHp: number;
  playerX: number;
  playerY: number;
  elapsed: number;           // seconds into level
  realm: string;
  kills: number;
  spiritStonesEarned: number;
  skills: ReadonlyArray<{ id: string; level: number }>;
  pendingUpgradeOptions: ReadonlyArray<string> | null;  // null if not in upgrade UI
  spawnerSeed: number;
  timestamp: number;
}
```

### 6.2 SaveManager

```typescript
class SaveManager {
  private data: SaveData;
  private dirty = false;
  private flushTimer = 0;
  private readonly DEBOUNCE_MS = 5000;

  constructor(eventBus: EventBus);  // subscribes to save:dirty, save:request, combat:*

  load(): SaveData;                           // from wx.getStorageSync, with migration
  flush(): void;                              // sync write to wx.setStorageSync
  tick(dt: number): void;                     // check debounce timer, auto-flush
  saveBattleSnapshot(battle: BattleSnapshot): void;  // + immediate flush
  clearBattleSnapshot(): void;
  emergencySave(): void;                      // permanent data only, best-effort, never throws
  getData(): Readonly<SaveData>;
  update(patch: Partial<SaveData>): void;     // merge + markDirty
}
```

### 6.3 Versioning & Migration

```typescript
type Migration = (old: Record<string, unknown>) => Record<string, unknown>;
const MIGRATIONS: Migration[] = [];  // index = from-version

function migrate(save: SaveData): SaveData {
  let data = save as Record<string, unknown>;
  const fromVersion = (data.version as number) || 0;
  for (let v = fromVersion; v < SAVE_VERSION; v++) {
    if (MIGRATIONS[v]) data = MIGRATIONS[v](data);
    data.version = v + 1;
  }
  return { ...createDefaultSave(), ...data } as SaveData;  // fill new fields with defaults
}
```

### 6.4 Save Triggers

| Trigger | Type | When |
|---|---|---|
| `wx.onHide()` | immediate | Before app suspends |
| `combat:game-over` | immediate | Scene → ResultScreen |
| Upgrade shop purchase | immediate | On confirm |
| `combat:player-leveled-up` | debounced (5s) | Player levels up |
| `combat:skill-acquired` | debounced (5s) | Skill acquired/evolved |
| `combat:breakthrough` | debounced (5s) | Realm breakthrough |
| Settings change | debounced (5s) | Slider/toggle |

### 6.5 Storage Budget

```
wx.setStorageSync limit: 10MB
Estimated SaveData: ~1.2KB (well within limits, no compression needed)
```

---

## Appendix A: File Location Map

| Section | Primary Files |
|---|---|
| Scene State Machine | `src/game/Scene.ts`, `src/game/SceneManager.ts` |
| Event System | `src/game/EventBus.ts` |
| WeChat Lifecycle | `src/game/Game.ts` |
| Resource Manager | `src/game/ResourceManager.ts`, `src/data/resources.ts` |
| Save Data | `src/progression/SaveData.ts`, `src/progression/SaveManager.ts`, `src/progression/SaveMigrations.ts` |

## Appendix B: Phase 0 Implementation Priority

Must exist before Phase 1:

1. **EventBus** — ~80 lines, pure utility
2. **Scene + SceneManager** — ~120 lines, depends on EventBus
3. **Game loop integration** — modify Game.ts for scene delegation + lifecycle hooks
4. **SaveData interface + SaveManager.load/flush** — ~100 lines
5. **ResourceManager (registerGroup + loadGroup + get)** — ~80 lines, lazy-load stubbable
6. **WeChat lifecycle wiring** — ~30 lines in Game.ts

**Total: ~410 lines, ~3-4h effort.**
