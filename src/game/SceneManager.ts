/**
 * SceneManager — manages scene transitions and overlay stack.
 * Supports: full scene change, overlay push/pop (e.g., UpgradeSelect over Battle).
 */

import { Scene, SceneParams } from './Scene';
import { EventBus } from './EventBus';

export class SceneManager {
  private scenes: Map<string, () => Scene> = new Map();
  private current: Scene | null = null;
  private currentName: string = '';
  private overlay: Scene | null = null;
  private overlayName: string = '';
  private eventBus: EventBus;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  /** Register a scene factory (lazy instantiation). */
  register(name: string, factory: () => Scene): void {
    this.scenes.set(name, factory);
  }

  /** Full scene change. Calls exit() on old, enter() on new. */
  changeTo(name: string, params?: SceneParams): void {
    const factory = this.scenes.get(name);
    if (!factory) {
      console.error(`Scene "${name}" not registered`);
      return;
    }

    // Pop overlay if active
    if (this.overlay) {
      this.overlay.exit();
      this.overlay = null;
      this.overlayName = '';
    }

    const prevName = this.currentName;

    // Exit current scene
    if (this.current) {
      this.current.exit();
    }

    // Enter new scene
    this.current = factory();
    this.currentName = name;
    this.current.enter(params);

    // Notify
    this.eventBus.emit('game:scene-changed', { from: prevName, to: name });
  }

  /** Push overlay on top of current scene. Calls current.pause(). */
  pushOverlay(name: string, params?: SceneParams): void {
    if (this.overlay) {
      console.error(`Overlay "${this.overlayName}" already active, cannot push "${name}"`);
      return;
    }

    const factory = this.scenes.get(name);
    if (!factory) {
      console.error(`Scene "${name}" not registered`);
      return;
    }

    // Pause current scene (keeps rendering)
    if (this.current) {
      this.current.pause();
    }

    // Enter overlay
    this.overlay = factory();
    this.overlayName = name;
    this.overlay.enter(params);

    this.eventBus.emit('game:paused', { reason: 'overlay' });
  }

  /** Pop overlay. Calls overlay.exit(), current.resume(). */
  popOverlay(): void {
    if (!this.overlay) return;

    this.overlay.exit();
    this.overlay = null;
    this.overlayName = '';

    // Resume current scene
    if (this.current) {
      this.current.resume();
    }

    this.eventBus.emit('game:resumed', { reason: 'overlay' });
  }

  /** Called by Game.update(). Delegates to active scene/overlay. */
  update(dt: number): void {
    if (this.overlay) {
      this.overlay.update(dt);
      // Current scene is paused (not updated), but still rendered
    } else if (this.current) {
      this.current.update(dt);
    }
  }

  /** Called by Game.render(). Renders current (always) + overlay (if any). */
  render(ctx: CanvasRenderingContext2D, alpha: number): void {
    // Always render current scene (even when paused under overlay)
    if (this.current) {
      this.current.render(ctx, alpha);
    }
    // Overlay renders on top (responsible for its own backdrop dimming)
    if (this.overlay) {
      this.overlay.render(ctx, alpha);
    }
  }

  /** Is an overlay currently active? */
  isOverlayActive(): boolean {
    return this.overlay !== null;
  }

  /** Get current base scene name (for save logic). */
  getCurrentSceneName(): string {
    return this.currentName;
  }
}
