/**
 * EventBus — typed publish/subscribe for cross-module communication.
 *
 * Lives in game/ (base layer). All modules can import it.
 * Events are synchronous, fire-and-forget notifications.
 * CombatContext is for synchronous queries; EventBus is for notifications.
 */

export interface EventMap {
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

  'ui:show-upgrade':          { options: ReadonlyArray<{ id: string; name: string; description: string }> };
  'ui:hide-upgrade':          never;
  'ui:shake-screen':          { intensity: number; duration: number };
  'ui:float-text':            { text: string; x: number; y: number; color: string };
}

type EventHandler<T extends keyof EventMap> = (payload: EventMap[T]) => void;

export class EventBus {
  private handlers: { [K in keyof EventMap]?: Array<EventHandler<keyof EventMap>> } = {};

  /** Subscribe. Returns unsubscribe function. */
  on<K extends keyof EventMap>(event: K, handler: EventHandler<K>): () => void {
    if (!this.handlers[event]) {
      this.handlers[event] = [];
    }
    const list = this.handlers[event]!;
    list.push(handler as EventHandler<keyof EventMap>);
    return () => this.off(event, handler);
  }

  /** Unsubscribe. */
  off<K extends keyof EventMap>(event: K, handler: EventHandler<K>): void {
    const list = this.handlers[event];
    if (!list) return;
    const idx = list.indexOf(handler as EventHandler<keyof EventMap>);
    if (idx !== -1) list.splice(idx, 1);
  }

  /** Emit synchronously. Handlers called in subscription order. */
  emit<K extends keyof EventMap>(event: K, payload: EventMap[K]): void {
    const list = this.handlers[event];
    if (!list) return;
    for (let i = 0; i < list.length; i++) {
      const handler = list[i];
      if (handler) handler(payload);
    }
  }

  /** Remove all handlers. */
  clear(): void {
    this.handlers = {};
  }
}
