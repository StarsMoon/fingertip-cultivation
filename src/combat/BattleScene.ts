import { Scene, SceneParams } from '../game/Scene';
import { EventBus } from '../game/EventBus';
import { Player } from './Player';
import { TouchInput } from '../game/TouchInput';

export class BattleScene implements Scene {
  private player!: Player;
  private touchInput!: TouchInput;
  private eventBus: EventBus;
  private screenWidth: number;
  private screenHeight: number;
  private paused = false;

  constructor(eventBus: EventBus, screenWidth: number, screenHeight: number) {
    this.eventBus = eventBus;
    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;
  }

  enter(_params?: SceneParams): void {
    this.player = new Player(
      this.screenWidth / 2,
      this.screenHeight / 2,
      100,
      150
    );
    this.touchInput = new TouchInput();
    this.touchInput.init();
  }

  exit(): void {
    // TouchInput listeners persist (wx.onTouch* are global)
  }

  update(dt: number): void {
    if (this.paused) return;

    const drag = this.touchInput.getDragOffset(1);
    if (drag.dx !== 0 || drag.dy !== 0) {
      const len = Math.sqrt(drag.dx * drag.dx + drag.dy * drag.dy);
      const nx = drag.dx / len;
      const ny = drag.dy / len;
      this.player.moveBy(nx, ny, dt, this.screenWidth, this.screenHeight);
    }
  }

  render(ctx: CanvasRenderingContext2D, _alpha: number): void {
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, this.screenWidth, this.screenHeight);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < this.screenWidth; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.screenHeight);
      ctx.stroke();
    }
    for (let y = 0; y < this.screenHeight; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.screenWidth, y);
      ctx.stroke();
    }

    this.player.render(ctx, _alpha);
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
  }
}
