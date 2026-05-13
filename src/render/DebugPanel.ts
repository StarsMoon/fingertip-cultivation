export class DebugPanel {
  private fps = 0;
  private frameCount = 0;
  private fpsTimer = 0;
  private entityCount = 0;
  private enabled = false;

  toggle(): void {
    this.enabled = !this.enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  setEntityCount(count: number): void {
    this.entityCount = count;
  }

  tick(dt: number): void {
    if (!this.enabled) return;
    this.frameCount++;
    this.fpsTimer += dt;
    if (this.fpsTimer >= 1) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.fpsTimer -= 1;
    }
  }

  render(ctx: CanvasRenderingContext2D, screenWidth: number): void {
    if (!this.enabled) return;

    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(4, 4, 120, 44);

    ctx.fillStyle = '#4caf50';
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`FPS: ${this.fps}`, 8, 8);
    ctx.fillText(`Entities: ${this.entityCount}`, 8, 24);
    ctx.restore();
  }
}
