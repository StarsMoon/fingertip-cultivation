import { Scene, SceneParams } from '../game/Scene';

export class ResultScene implements Scene {
  private screenWidth = 0;
  private screenHeight = 0;

  enter(_params?: SceneParams): void {
    const info = wx.getSystemInfoSync();
    this.screenWidth = info.windowWidth;
    this.screenHeight = info.windowHeight;
  }

  exit(): void {}

  update(_dt: number): void {}

  render(ctx: CanvasRenderingContext2D, _alpha: number): void {
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, this.screenWidth, this.screenHeight);

    const cx = this.screenWidth / 2;
    const cy = this.screenHeight / 2;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ef5350';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText('道心破碎', cx, cy - 30);

    ctx.fillStyle = '#ffffff';
    ctx.font = '16px sans-serif';
    ctx.fillText('触摸屏幕返回', cx, cy + 30);
  }

  pause(): void {}
  resume(): void {}
}
