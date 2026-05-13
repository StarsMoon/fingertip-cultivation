import { EventBus } from '../game/EventBus';
import {
  SaveData,
  BattleSnapshot,
  SAVE_KEY,
  SAVE_VERSION,
  createDefaultSave,
} from './SaveData';
import { migrate } from './SaveMigrations';

const DEBOUNCE_MS = 5000;

export class SaveManager {
  private data: SaveData;
  private dirty = false;
  private flushTimer = 0;

  constructor(private eventBus: EventBus) {
    this.data = this.loadFromStorage();
    this.eventBus.on('save:dirty', () => { this.dirty = true; });
    this.eventBus.on('save:request', (payload) => {
      if (payload.immediate) {
        this.flush();
      } else {
        this.dirty = true;
      }
    });
  }

  load(): SaveData {
    this.data = this.loadFromStorage();
    return this.data;
  }

  flush(): void {
    this.dirty = false;
    this.flushTimer = 0;
    try {
      wx.setStorageSync(SAVE_KEY, JSON.stringify(this.data));
    } catch {
      // Storage full — unrecoverable, log and continue
    }
  }

  tick(dt: number): void {
    if (!this.dirty) return;
    this.flushTimer += dt * 1000;
    if (this.flushTimer >= DEBOUNCE_MS) {
      this.flush();
    }
  }

  saveBattleSnapshot(battle: BattleSnapshot): void {
    this.data.battleSnapshot = battle;
    this.flush();
  }

  clearBattleSnapshot(): void {
    this.data.battleSnapshot = null;
    this.dirty = true;
  }

  emergencySave(): void {
    const emergencyData = { ...this.data, battleSnapshot: null } as SaveData;
    try {
      wx.setStorageSync(SAVE_KEY, JSON.stringify(emergencyData));
    } catch {
      // Best-effort, never throws
    }
  }

  getData(): Readonly<SaveData> {
    return this.data;
  }

  update(patch: Partial<SaveData>): void {
    this.data = { ...this.data, ...patch, version: SAVE_VERSION };
    this.dirty = true;
    this.eventBus.emit('save:dirty', { source: 'update' });
  }

  private loadFromStorage(): SaveData {
    try {
      const raw = wx.getStorageSync(SAVE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as SaveData;
        if (parsed.version !== SAVE_VERSION) {
          return migrate(parsed);
        }
        return { ...createDefaultSave(), ...parsed };
      }
    } catch {
      // Corrupted save — start fresh
    }
    return createDefaultSave();
  }
}
