/**
 * Entity — base class for all game objects.
 * Player, Enemy, Projectile, Pickup all extend this.
 * Simple inheritance + composition. No ECS framework.
 */

export class Entity {
  x: number;
  y: number;
  vx: number = 0;
  vy: number = 0;
  radius: number;
  alive: boolean = true;

  constructor(x: number, y: number, radius: number) {
    this.x = x;
    this.y = y;
    this.radius = radius;
  }

  update(dt: number): void {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }

  render(ctx: CanvasRenderingContext2D, _alpha: number): void {
    // Default: draw a circle at entity position
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  /** Check if this entity overlaps another (circle-circle). */
  overlaps(other: Entity): boolean {
    const dx = this.x - other.x;
    const dy = this.y - other.y;
    const minDist = this.radius + other.radius;
    return dx * dx + dy * dy < minDist * minDist;
  }

  /** Distance from this entity to a point. */
  distTo(px: number, py: number): number {
    const dx = px - this.x;
    const dy = py - this.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /** Reset for object pool reuse. */
  reset(x: number, y: number, radius: number): void {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.radius = radius;
    this.alive = true;
  }
}
