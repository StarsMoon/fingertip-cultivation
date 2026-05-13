import { Scene, SceneParams } from '../game/Scene';

export class MainMenuScene implements Scene {
  private screenWidth = 0;
  private screenHeight = 0;
  private time = 0;

  enter(_params?: SceneParams): void {
    const info = wx.getSystemInfoSync();
    this.screenWidth = info.windowWidth;
    this.screenHeight = info.windowHeight;
  }

  exit(): void {}

  update(dt: number): void {
    this.time += dt;
  }

  render(ctx: CanvasRenderingContext2D, _alpha: number): void {
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, this.screenWidth, this.screenHeight);

    const cx = this.screenWidth / 2;
    const cy = this.screenHeight / 2;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = '#ffd54f';
    ctx.font = 'bold 36px sans-serif';
    ctx.fillText('指尖修仙', cx, cy - 60);

    ctx.fillStyle = 'rgba(255, 213, 79, 0.6)';
    ctx.font = '16px sans-serif';
    const alpha = 0.4 + 0.6 * Math.abs(Math.sin(this.time * 2));
    ctx.globalAlpha = alpha;
    ctx.fillText('触摸屏幕开始', cx, cy + 20);
    ctx.globalAlpha = 1;
  }

  pause(): void {}
  resume(): void {}
}
