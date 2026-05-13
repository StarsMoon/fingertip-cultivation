import { Entity } from '../game/Entity';

export class Player extends Entity {
  hp: number;
  maxHp: number;
  speed: number;
  level: number = 1;
  exp: number = 0;
  expToNext: number = 10;
  realm: string = '练气期';

  constructor(x: number, y: number, hp: number, speed: number) {
    super(x, y, 12);
    this.hp = hp;
    this.maxHp = hp;
    this.speed = speed;
  }

  moveBy(dx: number, dy: number, dt: number, boundsW: number, boundsH: number): void {
    this.x += dx * this.speed * dt;
    this.y += dy * this.speed * dt;
    this.x = Math.max(this.radius, Math.min(boundsW - this.radius, this.x));
    this.y = Math.max(this.radius, Math.min(boundsH - this.radius, this.y));
  }

  render(ctx: CanvasRenderingContext2D, _alpha: number): void {
    ctx.fillStyle = '#4fc3f7';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#0288d1';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(79, 195, 247, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * 2, 0, Math.PI * 2);
    ctx.stroke();
  }
}
