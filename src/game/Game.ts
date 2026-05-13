/**
 * Game — main loop orchestrator.
 * Owns SceneManager, EventBus, SaveManager, ResourceManager.
 * Handles rAF loop, WeChat lifecycle, and game-wide pause.
 */

import { EventBus } from './EventBus';
import { SceneManager } from './SceneManager';
import { MainMenuScene } from '../ui/MainMenuScene';
import { BattleScene } from '../combat/BattleScene';
import { ResultScene } from '../ui/ResultScene';

export class Game {
  private canvas: WXCanvas | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private eventBus: EventBus;
  private sceneManager: SceneManager;
  private lastTimestamp: number = 0;
  private accumulator: number = 0;
  private readonly FIXED_DT: number = 1 / 60;
  private paused: boolean = false;
  private running: boolean = false;
  private screenWidth: number = 0;
  private screenHeight: number = 0;

  constructor() {
    this.eventBus = new EventBus();
    this.sceneManager = new SceneManager(this.eventBus);
  }

  /** Initialize game — create canvas, wire lifecycle, start loop. */
  init(): void {
    this.canvas = wx.createCanvas();
    this.ctx = this.canvas.getContext('2d');

    const info = wx.getSystemInfoSync();
    this.screenWidth = info.windowWidth;
    this.screenHeight = info.windowHeight;
    this.canvas.width = info.windowWidth * info.pixelRatio;
    this.canvas.height = info.windowHeight * info.pixelRatio;
    this.ctx?.scale(info.pixelRatio, info.pixelRatio);

    // Wire WeChat lifecycle
    wx.onHide(() => this.onHide());
    wx.onShow(() => this.onShow());
    wx.onError((msg: string) => this.onError(msg));

    // Register scenes
    this.registerScenes();

    // Start at MainMenu
    this.sceneManager.changeTo('MainMenu');

    // Start the game loop
    this.running = true;
    this.lastTimestamp = performance.now();
    requestAnimationFrame((ts) => this.loop(ts));
  }

  private registerScenes(): void {
    this.sceneManager.register('MainMenu', () => new MainMenuScene());
    this.sceneManager.register('Battle', () => new BattleScene(this.eventBus, this.screenWidth, this.screenHeight));
    this.sceneManager.register('Result', () => new ResultScene());
  }

  private loop(timestamp: number): void {
    if (!this.running) return;

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
    this.render(alpha);

    requestAnimationFrame((ts) => this.loop(ts));
  }

  private render(alpha: number): void {
    if (!this.ctx) return;

    this.ctx.fillStyle = '#1a1a2e';
    this.ctx.fillRect(0, 0, this.screenWidth, this.screenHeight);

    this.sceneManager.render(this.ctx, alpha);
  }

  // ── WeChat lifecycle ──

  private onHide(): void {
    this.paused = true;
    this.eventBus.emit('game:paused', { reason: 'lifecycle' });
  }

  private onShow(): void {
    this.paused = false;
    this.accumulator = 0;
    this.eventBus.emit('game:resumed', { reason: 'lifecycle' });
  }

  private onError(msg: string): void {
    console.error('wx.onError:', msg);
  }

  // ── Public API ──

  getEventBus(): EventBus {
    return this.eventBus;
  }

  getSceneManager(): SceneManager {
    return this.sceneManager;
  }

  getContext(): CanvasRenderingContext2D | null {
    return this.ctx;
  }

  getScreenWidth(): number {
    return this.screenWidth;
  }

  getScreenHeight(): number {
    return this.screenHeight;
  }
}
